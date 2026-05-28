import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { createService, fetchServiceCategories } from "../../redux/slices/partnersSlice";
import toast from "react-hot-toast";

const CreateServiceModal = ({ setShowModal, storeId }) => {

  const dispatch = useDispatch();
  const { serviceCategories } = useSelector((state) => state.allPartners);
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState(0);
  const [discountedAmount, setDiscountedAmount] = useState("");
  const [duration, setDuration] = useState("00:00:00");
  const [time, setTime] = useState({ hh: "", mm: "", ss: "" });
  const [serviceStatus, setServiceStatus] = useState("active");
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceFor, setServiceFor] = useState("unisex");


  async function handleSubmitService(e) {
    e.preventDefault();

    try {

      const payload = {
        store_id: storeId,
        service_name: serviceName,
        category: serviceCategory,
        service_for: serviceFor,
        amount,
        discounted_amount: discountedAmount,
        priority,
        duration,
        status: serviceStatus,
      };

      console.log("CREATE SERVICE PAYLOAD:", payload);

      await dispatch(createService(payload)).unwrap();

      toast.success("Service created successfully!");

      // Reset form
      setServiceName("");
      setAmount("");
      setDiscountedAmount("");
      setPriority(0);
      setDuration("00:00:00");
      setTime({ hh: "", mm: "", ss: "" });
      setServiceStatus("active");
      setServiceCategory("");
      setServiceFor("unisex");

      setShowModal(false);

    } catch (error) {

      console.log(error);

      toast.error(
        error?.message ||
        error ||
        "Failed to create service"
      );
    }
  }

  useEffect(() => {
    dispatch(fetchServiceCategories());
  }, [dispatch]);

  const handleDurationChange = (field, value) => {
    const updated = { ...time, [field]: value };

    setTime(updated);

    const hh = String(updated.hh || 0).padStart(2, "0");
    const mm = String(updated.mm || 0).padStart(2, "0");
    const ss = String(updated.ss || 0).padStart(2, "0");

    setDuration(`${hh}:${mm}:${ss}`);
  };


  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white w-[460px] p-8 rounded-2xl shadow-2xl space-y-6 animate-fadeIn">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-wide">
            Create Service
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
              placeholder="Enter service name"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">
                Discounted
              </label>
              <input
                type="number"
                value={discountedAmount}
                onChange={(e) => setDiscountedAmount(e.target.value)}
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              Duration
            </label>
            <div className="flex gap-3">
              {["hh", "mm", "ss"].map((field, index) => (
                <input
                  key={index}
                  type="number"
                  min="0"
                  max={field === "hh" ? "23" : "59"}
                  placeholder={field.toUpperCase()}
                  value={time[field]}
                  onChange={(e) =>
                    handleDurationChange(field, e.target.value)
                  }
                  className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-3 py-2 rounded-lg text-center transition"
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
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-black to-gray-800 text-white py-3 rounded-lg font-medium tracking-wide hover:opacity-90 transition"
          >
            Create Service
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateServiceModal;