import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  editService,
  fetchServiceCategories,
  getStoreServices,
} from "../../redux/slices/partnersSlice";
import toast from "react-hot-toast";

const EditServiceModal = ({ setShowModal, storeId, serviceId, serviceData }) => {
  const dispatch = useDispatch();
  const { serviceCategories } = useSelector((state) => state.allPartners);

  const [loading, setLoading] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState("");
  const [priority, setPriority] = useState(0);
  const [duration, setDuration] = useState("00:00:00");
  const [serviceStatus, setServiceStatus] = useState("active");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceFor, setServiceFor] = useState("unisex");
  const [time, setTime] = useState({ hh: "", mm: "", ss: "" });

  // Load categories
  useEffect(() => {
    dispatch(fetchServiceCategories());
  }, [dispatch]);

  // Prefill form
  useEffect(() => {
    if (serviceData) {
      setServiceName(serviceData.service_name || "");
      setAmount(serviceData.amount || "");
      setDiscountedAmount(serviceData.discounted_amount || "");
      setServiceStatus(serviceData.status || "active");
      setServiceCategory(serviceData.service_category || "");
      setServiceFor(serviceData.service_for || "unisex");
      setPriority(serviceData.priority || 0);

      const [hh = "00", mm = "00", ss = "00"] =
        (serviceData.duration || "00:00:00").split(":");

      setTime({ hh, mm, ss });
      setDuration(`${hh}:${mm}:${ss}`);
    }
  }, [serviceData]);

  const handleDurationChange = (field, value) => {
    const updated = { ...time, [field]: value };
    setTime(updated);

    const hh = String(updated.hh || 0).padStart(2, "0");
    const mm = String(updated.mm || 0).padStart(2, "0");
    const ss = String(updated.ss || 0).padStart(2, "0");

    setDuration(`${hh}:${mm}:${ss}`);
  };

  async function handleSubmitService(e) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      id: serviceId,
      store_id: storeId,
      service_name: serviceName,
      category: serviceCategory,
      service_for: serviceFor,
      amount,
      discounted_amount: discountedAmount,
      duration,
      status: serviceStatus,
      serviceFor: serviceFor,
      priority,
    };

    try {
      await dispatch(editService(payload)).unwrap();
      dispatch(getStoreServices({ store_id: storeId }));
      setShowModal(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error?.message ||
        error ||
        "Failed to update service"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white w-[500px] p-8 rounded-2xl shadow-2xl space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Edit Service #{serviceId}
          </h2>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitService} className="space-y-5">

          {/* Service Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Service Name
            </label>
            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
              required
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">

            {/* Category */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Category
              </label>

              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
                required
              >
                <option value="">Select Category</option>

                {serviceCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Priority
              </label>

              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
              >
                <option value={0}>No Priority</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
              </select>
            </div>

          </div>

          {/* Amounts */}
          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Discounted Amount
              </label>
              <input
                type="number"
                value={discountedAmount}
                onChange={(e) => setDiscountedAmount(e.target.value)}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg"
              />
            </div>

          </div>

          {/* Duration */}
          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Duration (HH : MM : SS)
            </label>

            <div className="flex gap-3">
              {["hh", "mm", "ss"].map((field) => (
                <input
                  key={field}
                  type="number"
                  min="0"
                  max={field === "hh" ? "23" : "59"}
                  placeholder={field.toUpperCase()}
                  value={time[field]}
                  onChange={(e) => handleDurationChange(field, e.target.value)}
                  className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-3 py-2 rounded-lg text-center"
                />
              ))}
            </div>
          </div>

          {/* Service For */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Service For
            </label>
            <select
              value={serviceFor}
              onChange={(e) => setServiceFor(e.target.value)}
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Status
            </label>
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-medium transition ${loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-black to-gray-800 text-white hover:opacity-90"
              }`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default EditServiceModal;