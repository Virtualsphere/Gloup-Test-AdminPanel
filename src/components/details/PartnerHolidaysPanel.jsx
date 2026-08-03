import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DatePicker from "react-datepicker";
import { format, startOfDay, isBefore } from "date-fns";
import { toast, Toaster } from "react-hot-toast";
import { CalendarOff, Trash2 } from "lucide-react";
import {
  listStoreHolidays,
  addStoreHoliday,
  removeStoreHoliday,
  addWeeklyHoliday,
  removeWeeklyHoliday,
  clearHolidays,
} from "../../redux/slices/holidaySlice";
import "react-datepicker/dist/react-datepicker.css";

export const WEEKDAY_LABELS = [
  { value: 0, label: "Sun", full: "Sunday" },
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
];

const formatYmd = (d) => format(d, "yyyy-MM-dd");

const ConfirmModal = ({ open, title, message, confirmLabel, onConfirm, onCancel, busy }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Holidays manager for a single salon (storeId).
 * Used on Partner Details and the standalone Holidays page.
 */
const PartnerHolidaysPanel = ({
  storeId,
  showToaster = true,
  className = "",
}) => {
  const dispatch = useDispatch();
  const { holidays, weekly, loading, actionLoading } = useSelector(
    (s) => s.holidays
  );

  const [holidayDate, setHolidayDate] = useState(new Date());
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(null);

  const weeklySet = useMemo(
    () => new Set((weekly || []).map((w) => Number(w.weekday))),
    [weekly]
  );
  const oneOffDates = useMemo(
    () =>
      new Set(
        (holidays || []).map((h) =>
          String(h.holiday_date || h.date || "").slice(0, 10)
        )
      ),
    [holidays]
  );

  const selectedYmd = formatYmd(holidayDate);
  const isPast = isBefore(startOfDay(holidayDate), startOfDay(new Date()));
  const isOneOff = oneOffDates.has(selectedYmd);

  const refresh = useCallback(
    async (id) => {
      if (!id) return;
      const result = await dispatch(listStoreHolidays({ store_id: id }));
      if (result.meta?.requestStatus === "rejected") {
        toast.error(result.payload || "Failed to load holidays");
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (storeId) {
      refresh(storeId);
    } else {
      dispatch(clearHolidays());
    }
  }, [storeId, refresh, dispatch]);

  const runAction = async (action, successMsg) => {
    const result = await dispatch(action);
    if (result.meta?.requestStatus === "fulfilled") {
      const cancelled = result.payload?.cancelled_count;
      toast.success(
        cancelled > 0
          ? `${successMsg} ${cancelled} booking(s) cancelled.`
          : successMsg
      );
      refresh(storeId);
      setConfirm(null);
      setReason("");
      return true;
    }
    toast.error(result.payload || "Action failed");
    setConfirm(null);
    return false;
  };

  const askMarkOneOff = () => {
    if (!storeId) return toast.error("Salon not selected");
    if (isPast) return toast.error("Past dates cannot be marked as holidays");
    setConfirm({
      title: "Mark as holiday?",
      message: `Existing bookings on ${selectedYmd} will be cancelled. Customers will be notified when possible.`,
      confirmLabel: "Mark holiday",
      onConfirm: () =>
        runAction(
          addStoreHoliday({
            store_id: storeId,
            date: selectedYmd,
            reason: reason.trim() || undefined,
          }),
          "Holiday set."
        ),
    });
  };

  const askRemoveOneOff = (date) => {
    setConfirm({
      title: "Remove holiday?",
      message: `Remove holiday on ${date}? Previously cancelled bookings will not be restored.`,
      confirmLabel: "Remove",
      onConfirm: () =>
        runAction(
          removeStoreHoliday({ store_id: storeId, date }),
          "Holiday removed."
        ),
    });
  };

  const toggleWeekly = (weekday, fullLabel, currentlyOn) => {
    if (!storeId) return toast.error("Salon not selected");
    if (currentlyOn) {
      setConfirm({
        title: `Remove every ${fullLabel}?`,
        message:
          "Stop marking this weekday as a holiday. Previously cancelled bookings will not be restored.",
        confirmLabel: "Remove",
        onConfirm: () =>
          runAction(
            removeWeeklyHoliday({ store_id: storeId, weekday }),
            `Weekly ${fullLabel} holiday removed.`
          ),
      });
      return;
    }
    setConfirm({
      title: `Close every ${fullLabel}?`,
      message: `All future ${fullLabel} bookings will be cancelled. Customers will be notified when possible.`,
      confirmLabel: "Confirm",
      onConfirm: () =>
        runAction(
          addWeeklyHoliday({
            store_id: storeId,
            weekday,
            reason: reason.trim() || undefined,
          }),
          `Every ${fullLabel} is now a holiday.`
        ),
    });
  };

  if (!storeId) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {showToaster ? <Toaster position="top-right" /> : null}

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Reason (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Festival, Weekly off"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Weekly closed days
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Tap to close every occurrence (e.g. all Sundays). Tap again to cancel.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((d) => {
            const on = weeklySet.has(d.value);
            return (
              <button
                key={d.value}
                type="button"
                disabled={actionLoading || loading}
                onClick={() => toggleWeekly(d.value, d.full, on)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  on
                    ? "bg-red-50 text-red-600 border-red-300"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {weekly.length > 0 && (
          <p className="mt-2 text-sm font-medium text-red-600">
            Active:{" "}
            {weekly
              .map((w) => w.weekday_name || WEEKDAY_LABELS[w.weekday]?.full)
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          One-day holiday
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Date
            </label>
            <DatePicker
              selected={holidayDate}
              onChange={(d) => d && setHolidayDate(d)}
              dateFormat="yyyy-MM-dd"
              calendarClassName="custom-datepicker"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {isOneOff ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => askRemoveOneOff(selectedYmd)}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              >
                Remove {selectedYmd}
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading || isPast}
                onClick={askMarkOneOff}
                className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                Mark {selectedYmd} as holiday
              </button>
            )}
          </div>
        </div>
        {isPast && (
          <p className="mt-2 text-sm text-red-600">
            Past dates cannot be marked as holidays.
          </p>
        )}
        {!isOneOff && weeklySet.has(holidayDate.getDay()) && !isPast && (
          <p className="mt-2 text-sm text-gray-500">
            This date is already closed by a weekly rule. Toggle the weekday
            chip above to cancel the weekly holiday.
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          Upcoming one-day holidays
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <svg
              className="animate-spin h-8 w-8 text-purple-500"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        ) : holidays.length === 0 ? (
          <p className="text-sm text-gray-500">No one-day holidays set</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {holidays.map((h) => {
              const date = String(h.holiday_date || h.date || "").slice(0, 10);
              return (
                <li
                  key={date}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarOff className="text-gray-500 shrink-0" size={18} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">{date}</p>
                      {h.reason ? (
                        <p className="text-sm text-gray-500 truncate">{h.reason}</p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => askRemoveOneOff(date)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Remove holiday"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
        busy={actionLoading}
      />
    </div>
  );
};

export default PartnerHolidaysPanel;
