import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDispatch } from "react-redux";
import { editService } from "../../redux/slices/partnersSlice";

const EditServiceModal = ({ setShowModal, storeId, serviceId, serviceData }) => {
  const dispatch = useDispatch();

  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState("");
  const [duration, setDuration] = useState("00:00:00");
  const [serviceStatus, setServiceStatus] = useState("");
  const [time, setTime] = useState({ hh: "", mm: "", ss: "" });

  // 🔥 Pre-fill form with existing service data
  useEffect(() => {
    if (serviceData) {
      setServiceName(serviceData.service_name || "");
      setAmount(serviceData.amount || "");
      setDiscountedAmount(serviceData.discounted_amount || "");
      setServiceStatus(serviceData.status || "active");
        const [hh = "00", mm = "00", ss = "00"] =
        (serviceData.duration || "00:00:00").split(":");

      setTime({ hh, mm, ss });
      setDuration(`${hh}:${mm}:${ss}`);
    }
  }, [serviceData]);

  async function handleSubmitService(e) {
    e.preventDefault();

    const payload = {
      id: serviceId,
      store_id: storeId,
      service_name: serviceName,
      amount,
      discounted_amount: discountedAmount,
      duration,
      status: serviceStatus,
    };

    console.log("EDIT SERVICE PAYLOAD:", payload);

    await dispatch(editService(payload)).unwrap();
    alert("Service updated successfully ✅");
    window.location.reload();
    setShowModal(false);
  }

    const handleDurationChange = (field, value) => {
    const updated = { ...time, [field]: value };
    setTime(updated);

    const hh = String(updated.hh || 0).padStart(2, "0");
    const mm = String(updated.mm || 0).padStart(2, "0");
    const ss = String(updated.ss || 0).padStart(2, "0");

    setDuration(`${hh}:${mm}:${ss}`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white w-[420px] p-6 rounded-xl shadow-xl space-y-5">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Edit Service {serviceId}</h2>
          <button onClick={() => setShowModal(false)} className="hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitService} className="space-y-4">

          {/* Service Name */}
          <div>
            <label className="text-sm font-medium">Service Name</label>
            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
              required
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border px-3 py-2 rounded-md w-full"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Discounted Amount</label>
              <input
                type="number"
                value={discountedAmount}
                onChange={(e) => setDiscountedAmount(e.target.value)}
                className="border px-3 py-2 rounded-md w-full"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium">Duration (HH:MM:SS)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="0"
                max="23"
                placeholder="HH"
                value={time.hh}
                onChange={(e) => handleDurationChange("hh", e.target.value)}
                className="border px-2 py-2 rounded"
              />
              <input
                type="number"
                min="0"
                max="59"
                placeholder="MM"
                value={time.mm}
                onChange={(e) => handleDurationChange("mm", e.target.value)}
                className="border px-2 py-2 rounded"
              />
              <input
                type="number"
                min="0"
                max="59"
                placeholder="SS"
                value={time.ss}
                onChange={(e) => handleDurationChange("ss", e.target.value)}
                className="border px-2 py-2 rounded"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800"
          >
            Save Changes
          </button>

        </form>
      </div>
    </div>
  );
};

export default EditServiceModal;