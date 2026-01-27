import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  IndianRupee,
  Edit,
  Trash2,
} from "lucide-react";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import {
  getPartnerDetail,
  getAllPayoutLogs,
  updatePartnerDetail,
  updatePartnerStatus,
  deletePartner,
  getStoreServices,
} from "../../redux/slices/partnersSlice";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import MapPicker from "../create/MapPicker";
import CreateServiceModal from "../create/CreateService";
import { Plus } from "lucide-react";
import EditServiceModal from "../create/EditService";

export const EditPartnerModal = ({ isOpen, onClose, partnerData, onSave }) => {
  const [location, setLocation] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    income: "",
    description: "",
    images: [],
    addressLine1: "",
    addressLine2: "",
    state: "",
    district: "",
    city: "",
    area: "",
    zipcode: "",
    landmark: "",
    latitude: "",
    longitude: "",
    location: location,
    radius: "",
    status: "",
    newImagesAdded: false,
  });

  useEffect(() => {
    debugger;
    if (!partnerData) return;
    const d = partnerData.store_details;

    setForm({
      name: d?.name || "",
      email: d?.email || "",
      phone: d?.phone || "",
      income: d?.income || "",
      description: d?.description || "",
      images: d?.images || [],
      addressLine1: d?.addressLine1,
      addressLine2: d?.addressLine2 || "",
      state: d?.state || "",
      district: d?.district || "",
      city: d?.city || "",
      area: d?.area || "",
      zipcode: d?.zipcode || "",
      landmark: d?.landmark || "",
      latitude: d?.latitude,
      longitude: d?.longitude,
      location: null,
      radius: d?.radius || "",
      status: d?.status,
      newImagesAdded: false,
    });

    setLocation({ lat: d?.latitude, lng: d?.longitude });

  }, [partnerData]);

  // ✅ FIX — sync MapPicker → form
  useEffect(() => {
    if (location) {
      setForm(prev => ({
        ...prev,
        latitude: location.lat,
        longitude: location.lng,
        location
      }));
    }
  }, [location]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

   const handleLocationSelect = (loc) => {
    setForm((p) => ({
      ...p,
      latitude: loc.lat.toFixed(6),
      longitude: loc.lng.toFixed(6),
    }));
  };

  const handleImageChange = (e) => {
    const files = [...e.target.files];
    handleChange("images", files);
    handleChange("newImagesAdded", true);
  };

  const handleSave = () => onSave(form);

  const API = import.meta.env.VITE_API_BASE_URL;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
      <div className="relative w-full grid grid-cols-2 gap-3 max-w-5xl mx-auto p-6 rounded-2xl shadow-2xl border bg-white overflow-y-scroll max-h-screen">
        <div className="col-span-full">
          <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
        >
          <XCircle size={24} />
        </button>

        <h3 className="text-xl font-semibold mb-5 text-gray-800 text-center">
          Edit Salon Details
        </h3>
        </div>
        

        {/* Inputs */}
        {["name", "email", "phone", "income", "description", "addressLine1", "addressLine2", "area", "city", "district", "state", "zipcode", "landmark", "radius", "status"].map((field) => (
          <div className="mb-4" key={field}>
            <label className="block text-sm font-medium text-gray-700 capitalize">
              Salon {field}
            </label>
            <input
              type={field === "phone" ? "number" : "text"}
              value={form[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              className="mt-1 block w-full bg-white border border-gray-300 px-3 py-2 rounded-md focus:ring-indigo-500"
            />
          </div>
        ))}

        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">
          Salon Location
        </label>
        <MapPicker
  defaultLocation={
    form.latitude && form.longitude
      ? { lat: Number(form.latitude), lng: Number(form.longitude) }
      : null
  }
  onSelectLocation={handleLocationSelect}
  editable
/>

        {location && (
          <p>Selected: {form.latitude}, {form.longitude}</p>
        )}
        </div>

        {/* Images */}
        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">
            Salon Images
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="mt-1 block w-full border rounded-md cursor-pointer file:bg-indigo-600 file:text-white"
          />
        </div>
        

        {/* Preview */}
        <div className="flex flex-wrap gap-2 mt-3">
          {form.newImagesAdded
            ? form.images.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  className="w-16 h-16 rounded-md object-cover border"
                />
              ))
            : form.images.map((img, i) => (
                <img
                  key={i}
                  src={`${API}/images/${img}`}
                  className="w-16 h-16 rounded-md object-cover border"
                />
              ))}
        </div>

        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">
            Salon Services
          </label>
        </div>

        <div className="col-span-full">
          <label className="block text-sm font-medium text-gray-700">
            Salon Timing
          </label>
        </div>

        <div className="flex justify-end col-span-full space-x-3 pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const PartnerDetails = ({ title }) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [serviceId, setServiceId] = useState(null);
  const [serviceData, setServiceData] = useState(null);

  const [data, setData] = useState(null);
  const [logData, setLogData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  const [servicesData, setServicesData] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Get all services
  useEffect(() => {
    debugger;
  setLoading(true);

dispatch(getStoreServices({ id }))
  .unwrap()
  .then((res) => {
    debugger;

    // ✅ Check if services array exists and is not empty
    if (!Array.isArray(res.services) || res.services.length === 0) {
      console.log("No services found for this store");
      setServicesData([]);        // reset state
      return;                     // stop further execution
    }

    console.log("Store ID:", id);
    console.log("First service store_id:", res.services[0].store_id);

    console.log(
      "Unique store_ids:",
      [...new Set(res.services.map(s => s.store_id))]
    );

    const filteredServices = res.services.filter(
      (item) => Number(item.store_id) === Number(id)
    );

    console.log("Filtered Services:", filteredServices);

    setServicesData(filteredServices);
  })
  .catch((err) => setError(err.toString()))
  .finally(() => setLoading(false));
}, [dispatch, id]);

  
  console.log('Services Data: ', servicesData);

  function handleEditService() {
    setShowCreateModal(true);
  }

  function handleUpdateService() {
    setShowUpdateModal(true);
  }

  const allPartnerDetail = useSelector(
    (state) => state.allPartners.partnerDetail
  );
  const allPayoutLogs = useSelector((state) => state.allPartners.allPayoutLogs);

  // Fetch partner details + logs
  useEffect(() => {
    setLoading(true);

    dispatch(getPartnerDetail({ id }))
      .unwrap()
      .then((res) => {
        console.log('response: ', res)
        console.log('res: ', res.store_details)
        setData(res);
        setLocation({ lat: res.store_details.latitude, lng: res.store_details.longitude });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });

    dispatch(getAllPayoutLogs({ id }));
  }, [dispatch, id]);

  // Update state when redux changes
  useEffect(() => {
    if (allPartnerDetail) setData(allPartnerDetail);
    if (allPayoutLogs) setLogData(allPayoutLogs);
  }, [allPartnerDetail, allPayoutLogs]);

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "booked":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusToggle = async () => {
    if (!data?.store_details) return;

    const curr = data.store_details.status;
    const newStatus = curr === "active" ? "inactive" : "active";

    if (!window.confirm(`Are you sure you want to ${curr === "active" ? "deactivate" : "activate"} this partner?`))
      return;

    try {
      await dispatch(updatePartnerStatus({ id, status: newStatus })).unwrap();
      dispatch(getPartnerDetail({ id }));
    } catch {
      alert("Failed to update status. Please try again.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await dispatch(deletePartner({ id })).unwrap();
      setShowDeleteModal(false);
      navigate("/partners");
    } catch {
      alert("Failed to delete partner.");
      setShowDeleteModal(false);
    }
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      console.log('handling save')
 // -----------------------------
    // 1️⃣ BASIC REQUIRED VALIDATION
    // -----------------------------
    const requiredFields = [
      "name",
      "email",
      "phone",
      "addressLine1",
      "state",
      "district",
      "city",
      "status",
    ];

    for (let field of requiredFields) {
      if (!updatedData[field]?.toString().trim()) {
        alert(`Please enter ${field}`);
        return;
      }
    }

    // -----------------------------
    // 2️⃣ EMAIL VALIDATION
    // -----------------------------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updatedData.email)) {
      alert("Please enter a valid email address");
      return;
    }

    // -----------------------------
    // 3️⃣ PHONE VALIDATION (India)
    // -----------------------------
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(updatedData.phone)) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    // -----------------------------
    // 4️⃣ NUMERIC VALIDATION
    // -----------------------------
    if (!updatedData.income && isNaN(updatedData.income)) {
      alert("Income must be a number");
      return;
    }

    if (
      !updatedData.latitude ||
      !updatedData.longitude ||
      isNaN(updatedData.latitude) ||
      isNaN(updatedData.longitude)
    ) {
      alert("Please select a valid location on map");
      return;
    }

    if (updatedData.radius && isNaN(updatedData.radius)) {
      alert("Radius must be a number");
      return;
    }

    // -----------------------------
    // 5️⃣ IMAGE VALIDATION
    // -----------------------------
    if (
      (!updatedData.images || updatedData.images.length === 0)
    ) {
      alert("Please upload at least one image");
      return;
    }

      const formData = new FormData();
      formData.append("id", id);
      formData.append("name", updatedData.name);
      formData.append("email", updatedData.email);
      formData.append("phone", updatedData.phone);
      formData.append("income", updatedData.income);
      formData.append("description", updatedData.description);
      formData.append("addressLine1", updatedData.addressLine1);
      formData.append("addressLine2", updatedData.addressLine2);
      formData.append("state", updatedData.state);
      formData.append("district", updatedData.district);
      formData.append("city", updatedData.city);
      formData.append("area", updatedData.area);
      formData.append("zipcode", updatedData.zipcode);
      formData.append("landmark", updatedData.landmark);
      formData.append("latitude", updatedData.latitude);
      formData.append("longitude", updatedData.longitude);
      formData.append("location", `${updatedData.longitude},${updatedData.latitude}`);
      formData.append("radius", updatedData.radius);
      formData.append("status", updatedData.status);

      if (!updatedData.newImagesAdded) {
        updatedData.images.forEach((img) => {
          formData.append("oldImages", img);
        });
      }

      if (updatedData.newImagesAdded) {
        updatedData.images.forEach((file) => {
          formData.append("images", file);
        });
      }

      console.log('formdata: ', formData)

      await dispatch(updatePartnerDetail(formData)).unwrap();

      alert("Partner Updated Successfully ✅");
      window.location.reload();
      dispatch(getPartnerDetail({ id }));
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to save changes. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Loading partner details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md">
        {`Error: ${error}`}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="min-h-screen">

            {/* TOP SECTION — UNCHANGED */}
            <div className="bg-white shadow-lg border-b border-purple-100">
              <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6">
                  <div className="flex gap-4">

                    {data?.store_details?.images?.length ? (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                        <Swiper
                          modules={[Autoplay]}
                          autoplay={{ delay: 3000, disableOnInteraction: false }}
                          loop
                          className="w-full h-full"
                        >
                          {data.store_details.images.map((img, i) => (
                            <SwiperSlide key={i}>
                              <img
                                src={`${import.meta.env.VITE_API_BASE_URL}/images/${img}`}
                                alt={`store-image-${i}`}
                                className="w-full h-full object-cover"
                              />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500">
                        No Image
                      </div>
                    )}

                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {data?.store_details?.name}
                      </h1>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {data?.store_details?.area}, {data?.store_details?.city}, {data?.store_details?.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data?.store_details?.status)}`}>
                      {data?.store_details?.status
                        ? data.store_details.status.charAt(0).toUpperCase() +
                          data.store_details.status.slice(1)
                        : "Unknown"}
                    </span>

                    <button
                      onClick={() => setShowEditModal(true)}
                      className="inline-flex cursor-pointer px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </button>

                    <button
                      onClick={handleStatusToggle}
                      className="inline-flex cursor-pointer px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    >
                      {data?.store_details?.status === "active" ? (
                        <XCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      {data?.store_details?.status === "active" ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="inline-flex cursor-pointer px-3 py-2 border border-red-300 rounded-md text-red-700 bg-white text-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* ALL DATA DISPLAY (REPLACES TABS) */}
            <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* STORE DETAILS */}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">Store Details</h3>

              <div className="rounded-xl border bg-white shadow-sm p-5 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><span className="font-bold">Name:</span> {data?.store_details?.name}</p>
                  <p><span className="font-bold">Area:</span> {data?.store_details?.area}</p>

                  <p><span className="font-bold">City:</span> {data?.store_details?.city}</p>
                  <p><span className="font-bold">State:</span> {data?.store_details?.state}</p>

                  <p><span className="font-bold">Email:</span> {data?.store_details?.email}</p>
                  <p><span className="font-bold">Phone:</span> {data?.store_details?.phone}</p>
                  <p><span className="font-bold">Zipcode:</span> {data?.store_details?.zipcode}</p>

                  <p>
                    <span className="font-bold">Income:</span> ₹{data?.store_details?.income}
                  </p>

                  <p className="col-span-2">
                    <span className="font-bold">Description:</span> {data?.store_details?.description}
                  </p>
                </div>

                <div className="rounded-lg overflow-hidden border h-64">
                  <MapPicker defaultLocation={location} editable={false} />
                </div>
              </div>
            </div>

              {/* TIMESLOTS */}
         <div className="p-4">
  <p className="mb-2 font-semibold">Timeslots</p>

  <div className="max-h-72 overflow-y-auto rounded-lg">
    <table className="min-w-full text-sm border-collapse">
      <thead className="sticky top-0 bg-gray-100 z-10">
        <tr>
          <th className="px-4 py-2 text-left border-b">From</th>
          <th className="px-4 py-2 text-left border-b">To</th>
          <th className="px-4 py-2 text-left border-b">Notes</th>
          <th className="px-4 py-2 text-left border-b">Status</th>
        </tr>
      </thead>

      <tbody>
        {data?.timeslots?.map((slot, index) => (
          <tr
            key={slot.id}
             className={`hover:bg-neutral-200 cursor-pointer ${
                                  index % 2 === 0 ? "bg-neutral-100" : "bg-white"
                                }`}
          >
            <td className="border-x border-neutral-200 px-4 py-2">{slot.from}</td>
            <td className="border-x border-neutral-200 px-4 py-2">{slot.to}</td>
            <td className="border-x border-neutral-200 px-4 py-2">{slot.notes || "-"}</td>
            <td className="border-x border-neutral-200 px-4 py-2 capitalize">{slot.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


              {/* EDIT SERVICES */}
              <div className="p-4">
                <p className="mb-2 font-semibold">Services</p>
                <button
                  onClick={handleEditService}
                  className="px-3 py-2 bg-black hover:bg-neutral-800 text-white flex gap-2"
                >
                  <Plus /> Add Service
                </button>
                <div className="mt-3 max-h-72 overflow-y-auto rounded-lg">
                  {Array.isArray(servicesData) && servicesData.length > 0 && (
                        <table className="min-w-full text-sm border-collapse">
                          <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                              <th className="px-4 py-2 text-left border-b">Service</th>
                              <th className="px-4 py-2 text-left border-b">Amount</th>
                              <th className="px-4 py-2 text-left border-b">Discounted Amount</th>
                              <th className="px-4 py-2 text-left border-b">Duration</th>
                            </tr>
                          </thead>

                          <tbody>
                            {servicesData.map((item, index) => (
                              <tr
                                key={item.id}
                                className={`hover:bg-neutral-200 cursor-pointer ${
                                  index % 2 === 0 ? "bg-neutral-100" : "bg-white"
                                }`}
                                onClick={() => {
                                  setServiceId(item.id);
                                  setServiceData(item);
                                  handleUpdateService();
                                }}
                              >
                                <td className="border-x border-neutral-200 px-4 py-2">
                                  {item.service_name}
                                </td>
                                <td className="border-x border-neutral-200 px-4 py-2">
                                  {item.amount}
                                </td>
                                <td className="border-x border-neutral-200 px-4 py-2">
                                  {item.discounted_amount}
                                </td>
                                <td className="border-x border-neutral-200 px-4 py-2">
                                  {item.duration}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    {showCreateModal && <CreateServiceModal setShowModal={setShowCreateModal} storeId={id}/>}
                    {showUpdateModal && (<EditServiceModal setShowModal={setShowUpdateModal} storeId={id} serviceId={serviceId} serviceData={serviceData}/>)}
                </div>
              </div>

              {/* STYLISTS */}
              <div className="p-4 max-h-72 overflow-y-auto">
                <h3 className="text-sm font-semibold mb-2">Stylists</h3>

                {data?.professionals?.length > 0 ? (
                  <div className="space-y-3">
                    {data.professionals.map((pro, i) => (
                      <div key={i} className="border border-slate-300 p-3 rounded-md bg-gray-50">
                        {/* <p><strong>ID:</strong> {pro.id}</p> */}
                        <p><strong>Name:</strong> {pro.name}</p>
                        <p><strong>Email:</strong> {pro.email}</p>
                        <p><strong>Phone:</strong> {pro.phone ?? "N/A"}</p>
                        <p><strong>Address:</strong> {pro.address}</p>
                        <p><strong>Gender:</strong> {pro.gender}</p>
                        <p><strong>Designation:</strong> {pro.designation}</p>
                        <p><strong>Country:</strong> {pro.country}</p>
                        <p><strong>Status:</strong> {pro.status}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No stylists found.</p>
                )}
              </div>

              {/* PAYOUT LOGS */}
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-2">Payout Logs</h3>

                {logData?.length > 0 ? (
                  <div className="space-y-3">
                    {logData.map((log, i) => (
                      <div key={i} className="border border-slate-300 p-3 rounded-md bg-gray-50">
                        <p><strong>Amount:</strong> ₹{log.amount}</p>
                        <p><strong>Status:</strong> {log.status}</p>
                        <p><strong>Date:</strong> {new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No payout logs found.</p>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* MODALS */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
        partnerName={data?.store_details?.name || "this partner"}
      />

      <EditPartnerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        partnerData={data}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default PartnerDetails;
