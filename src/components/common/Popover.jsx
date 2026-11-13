// The floating white card the DatePicker and Select open (state and
// placement come from usePopover). Rendered hidden for one frame so it can
// be measured before it is placed.
import { createPortal } from "react-dom";

// Shared surface: matches the date picker mockup's card.
export const POPOVER_SURFACE =
  "z-[1000] max-w-[calc(100vw-16px)] border border-[#EEF0F4] bg-white text-left font-normal shadow-[0_12px_40px_rgba(16,24,40,0.14)]";

const Popover = ({ popRef, pos, children, label, role = "dialog", className = "", style, ...rest }) =>
  createPortal(
    <div
      ref={popRef}
      role={role}
      aria-label={label}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? "visible" : "hidden",
        lineHeight: "normal",
        ...style,
      }}
      className={`${POPOVER_SURFACE} ${className}`}
      // Keep clicks inside the card from reaching a parent modal's backdrop
      // or a parent dropdown's outside-click handler.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      {children}
    </div>,
    document.body
  );

export default Popover;
