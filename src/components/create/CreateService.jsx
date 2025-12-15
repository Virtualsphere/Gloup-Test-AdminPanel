import { useState } from "react";
import { X } from "lucide-react";
import { useDispatch } from "react-redux";
import { createService } from "../../redux/slices/partnersSlice";

const CreateServiceModal = ({ setShowModal, storeId }) => {

  const dispatch = useDispatch();

  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");

  async function handleSubmitService(e) {
    e.preventDefault();

    const payload = {
      store_id: storeId,
      service_name: serviceName,
      amount,
      discounted_amount: discountedAmount,
      duration,
      status: serviceStatus,
    };

    console.log("CREATE SERVICE PAYLOAD:", payload);

    await dispatch(createService(payload)).unwrap();

    // Clear form after submit
    setServiceName("");
    setAmount("");
    setDiscountedAmount("");
    setDuration("");
    setServiceStatus("");

    setShowModal(false);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white w-[420px] p-6 rounded-xl shadow-xl space-y-5">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Create Service</h2>
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
            <input
              type="text"
              placeholder="00:45:00"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium">Status</label>
            <input
              value={serviceStatus}
              onChange={(e) => setServiceStatus(e.target.value)}
              className="border px-3 py-2 rounded-md w-full"
              required
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800"
          >
            Submit
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateServiceModal;