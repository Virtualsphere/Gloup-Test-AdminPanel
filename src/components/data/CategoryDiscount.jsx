import { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { Percent, X } from "lucide-react";
import {
  getCategoryDiscounts,
  setCategoryDiscount,
  clearCategoryDiscount,
} from "../../redux/slices/categoryDiscountSlice";

// Browser <input type="datetime-local"> gives "YYYY-MM-DDTHH:MM" with no
// timezone — this business runs on IST, so we stamp that offset explicitly
// (same convention as buildAppointmentDateTime on the backend) rather than
// trusting whatever timezone the admin's own machine happens to be in.
const toIstIso = (localDateTime) => (localDateTime ? `${localDateTime}:00+05:30` : null);

const nowAsLocalInput = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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

const CategoryDiscount = ({ title }) => {
  const dispatch = useDispatch();
  const { categories, loading, error } = useSelector((state) => state.categoryDiscount);

  const [formCategoryId, setFormCategoryId] = useState(null);
  const [percent, setPercent] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getCategoryDiscounts());
  }, [dispatch]);

  const openForm = (category) => {
    setFormCategoryId(category.id);
    setPercent(category.discount_percent || "");
    setStartsAt(nowAsLocalInput());
    setEndsAt("");
  };

  const closeForm = () => {
    setFormCategoryId(null);
    setPercent("");
    setStartsAt("");
    setEndsAt("");
  };

  const handleSave = async (categoryId) => {
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
        setCategoryDiscount({
          category_id: categoryId,
          discount_percent: Number(percent),
          starts_at: toIstIso(startsAt),
          ends_at: toIstIso(endsAt),
        })
      ).unwrap();
      toast.success("Category discount set");
      closeForm();
      dispatch(getCategoryDiscounts());
    } catch (err) {
      toast.error(err || "Failed to set discount");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (categoryId) => {
    setSaving(true);
    try {
      await dispatch(clearCategoryDiscount({ category_id: categoryId })).unwrap();
      toast.success("Discount cleared");
      dispatch(getCategoryDiscounts());
    } catch (err) {
      toast.error(err || "Failed to clear discount");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Set a time-limited discount across an entire service category — it overrides every
          service's normal tier/default discount while active, across every partner.
        </p>

        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <Fragment key={category.id}>
                    <tr>
                      <td className="px-4 py-4 font-medium text-gray-800">{category.name}</td>
                      <td className="px-4 py-4">
                        {category.is_active ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <Percent size={12} />
                            {category.discount_percent}% off until {formatDisplay(category.discount_ends_at)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                            No active discount
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              formCategoryId === category.id ? closeForm() : openForm(category)
                            }
                            className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            {formCategoryId === category.id ? "Cancel" : "Set Discount"}
                          </button>
                          {category.is_active && (
                            <button
                              onClick={() => handleClear(category.id)}
                              disabled={saving}
                              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {formCategoryId === category.id && (
                      <tr>
                        <td colSpan={3} className="bg-gray-50 px-4 py-4">
                          <div className="flex flex-wrap items-end gap-4">
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
                              onClick={() => handleSave(category.id)}
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDiscount;
