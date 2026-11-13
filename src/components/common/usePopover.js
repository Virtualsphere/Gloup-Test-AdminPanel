// Open / close / placement state for a popup anchored to a trigger button,
// shared by the DatePicker and Select popups (see Popover.jsx).
//
// The popup is portalled to <body> and positioned with `fixed` from the
// trigger's screen rect, so it is never clipped by a card's overflow and
// isn't trapped or scaled by a V2 page's ScaledCanvas transform. It flips
// above the trigger when there's no room below, and closes on an outside
// mousedown or Escape.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const GAP = 8;

export const usePopover = ({ align = "left", gap = GAP, onClose } = {}) => {
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
    onClose?.();
  }, [onClose]);

  const place = useCallback(() => {
    const t = triggerRef.current;
    const p = popRef.current;
    if (!t || !p) return;
    const r = t.getBoundingClientRect();
    const w = p.offsetWidth;
    const h = p.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = r.bottom + gap;
    if (top + h > vh - GAP && r.top - gap - h >= GAP) top = r.top - gap - h;
    top = Math.max(GAP, Math.min(top, vh - h - GAP));
    let left = align === "right" ? r.right - w : r.left;
    left = Math.max(GAP, Math.min(left, vw - w - GAP));
    setPos({ top, left, triggerWidth: r.width });
  }, [align, gap]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    // Content height changes (month grid, time row, filtered lists).
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (ro && popRef.current) ro.observe(popRef.current);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      ro?.disconnect();
    };
  }, [open, close, place]);

  return { triggerRef, popRef, open, setOpen, close, pos };
};
