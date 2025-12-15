import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
    createService,
  getAllPartnersList,
  getStoreServices,
} from "../../redux/slices/partnersSlice";
import { Plus, X } from "lucide-react";

const Services = () => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [pdata, setpData] = useState(null);
  const [error, setError] = useState(null);

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  // form states
  const [storeId, setStoreId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [discountedAmount, setDiscountedAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [serviceStatus, setServiceStatus] = useState("");

  function handleCreateService() {
    setCreateModal(true);
  }

  function handleEditService() {
    setEditModal(true);
  }

  // Handle Form Submit
  async function handleSubmitService(e) {
    e.preventDefault();

    const payload = {
      store_id: storeId,
      service_name: serviceName,
      amount,
      discounted_amount: discountedAmount,
      duration,
      status: serviceStatus
    };

    console.log("CREATE SERVICE PAYLOAD:", payload);

    // TODO: Call create service API here
    await dispatch(createService(payload)).unwrap();

    // After submit, close modal
    setCreateModal(false);

    // Clear form
    setStoreId("");
    setServiceName("");
    setAmount("");
    setDiscountedAmount("");
    setDuration("");
  }

  useEffect(() => {
    setLoading(true);

    dispatch(getStoreServices())
      .unwrap()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });

    dispatch(getAllPartnersList())
      .unwrap()
      .then((res) => {
        setpData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, [dispatch]);

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex flex-col space-y-3 relative">
      {/* ADD SERVICE BUTTON */}
      <button
        onClick={handleCreateService}
        className="flex gap-3 items-center bg-black text-white px-3 py-2 rounded-lg hover:bg-neutral-800 cursor-pointer w-fit"
      >
        <Plus />
        Add Service
      </button>

      {/* CREATE SERVICE MODAL */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] p-5 rounded-xl shadow-xl space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">Create Service</h2>
              <button onClick={() => setCreateModal(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-4">

              {/* Store Dropdown */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Store</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                >
                  <option value="">Select Store</option>
                  {pdata?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Name */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Service Name</label>
                <input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Discounted Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Discounted Amount</label>
                <input
                  type="number"
                  value={discountedAmount}
                  onChange={(e) => setDiscountedAmount(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                />
              </div>

              {/* Duration */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Duration (HH:MM:SS)</label>
                <input
                  type="text"
                  placeholder="00:45:00"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Status</label>
                <input
                  value={serviceStatus}
                  onChange={(e) => setServiceStatus(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SERVICE MODAL */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] p-5 rounded-xl shadow-xl space-y-4">
            <div className="flex justify-between">
              <h2 className="text-lg font-semibold">Edit Service</h2>
              <button onClick={() => setEditModal(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-4">

              {/* Store Dropdown */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Store</label>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                >
                  <option value="">Select Store</option>
                  {pdata?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Name */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Service Name</label>
                <input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Discounted Amount */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Discounted Amount</label>
                <input
                  type="number"
                  value={discountedAmount}
                  onChange={(e) => setDiscountedAmount(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                />
              </div>

              {/* Duration */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Duration (HH:MM:SS)</label>
                <input
                  type="text"
                  placeholder="00:45:00"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label className="text-sm font-medium">Status</label>
                <input
                  value={serviceStatus}
                  onChange={(e) => setServiceStatus(e.target.value)}
                  className="border px-3 py-2 rounded-md"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE TABLE */}
      {data && (
        <table border="1" className="w-full">
          <thead>
            <tr className="bg-neutral-300">
              <th className="border-x border-neutral-200 py-1">Store Name</th>
              <th className="border-x border-neutral-200 py-1">Service</th>
              <th className="border-x border-neutral-200 py-1">Amount</th>
              <th className="border-x border-neutral-200 py-1">Discounted Amount</th>
              <th className="border-x border-neutral-200 py-1">Duration</th>
            </tr>
          </thead>

          <tbody>
            {data.services?.map((item) => {
              const partner = pdata?.find((p) => p.id === item.store_id);

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-violet-300 cursor-pointer ${
                    item.id % 2 === 0 ? "bg-neutral-100" : "bg-white"
                  }`}
                  onClick={handleEditService}
                >
                  <td className="border-x border-neutral-200 px-3 py-1">
                    {partner?.name || "Unknown Store"}
                  </td>
                  <td className="border-x border-neutral-200 px-3 py-1">
                    {item.service_name}
                  </td>
                  <td className="border-x border-neutral-200 px-3 py-1">
                    {item.amount}
                  </td>
                  <td className="border-x border-neutral-200 px-3 py-1">
                    {item.discounted_amount}
                  </td>
                  <td className="border-x border-neutral-200 px-3 py-1">
                    {item.duration}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Services;