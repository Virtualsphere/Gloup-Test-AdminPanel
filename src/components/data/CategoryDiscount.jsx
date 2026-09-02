import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Percent, X, ChevronDown, ChevronRight } from "lucide-react";
import {
  getCategoryDiscountOverview,
  getCategoryDiscountHistory,
  addCategoryDiscount,
  endCategoryDiscountNow,
  cancelScheduledCategoryDiscount,
} from "../../redux/slices/categoryDiscountSlice";

// Browser <input type="datetime-local"> gives "YYYY-MM-DDTHH:MM" with no
// timezone — this business runs on IST, so we stamp that offset explicitly
// (same convention as buildAppointmentDateTime on the backend) rather than
// trusting whatever timezone the admin's own machine happens to be in.
const toIstIso = (localDateTime) => (localDateTime ? `${localDateTime}:00+05:30` : null);

const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const nowAsLocalInput = () => toLocalInputValue(new Date());

const formatDisplay = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATE_STYLES = {
  active: "bg-green-50 text-green-700",
  upcoming: "bg-blue-50 text-blue-700",
  expired: "bg-gray-100 text-gray-500",
};

const CategoryDiscount = ({ title }) => {
  const dispatch = useDispatch();
  const { categories, loading, error, historyByCategory } = useSelector(
    (state) => state.categoryDiscount
  );

  const [expandedId, setExpandedId] = useState(null);
  const [formOpenId, setFormOpenId] = useState(null);
  const [percent, setPercent] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getCategoryDiscountOverview());
  }, [dispatch]);

  const toggleExpand = (category) => {
    if (expandedId === category.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(category.id);
    dispatch(getCategoryDiscountHistory({ category_id: category.id }));
  };

  const openForm = (categoryId) => {
    setFormOpenId(categoryId);
    setPercent("");
    setStartsAt(nowAsLocalInput());
    setEndsAt("");
  };

  const closeForm = () => {
    setFormOpenId(null);
    setPercent("");
    setStartsAt("");
    setEndsAt("");
  };

  const refresh = (categoryId) => {
    dispatch(getCategoryDiscountOverview());
    if (expandedId === categoryId) {
      dispatch(getCategoryDiscountHistory({ category_id: categoryId }));
    }
  };

  const handleAdd = async (categoryId) => {
    if (!percent || Number(percent) <= 0 || Number(percent) > 100) {
      toast.error("Enter a discount percent between 1 and 100");
      return;
    }
    if (!endsAt) {
      toast.error("Pick an end date & time");
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        addCategoryDiscount({
          category_id: categoryId,
          discount_percent: Number(percent),
          starts_at: toIstIso(startsAt),
          ends_at: toIstIso(endsAt),
        })
      ).unwrap();
      toast.success("Discount scheduled");
      closeForm();
      refresh(categoryId);
    } catch (err) {
      toast.error(err || "Failed to add discount");
    } finally {
      setSaving(false);
    }
  };

  const handleEndNow = async (categoryId) => {
    setSaving(true);
    try {
      await dispatch(endCategoryDiscountNow({ category_id: categoryId })).unwrap();
      toast.success("Discount ended");
      refresh(categoryId);
    } catch (err) {
      toast.error(err || "Failed to end discount");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (categoryId, discountId) => {
    setSaving(true);
    try {
      await dispatch(cancelScheduledCategoryDiscount({ id: discountId })).unwrap();
      toast.success("Scheduled discount cancelled");
      refresh(categoryId);
    } catch (err) {
      toast.error(err || "Failed to cancel discount");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Schedule time-limited discounts across a whole service category — while active, it
          overrides every service's normal tier/default discount, across every partner. Click a
          category to see its current, upcoming, and past discounts.
        </p>

        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {categories.map((category) => {
              const isExpanded = expandedId === category.id;
              const history = historyByCategory[category.id];

              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggleExpand(category)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                      <span className="font-medium text-gray-800">{category.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {category.is_active ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <Percent size={12} />
                          {category.active_discount.discount_percent}% off until{" "}
                          {formatDisplay(category.active_discount.ends_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                          No active discount
                        </span>
                      )}
                      {category.upcoming_count > 0 && (
                        <span className="text-xs text-blue-600">
                          {category.upcoming_count} upcoming
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 px-4 py-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            formOpenId === category.id ? closeForm() : openForm(category.id)
                          }
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-black text-white hover:bg-neutral-800 transition"
                        >
                          {formOpenId === category.id ? "Cancel" : "Schedule Discount"}
                        </button>
                        {category.is_active && (
                          <button
                            onClick={() => handleEndNow(category.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            End Active Discount Now
                          </button>
                        )}
                      </div>

                      {formOpenId === category.id && (
                        <div className="flex flex-wrap items-end gap-4 bg-white border border-gray-200 rounded-lg p-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={percent}
                              onChange={(e) => setPercent(e.target.value)}
                              className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Starts (IST)</label>
                            <input
                              type="datetime-local"
                              value={startsAt}
                              onChange={(e) => setStartsAt(e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ends (IST)</label>
                            <input
                              type="datetime-local"
                              value={endsAt}
                              onChange={(e) => setEndsAt(e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                            />
                          </div>
                          <button
                            onClick={() => handleAdd(category.id)}
                            disabled={saving}
                            className="px-4 py-2 rounded-md text-sm font-medium bg-black text-white hover:bg-neutral-800 transition disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={closeForm}
                            className="p-2 rounded-full hover:bg-gray-200 transition"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          History
                        </p>
                        {!history ? (
                          <p className="text-sm text-gray-400">Loading...</p>
                        ) : history.length === 0 ? (
                          <p className="text-sm text-gray-400">No discounts have ever been set for this category.</p>
                        ) : (
                          <div className="space-y-2">
                            {history.map((h) => (
                              <div
                                key={h.id}
                                className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${STATE_STYLES[h.state]}`}
                                  >
                                    {h.state}
                                  </span>
                                  <span className="text-sm text-gray-700">
                                    {h.discount_percent}% off — {formatDisplay(h.starts_at)} to{" "}
                                    {formatDisplay(h.ends_at)}
                                  </span>
                                </div>
                                {h.state === "upcoming" && (
                                  <button
                                    onClick={() => handleCancel(category.id, h.id)}
                                    disabled={saving}
                                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {categories.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">No categories found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDiscount;
