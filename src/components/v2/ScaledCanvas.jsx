import { useLayoutEffect, useRef, useState } from "react";
import { CanvasScaleContext, useCanvasScale } from "./canvasScaleContext";

// Every V2 page is laid out once on a fixed `width` design canvas that is then
// uniformly scaled down to the available width, so the arrangement matches the
// approved mockup at every screen size - nothing reflows, nothing clips, the
// page never scrolls sideways.
//
// Because the whole canvas scales, raising a page's px type sizes does NOT make
// its text bigger on screen: it forces a wider canvas, which then scales down
// further and reads smaller.
//
// Render anything `position: fixed` (modals) outside this component - a
// transformed ancestor becomes the containing block for fixed descendants.
// Third-party widgets that do their own pointer math (maps) go in <Unscaled>.
const ScaledCanvas = ({ width, className = "", children }) => {
  const outerRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [boxHeight, setBoxHeight] = useState(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const canvas = canvasRef.current;

    const measure = () => {
      const next = Math.min(1, outer.clientWidth / width);
      // Guard against feedback loops when the height change moves a scrollbar.
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
      setBoxHeight((prev) => {
        const h = Math.round(canvas.offsetHeight * next);
        return prev === h ? prev : h;
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outerRef} className="w-full" style={{ height: boxHeight }}>
      <div
        ref={canvasRef}
        className={className}
        style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <CanvasScaleContext.Provider value={scale}>{children}</CanvasScaleContext.Provider>
      </div>
    </div>
  );
};

// Renders its children at true screen pixels inside the scaled canvas. Google
// Maps measures the pointer in screen coordinates, so under `transform: scale(s)`
// a drag moves the map by 1/s of the cursor's travel and wheel zoom pivots about
// the wrong point. This fills its nearest positioned ancestor (the parent sets
// the size, e.g. `relative h-[240px]`); inside, a layer is laid out `s` times
// bigger and scaled back by 1/s, so the net transform on the children is the
// identity. At s = 1 this is a no-op. Read useCanvasScale() inside to size
// overlays (labels) to match the rest of the canvas.
export const Unscaled = ({ className = "", children }) => {
  const scale = useCanvasScale();
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute left-0 top-0"
        style={{
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          transform: `scale(${1 / scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledCanvas;
