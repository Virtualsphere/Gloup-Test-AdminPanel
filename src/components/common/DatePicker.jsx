// The one date picker every page uses (single date, date + time, range, month).
//
// Values are plain strings, like the native inputs they replaced:
//   date "YYYY-MM-DD", date-time "YYYY-MM-DDTHH:mm", month "YYYY-MM".
// `min` / `max` take the same shapes (a date-time's day part is what counts).
//
// The calendar card is a Popover (portalled to <body>, placed by usePopover),
// so it is never clipped by a card's overflow or scaled by ScaledCanvas.
import { useCallback, useImperativeHandle, useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, format as fmt } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { parseYmd, toYmd } from "../../utils/dateValue";
import Popover from "./Popover";
import SelectMenu from "./Select";
import { usePopover } from "./usePopover";

const CARD = "w-[272px] rounded-[18px] p-4";

export const PICKER_BLUE = "#4461F2";
const BAND = "#EDF0FE";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n) => String(n).padStart(2, "0");
const dayPart = (value) => (value ? String(value).slice(0, 10) : "");
const todayYmd = () => toYmd(new Date());
const nowHm = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 42 cells (6 weeks) starting on the Sunday on or before the 1st.
const monthCells = (year, month) => {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { ymd: toYmd(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
};

// ---------------------------------------------------------------------------
// Calendar card body
// ---------------------------------------------------------------------------

const NavButton = ({ dir, onClick, disabled, label }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F5F7] text-[#1C1C1E] transition-colors hover:bg-[#E9EBEF] disabled:cursor-not-allowed disabled:opacity-35"
  >
    {dir === "prev" ? <ChevronLeft size={16} strokeWidth={2.25} /> : <ChevronRight size={16} strokeWidth={2.25} />}
  </button>
);

const Header = ({ title, onTitle, onPrev, onNext, prevDisabled, nextDisabled, titleLabel }) => (
  <div className="flex items-center justify-between gap-2">
    <NavButton dir="prev" onClick={onPrev} disabled={prevDisabled} label="Previous" />
    <button
      type="button"
      onClick={onTitle}
      disabled={!onTitle}
      aria-label={titleLabel}
      className="rounded-lg px-2 py-1 text-[14px] font-semibold tracking-tight text-[#1C1C1E] enabled:hover:bg-[#F4F5F7]"
    >
      {title}
    </button>
    <NavButton dir="next" onClick={onNext} disabled={nextDisabled} label="Next" />
  </div>
);

// 12-month grid, used by MonthPicker and by the calendar's title click.
const MonthGrid = ({ year, selected, current, isDisabled, onPick }) => (
  <div className="mt-3 grid grid-cols-3 gap-1.5">
    {MONTHS.map((name, i) => {
      const key = `${year}-${pad(i + 1)}`;
      const isSel = key === selected;
      const isCur = key === current;
      const disabled = isDisabled(key);
      return (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onPick(key)}
          aria-pressed={isSel}
          className={`h-9 rounded-[9px] text-[13px] font-medium transition-colors ${
            isSel
              ? "text-white"
              : disabled
                ? "cursor-not-allowed text-[#C9CBD1]"
                : "text-[#1C1C1E] hover:bg-[#F4F5F7]"
          }`}
          style={
            isSel
              ? { background: PICKER_BLUE }
              : isCur && !disabled
                ? { boxShadow: `inset 0 0 0 2px ${PICKER_BLUE}` }
                : undefined
          }
        >
          {name}
        </button>
      );
    })}
  </div>
);

// The day grid with the mockup's states: outlined today, filled blue
// endpoints, and a light band between them that rounds off at row ends.
const DayGrid = ({ year, month, selected, rangeFrom, rangeTo, min, max, onPick, onHover }) => {
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const today = todayYmd();
  const hasRange = rangeFrom && rangeTo && rangeFrom !== rangeTo;
  // Drop a trailing week made only of next-month days (the mockup shows 6
  // rows only when the month needs them).
  const shown = cells.slice(35).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells;

  return (
    <div className="mt-3">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1.5 text-center text-[11.5px] font-medium text-[#8E8E93]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => onHover?.(null)}>
        {shown.map((c, i) => {
          const col = i % 7;
          const disabled = (min && c.ymd < min) || (max && c.ymd > max);
          const isStart = hasRange && c.ymd === rangeFrom;
          const isEnd = hasRange && c.ymd === rangeTo;
          const inside = hasRange && c.ymd > rangeFrom && c.ymd < rangeTo;
          const isSel = c.ymd === selected || isStart || isEnd || (!hasRange && c.ymd === rangeFrom);
          const isToday = c.ymd === today;

          // Band: full cell between the ends, half cell behind each end.
          let band = null;
          if (inside) band = { left: 0, right: 0 };
          else if (isStart) band = { left: "50%", right: 0 };
          else if (isEnd) band = { left: 0, right: "50%" };
          const roundL = inside && col === 0;
          const roundR = inside && col === 6;

          return (
            <div key={c.ymd} className="relative flex h-[32px] items-center justify-center">
              {band && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 ${roundL ? "rounded-l-[9px]" : ""} ${roundR ? "rounded-r-[9px]" : ""}`}
                  style={{ ...band, background: BAND }}
                />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(c.ymd)}
                onMouseEnter={() => onHover?.(c.ymd)}
                aria-label={fmt(parseYmd(c.ymd), "EEEE, d MMMM yyyy")}
                aria-pressed={isSel}
                aria-current={isToday ? "date" : undefined}
                className={`relative flex h-[32px] w-[32px] items-center justify-center rounded-[9px] text-[13px] font-medium tabular-nums transition-colors ${
                  isSel
                    ? "text-white"
                    : disabled
                      ? "cursor-not-allowed text-[#D4D6DB]"
                      : !c.inMonth
                        ? "text-[#B8BAC0] hover:bg-[#F4F5F7]"
                        : band
                          ? "text-[#1C1C1E] hover:bg-white/70"
                          : "text-[#1C1C1E] hover:bg-[#F4F5F7]"
                }`}
                style={
                  isSel
                    ? { background: PICKER_BLUE }
                    : isToday && !disabled
                      ? { boxShadow: `inset 0 0 0 2px ${PICKER_BLUE}` }
                      : undefined
                }
              >
                {c.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Month navigation + day grid + (on title click) month/year grid.
const CalendarBody = ({ initial, selected, rangeFrom, rangeTo, min, max, onPick, onHover }) => {
  const start = parseYmd(initial) || new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [mode, setMode] = useState("days");

  const minMonth = min ? min.slice(0, 7) : null;
  const maxMonth = max ? max.slice(0, 7) : null;
  const curKey = `${view.y}-${pad(view.m + 1)}`;

  const shift = (n) => {
    if (mode === "months") return setView((v) => ({ ...v, y: v.y + n }));
    const d = addMonths(new Date(view.y, view.m, 1), n);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const pick = (ymd) => {
    const d = parseYmd(ymd);
    if (d.getMonth() !== view.m) setView({ y: d.getFullYear(), m: d.getMonth() });
    onPick(ymd);
  };

  if (mode === "months") {
    return (
      <>
        <Header
          title={String(view.y)}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          prevDisabled={minMonth && `${view.y - 1}-12` < minMonth}
          nextDisabled={maxMonth && `${view.y + 1}-01` > maxMonth}
        />
        <MonthGrid
          year={view.y}
          selected={curKey}
          current={todayYmd().slice(0, 7)}
          isDisabled={(k) => (minMonth && k < minMonth) || (maxMonth && k > maxMonth)}
          onPick={(k) => {
            setView({ y: Number(k.slice(0, 4)), m: Number(k.slice(5, 7)) - 1 });
            setMode("days");
          }}
        />
      </>
    );
  }

  return (
    <>
      <Header
        title={fmt(new Date(view.y, view.m, 1), "MMMM yyyy")}
        titleLabel="Choose month and year"
        onTitle={() => setMode("months")}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        prevDisabled={minMonth && curKey <= minMonth}
        nextDisabled={maxMonth && curKey >= maxMonth}
      />
      <DayGrid
        year={view.y}
        month={view.m}
        selected={selected}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        min={min}
        max={max}
        onPick={pick}
        onHover={onHover}
      />
    </>
  );
};

const FooterButton = ({ onClick, children, primary }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-[9px] px-3 py-1.5 text-[12px] font-semibold transition-colors ${
      primary ? "text-white hover:opacity-90" : "text-[#3A3A3C] hover:bg-[#F4F5F7]"
    }`}
    style={primary ? { background: PICKER_BLUE } : undefined}
  >
    {children}
  </button>
);

const TimeSelect = ({ value, count, onChange, label }) => (
  <SelectMenu
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-label={label}
    chevron
    className="h-8 w-[62px] rounded-[9px] bg-[#F4F5F7] px-2.5 text-[13px] font-medium tabular-nums text-[#1C1C1E] focus:outline-none focus:ring-2 focus:ring-[#4461F2]/40"
  >
    {Array.from({ length: count }, (_, i) => (
      <option key={i} value={pad(i)}>
        {pad(i)}
      </option>
    ))}
  </SelectMenu>
);

const Trigger = ({ triggerRef, onClick, disabled, className, ariaLabel, title, children, active }) => (
  <button
    ref={triggerRef}
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-haspopup="dialog"
    aria-expanded={active}
    title={title}
    className={className}
  >
    {children}
  </button>
);

const DEFAULT_TRIGGER =
  "flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4461F2]/40 disabled:cursor-not-allowed disabled:opacity-60";

// ---------------------------------------------------------------------------
// Public components
// ---------------------------------------------------------------------------

// Single date, or date + time with `withTime`. onChange gets the string value
// ("" when cleared). `highlight={[from, to]}` draws a range band, for a pair
// of from / to pickers. `icon`: true (calendar icon before the date),
// "right" (after it) or false. `ref` exposes { open() }.
export const DatePicker = ({
  ref,
  value,
  onChange,
  min,
  max,
  withTime = false,
  clearable = false,
  placeholder = "Select date",
  displayFormat,
  highlight,
  align = "left",
  className = DEFAULT_TRIGGER,
  icon = true,
  disabled,
  ariaLabel,
  title,
}) => {
  const { triggerRef, popRef, open, setOpen, close, pos } = usePopover({ align });
  useImperativeHandle(ref, () => ({ open: () => !disabled && setOpen(true) }), [disabled, setOpen]);

  const day = dayPart(value);
  const time = withTime && value && value.length >= 16 ? value.slice(11, 16) : "";
  const minDay = dayPart(min);
  const maxDay = dayPart(max);

  const pickDay = (ymd) => {
    if (withTime) onChange(`${ymd}T${time || nowHm()}`);
    else {
      onChange(ymd);
      close();
    }
  };
  const setTime = (part, v) => {
    const [h, m] = (time || nowHm()).split(":");
    const next = part === "h" ? `${v}:${m}` : `${h}:${v}`;
    onChange(`${day || todayYmd()}T${next}`);
  };

  const shownFormat = displayFormat || (withTime ? "dd MMM yyyy, hh:mm a" : "dd MMM yyyy");
  const label = day ? fmt(withTime && time ? new Date(`${day}T${time}`) : parseYmd(day), shownFormat) : "";
  const [hlFrom, hlTo] = highlight || [];
  const [hh, mm] = (time || nowHm()).split(":");

  return (
    <>
      <Trigger
        triggerRef={triggerRef}
        onClick={() => (open ? close() : setOpen(true))}
        disabled={disabled}
        className={className}
        ariaLabel={ariaLabel}
        title={title}
        active={open}
      >
        {icon && icon !== "right" && <CalendarDays size={15} className="shrink-0 text-slate-400" />}
        <span className={`min-w-0 flex-1 truncate ${label ? "" : "text-slate-400"}`}>{label || placeholder}</span>
        {icon === "right" && <CalendarDays size={15} className="shrink-0 text-slate-400" />}
        {clearable && day && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              close();
            }}
            className="-mr-1 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={13} />
          </span>
        )}
      </Trigger>
      {open && (
        <Popover popRef={popRef} pos={pos} className={CARD} label={ariaLabel || placeholder}>
          <CalendarBody
            initial={day || hlFrom || hlTo || maxDay || todayYmd()}
            selected={day}
            rangeFrom={hlFrom && hlTo ? hlFrom : null}
            rangeTo={hlFrom && hlTo ? hlTo : null}
            min={minDay}
            max={maxDay}
            onPick={pickDay}
          />
          {withTime && (
            <div className="mt-3 flex items-center gap-2 border-t border-[#F0F1F4] pt-3">
              <span className="mr-auto text-[12px] font-medium text-[#8E8E93]">Time</span>
              <TimeSelect value={hh} count={24} onChange={(v) => setTime("h", v)} label="Hour" />
              <span className="font-semibold text-[#8E8E93]">:</span>
              <TimeSelect value={mm} count={60} onChange={(v) => setTime("m", v)} label="Minute" />
            </div>
          )}
          {(withTime || clearable) && (
            <div className="mt-2 flex items-center justify-between gap-2">
              {clearable ? (
                <FooterButton
                  onClick={() => {
                    onChange("");
                    close();
                  }}
                >
                  Clear
                </FooterButton>
              ) : (
                <span />
              )}
              {withTime ? (
                <FooterButton primary onClick={close}>
                  Done
                </FooterButton>
              ) : (
                (!minDay || todayYmd() >= minDay) &&
                (!maxDay || todayYmd() <= maxDay) && (
                  <FooterButton onClick={() => pickDay(todayYmd())}>Today</FooterButton>
                )
              )}
            </div>
          )}
        </Popover>
      )}
    </>
  );
};

const rangeLabel = (from, to) => {
  const a = parseYmd(from);
  const b = parseYmd(to);
  if (!a || !b) return "";
  return `${fmt(a, a.getFullYear() === b.getFullYear() ? "d MMM" : "d MMM yyyy")} – ${fmt(b, "d MMM yyyy")}`;
};

// From / to on one calendar: the first click starts a range, the second ends
// it and calls onChange(from, to) with YYYY-MM-DD strings. `children`
// replaces the trigger's content (the trigger button itself is the only DOM
// node this renders in place, so a parent can style it with `[&>button]`).
export const DateRangePicker = ({
  from,
  to,
  onChange,
  min,
  max,
  maxDays,
  toastId = "date-range-picker",
  align = "left",
  className = DEFAULT_TRIGGER,
  placeholder = "Select dates",
  icon = true,
  disabled,
  ariaLabel = "Date range",
  children,
}) => {
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const onClose = useCallback(() => {
    setAnchor(null);
    setHover(null);
  }, []);
  const { triggerRef, popRef, open, setOpen, close, pos } = usePopover({ align, onClose });

  const pick = (ymd) => {
    if (!anchor) {
      setAnchor(ymd);
      return;
    }
    const [a, b] = ymd < anchor ? [ymd, anchor] : [anchor, ymd];
    if (maxDays && differenceInCalendarDays(parseYmd(b), parseYmd(a)) > maxDays - 1) {
      toast.error(`The range can be at most ${maxDays} days`, { id: toastId });
      return;
    }
    onChange(a, b);
    close();
  };

  // While choosing the end, preview the band up to the hovered day.
  let shownFrom = from;
  let shownTo = to;
  if (anchor) {
    const other = hover || anchor;
    [shownFrom, shownTo] = other < anchor ? [other, anchor] : [anchor, other];
  }
  const days = shownFrom && shownTo ? differenceInCalendarDays(parseYmd(shownTo), parseYmd(shownFrom)) + 1 : 0;
  const label = rangeLabel(from, to);

  return (
    <>
      <Trigger
        triggerRef={triggerRef}
        onClick={() => (open ? close() : setOpen(true))}
        disabled={disabled}
        className={className}
        ariaLabel={ariaLabel}
        active={open}
      >
        {children ?? (
          <>
            {icon && <CalendarDays size={15} className="shrink-0 text-slate-400" />}
            <span className={`min-w-0 flex-1 truncate ${label ? "" : "text-slate-400"}`}>{label || placeholder}</span>
          </>
        )}
      </Trigger>
      {open && (
        <Popover popRef={popRef} pos={pos} className={CARD} label={ariaLabel}>
          <CalendarBody
            initial={to || from || dayPart(max) || todayYmd()}
            selected={null}
            rangeFrom={shownFrom}
            rangeTo={shownTo}
            min={dayPart(min)}
            max={dayPart(max)}
            onPick={pick}
            onHover={anchor ? setHover : undefined}
          />
          <p className="mt-2.5 border-t border-[#F0F1F4] pt-2.5 text-center text-[11.5px] font-medium text-[#8E8E93]">
            {anchor
              ? "Select the end date"
              : days
                ? `${rangeLabel(shownFrom, shownTo)} · ${days} day${days === 1 ? "" : "s"}`
                : "Select the start date"}
          </p>
        </Popover>
      )}
    </>
  );
};

// Month picker ("YYYY-MM").
export const MonthPicker = ({
  value,
  onChange,
  min,
  max,
  align = "left",
  className = DEFAULT_TRIGGER,
  placeholder = "Select month",
  icon = true,
  disabled,
  ariaLabel = "Month",
}) => {
  const { triggerRef, popRef, open, setOpen, close, pos } = usePopover({ align });
  const initialYear = Number((value || max || todayYmd()).slice(0, 4));
  const [year, setYear] = useState(initialYear);
  const minM = min ? min.slice(0, 7) : null;
  const maxM = max ? max.slice(0, 7) : null;

  const label = value ? fmt(new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 1), "MMMM yyyy") : "";

  return (
    <>
      <Trigger
        triggerRef={triggerRef}
        onClick={() => {
          if (open) return close();
          setYear(initialYear);
          setOpen(true);
        }}
        disabled={disabled}
        className={className}
        ariaLabel={ariaLabel}
        active={open}
      >
        {icon && <CalendarDays size={15} className="shrink-0 text-slate-400" />}
        <span className={`min-w-0 flex-1 truncate ${label ? "" : "text-slate-400"}`}>{label || placeholder}</span>
      </Trigger>
      {open && (
        <Popover popRef={popRef} pos={pos} className={CARD} label={ariaLabel}>
          <Header
            title={String(year)}
            onPrev={() => setYear((y) => y - 1)}
            onNext={() => setYear((y) => y + 1)}
            prevDisabled={minM && `${year - 1}-12` < minM}
            nextDisabled={maxM && `${year + 1}-01` > maxM}
          />
          <MonthGrid
            year={year}
            selected={value}
            current={todayYmd().slice(0, 7)}
            isDisabled={(k) => (minM && k < minM) || (maxM && k > maxM)}
            onPick={(k) => {
              onChange(k);
              close();
            }}
          />
        </Popover>
      )}
    </>
  );
};

export default DatePicker;
