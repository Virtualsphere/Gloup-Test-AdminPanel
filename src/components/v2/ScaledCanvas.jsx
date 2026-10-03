import { useLayoutEffect, useRef, useState } from "react";

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
        {children}
      </div>
    </div>
  );
};

export default ScaledCanvas;
