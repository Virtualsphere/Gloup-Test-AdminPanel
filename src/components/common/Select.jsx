// The dropdown every page uses in place of a native <select>, styled to match
// the shared DatePicker (white rounded card, soft grey hover, the picker's
// blue for the chosen option).
//
// It takes the same props and <option> children as a native select, so a
// page swaps <select> for <SelectMenu> and keeps everything else:
// - value / onChange (onChange gets { target: { name, value } }, like a
//   change event), or defaultValue for an uncontrolled field;
// - react-hook-form's {...register("x")} works: `ref` is an object with a
//   `value` getter / setter, `name` and `focus()`, which is all RHF reads;
// - className styles the trigger button exactly as it styled the select.
//   A select drawn with `appearance-none` already has its own chevron
//   beside it, so this adds one only when the class doesn't say that
//   (override with `chevron`).
import { Children, Fragment, isValidElement, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import Popover from "./Popover";
import { usePopover } from "./usePopover";

const ACCENT = "#4461F2";
const BAND = "#EDF0FE";

const textOf = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf(node.props.children);
  return "";
};

// <option> elements (inside arrays or fragments) -> [{ value, label, disabled, hidden }]
const optionsFromChildren = (children) => {
  const out = [];
  const walk = (nodes) =>
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === "option") {
        const label = textOf(child.props.children);
        out.push({
          value: child.props.value !== undefined && child.props.value !== null ? String(child.props.value) : label,
          label,
          disabled: !!child.props.disabled,
          hidden: !!child.props.hidden,
        });
      } else if (child.type === Fragment) {
        walk(child.props.children);
      }
    });
  walk(children);
  return out;
};

const SelectMenu = ({
  ref,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  children,
  className = "",
  disabled = false,
  chevron,
  align = "left",
  placeholder = "Select",
  id,
  title,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const options = optionsFromChildren(children);
  const controlled = value !== undefined;
  const firstValue = options.find((o) => !o.disabled)?.value ?? options[0]?.value ?? "";
  const [inner, setInner] = useState(() =>
    defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : firstValue
  );
  const current = controlled ? (value === null ? "" : String(value)) : inner;
  const valueRef = useRef(current);
  valueRef.current = current;

  const [active, setActive] = useState(-1);
  const [minWidth, setMinWidth] = useState(0);
  const { triggerRef, popRef, open, setOpen, close, pos } = usePopover({ align, gap: 6 });

  // What react-hook-form (and any other ref user) sees.
  useImperativeHandle(
    ref,
    () => ({
      name,
      get value() {
        return valueRef.current;
      },
      set value(v) {
        const s = v === null || v === undefined ? "" : String(v);
        valueRef.current = s;
        setInner(s);
      },
      focus: () => triggerRef.current?.focus(),
    }),
    [name, triggerRef]
  );

  const shown = options.filter((o) => !o.hidden);
  const selected = options.find((o) => o.value === current);

  const openMenu = () => {
    if (disabled) return;
    setMinWidth(triggerRef.current?.getBoundingClientRect().width || 0);
    const idx = shown.findIndex((o) => o.value === current);
    setActive(idx >= 0 ? idx : shown.findIndex((o) => !o.disabled));
    setOpen(true);
  };

  const choose = (option) => {
    if (!option || option.disabled) return;
    close();
    triggerRef.current?.focus();
    if (option.value === current) return;
    if (!controlled) setInner(option.value);
    valueRef.current = option.value;
    const target = { name, value: option.value, id };
    onChange?.({
      target,
      currentTarget: target,
      type: "change",
      preventDefault() {},
      stopPropagation() {},
      persist() {},
    });
  };

  const step = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < shown.length; i += dir) if (!shown[i].disabled) return i;
    return from;
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => step(i, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => step(i, -1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(step(-1, 1));
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(step(shown.length, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === "Tab") {
      close();
    }
  };

  // Keep the keyboard-highlighted option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    popRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, popRef]);

  const showChevron = chevron ?? !/\bappearance-none\b/.test(className);
  const label = selected?.label ?? (current ? current : "");

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        title={title}
        style={style}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        onBlur={(e) => onBlur?.({ target: { name, value: valueRef.current }, type: "blur", relatedTarget: e.relatedTarget })}
        className={`cursor-pointer text-left disabled:cursor-not-allowed ${className}`}
      >
        <span className="flex w-full min-w-0 items-center gap-2">
          {/* Like a native select, size to the longest option (invisible
              copies stacked in one grid cell) so the trigger doesn't
              change width when the choice does. */}
          <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)]">
            <span className={`col-start-1 row-start-1 truncate ${label ? "" : "opacity-60"}`}>
              {label || placeholder}
            </span>
            {shown.length <= 100 &&
              shown.map((o, i) => (
                <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1 truncate">
                  {o.label}
                </span>
              ))}
          </span>
          {showChevron && (
            <ChevronDown
              size={14}
              className={`shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </span>
      </button>
      {open && (
        <Popover
          popRef={popRef}
          pos={pos}
          role="listbox"
          label={ariaLabel || name}
          className="max-h-[296px] overflow-y-auto rounded-[14px] p-1.5"
          style={{ minWidth: Math.max(minWidth, 150), maxWidth: Math.max(minWidth, 320) }}
        >
          {shown.length === 0 && <p className="px-3 py-2 text-[13px] text-[#8E8E93]">No options</p>}
          {shown.map((o, i) => {
            const isSel = o.value === current;
            const isActive = i === active;
            return (
              <button
                key={`${o.value}-${i}`}
                type="button"
                role="option"
                data-idx={i}
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                tabIndex={-1}
                title={o.label}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => choose(o)}
                className={`flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  o.disabled
                    ? "cursor-not-allowed text-[#C9CBD1]"
                    : isSel
                      ? ""
                      : isActive
                        ? "bg-[#F4F5F7] text-[#1C1C1E]"
                        : "text-[#1C1C1E]"
                }`}
                style={isSel ? { background: BAND, color: ACCENT } : undefined}
              >
                <span className="min-w-0 flex-1 truncate">{o.label || " "}</span>
                {isSel && <Check size={15} strokeWidth={2.5} className="shrink-0" />}
              </button>
            );
          })}
        </Popover>
      )}
    </>
  );
};

export default SelectMenu;
