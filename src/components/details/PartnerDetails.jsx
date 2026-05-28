import React, { useState, useEffect, useMemo } from "react";
import { MapPin, CheckCircle, XCircle, Eye, Calendar, User, IndianRupee, Edit, Trash2, Upload } from "lucide-react";
import { FaRegMoneyBillAlt } from "react-icons/fa";
import { getPartnerDetail, getAllPayoutLogs, updatePartnerDetail, updatePartnerStatus, deletePartner, getStoreServices, generateDefaultSlots, BlockAndUnblockSlot, getBlockedSlots, getLanguageList, getServiceProvidedForOptions } from "../../redux/slices/partnersSlice";
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
import { fetchServiceCategories, deleteService } from "../../redux/slices/partnersSlice";

const useDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
 
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
 
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
 
  const handleDrop = (e, callback) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
 
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );
 
    if (imageFiles.length > 0) {
      callback(imageFiles);
    }
  };
 
  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};

const LogoUploadSection = ({ form, handleChange }) => {
  const dragDropLogo = useDragAndDrop();
  const logoInputRef = React.useRef(null);
 
  const cleanLogo = (logo) => {
    if (!logo) return null;
    return logo.replace(/^"+|"+$/g, "");
  };
 
  const handleLogoDrop = (files) => {
    if (files[0]) {
      handleChange("logo", files[0]);
      handleChange("newLogoAdded", true);
    }
  };
 
  return (
    <div className="col-span-full bg-white rounded-xl p-5 shadow-sm border border-gray-300">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Store Logo
      </h3>
 
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Logo Preview */}
        <div className="relative group">
          {form.logo ? (
            <>
              <img
                src={
                  form.logo instanceof File
                    ? URL.createObjectURL(form.logo)
                    : `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${window.location.pathname.split("/")[2]}/logo/${cleanLogo(form.logo)}`
                }
                alt="Store Logo"
                className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 shadow-lg transition-transform group-hover:scale-105"
                onError={(e) => {
                  const target = e.target;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = "true";
                    target.src = `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`;
                  }
                }}
              />
 
              {/* Remove Logo Button */}
              <button
                type="button"
                onClick={() =>
                  handleChange("logo", null) || handleChange("newLogoAdded", true)
                }
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center shadow hover:bg-red-700 transition transform hover:scale-110"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
              <Upload className="w-8 h-8" />
            </div>
          )}
        </div>
 
        {/* Upload Area */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={dragDropLogo.handleDragOver}
            onDragLeave={dragDropLogo.handleDragLeave}
            onDrop={(e) => dragDropLogo.handleDrop(e, handleLogoDrop)}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
              dragDropLogo.isDragging
                ? "border-indigo-500 bg-indigo-50 scale-105"
                : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
            }`}
          >
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your logo here
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to browse</p>
 
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleLogoDrop([e.target.files[0]]);
                }
              }}
            />
 
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              Browse Files
            </button>
          </div>
 
          <p className="text-xs text-gray-500">
            📦 Supported: PNG, JPG, GIF (Max 5MB)
          </p>
        </div>
      </div>
    </div>
  );
};

const SalonImagesSection = ({ form, handleChange, id }) => {
  const dragDropImages = useDragAndDrop();
  const imagesInputRef = React.useRef(null);
 
  const handleImagesDrop = (files) => {
    handleChange("images", [...form.images, ...files]);
    handleChange("newImagesAdded", true);
  };
 
  const removeImage = (index) => {
    const updated = form.images.filter((_, i) => i !== index);
    handleChange("images", updated);
  };
 
  return (
    <div className="col-span-full bg-white rounded-xl p-5 shadow-sm border border-gray-300">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Salon Images
      </h3>
 
      {/* Drag & Drop Zone */}
      <div
        onDragOver={dragDropImages.handleDragOver}
        onDragLeave={dragDropImages.handleDragLeave}
        onDrop={(e) => dragDropImages.handleDrop(e, handleImagesDrop)}
        className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl transition cursor-pointer ${
          dragDropImages.isDragging
            ? "border-indigo-500 bg-indigo-50 scale-105"
            : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
        }`}
      >
        <Upload className="w-10 h-10 text-indigo-500 mb-2" />
        <p className="text-sm font-medium text-gray-700">
          Drag & drop images here
        </p>
        <p className="text-xs text-gray-500 mt-1">or click to browse</p>
 
        <input
          ref={imagesInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length > 0) {
              handleImagesDrop(Array.from(e.target.files));
            }
          }}
        />
 
        <button
          type="button"
          onClick={() => imagesInputRef.current?.click()}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          Browse Files
        </button>
      </div>
 
      <p className="text-xs text-gray-500 mt-2">
        📦 Supported: PNG, JPG, GIF up to 5MB each | Drag multiple files at once
      </p>
 
      {/* Image Preview Grid */}
      {(form.images || []).length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Preview ({form.images.length} images)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(form.images || []).map((img, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden shadow-md border border-gray-200 bg-white aspect-square"
              >
                {/* New Badge */}
                {img instanceof File && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-md z-10 font-semibold">
                    NEW
                  </span>
                )}
 
                {/* Image */}
                <img
                  src={
                    img instanceof File
                      ? URL.createObjectURL(img)
                      : `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${id}/images/${img}`
                  }
                  alt={`salon-${i}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "true";
                      target.src = `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`;
                    }
                  }}
                />
 
                {/* Overlay with Remove Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-red-700 transition transform hover:scale-105 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const EditPartnerModal = ({ isOpen, onClose, partnerData, onSave, saving }) => {
  const [location, setLocation] = useState(null);
  const dispatch = useDispatch();
  const [selectedCategory, setSelectedCategory] = useState("all");
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
    logo: null,
    newLogoAdded: false,
    servicesProvidedFor: [],
    languages: [],
    isPremium: false,
  });
  const [servicesProvidedFor, setServicesProvidedFor] = useState([]);
  const [languageOptions, setLanguageOptions] = useState([]);

  useEffect(() => {
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
      logo: d?.logo || null,
      newLogoAdded: false,
      servicesProvidedFor: d?.services_provided_for || [],
      languages: d?.languages || [],
      isPremium: d?.is_premium || false,
    });

    console.log('partnerData useEffect: ', partnerData)

    setLocation({ lat: d?.latitude, lng: d?.longitude });

  }, [partnerData]);


  useEffect(() => {
    dispatch(getServiceProvidedForOptions()).then((res) => {
      setServicesProvidedFor(res.payload || []);
    });

    dispatch(getLanguageList()).then((res) => {
      setLanguageOptions(res.payload || []);
    });
  }, [dispatch]);

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

  const cleanLogo = (logo) => {
    if (!logo) return null;
    return logo.replace(/^"+|"+$/g, ""); // remove extra quotes
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    handleChange("images", [...form.images, ...files]);

    handleChange("newImagesAdded", true);
  };

  const handleSave = () => onSave(form);

  const API = import.meta.env.VITE_API_BASE_URL;

  const IMAGEAPI = import.meta.env.VITE_IMAGE_BASE_URL;

  const { id } = useParams();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
          <h2 className="text-xl font-semibold">Edit Salon</h2>
          <button onClick={onClose}>
            <XCircle />
          </button>
        </div>
        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Inputs */}
          {["name", "email", "phone", "income", "addressLine1", "area", "city", "district", "state", "zipcode", "landmark", "radius"].map((field) => (
            <div className="mb-4" key={field}>
              <label className="block text-sm font-medium text-gray-700 capitalize">
                {field === "addressLine1" ? "Salon Full Address" : `Salon ${field}`}
              </label>
              <input
                type={
        field === "phone" || field === "radius" || field === "income"
          ? "number"
          : "text"
      }
      min={field === "radius" ? "0" : undefined}
      step={field === "radius" ? "any" : undefined}
      value={form[field]}
      onChange={(e) => {
        let value = e.target.value;

        // ✅ SPECIAL VALIDATION FOR RADIUS
        if (field === "radius") {
          if (value === "" || Number(value) >= 0) {
            handleChange(field, value);
          }
          return;
        }

        handleChange(field, value);
      }}
      onKeyDown={(e) => {
        // ✅ BLOCK invalid characters for radius
        if (field === "radius") {
          if (["e", "E", "+", "-"].includes(e.key)) {
            e.preventDefault();
          }
        }
      }}
                className="mt-1 block w-full bg-white border border-gray-300 px-3 py-2 rounded-md focus:ring-indigo-500"
              />
            </div>
          ))}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salon Description
            </label>

            <textarea
              rows={4}
              maxLength={500}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe your salon, services, ambience, specialties..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 
               focus:ring-2 focus:ring-indigo-500 
               focus:border-indigo-500 
               resize-none transition"
            />

            {/* Character Counter */}
            <div className="text-right text-xs text-gray-500 mt-1">
              {form.description?.length || 0}/500
            </div>
          </div>
          {/* Salon Services Provided For */}
          <div className="col-span-full bg-white rounded-xl p-5 shadow-sm border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Services Provided For
            </h3>

            <div className="flex flex-wrap gap-3">
              {servicesProvidedFor.map((item) => {
                const active = form.servicesProvidedFor.includes(item.id);

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      const updated = active
                        ? form.servicesProvidedFor.filter((l) => l !== item.id)
                        : [...form.servicesProvidedFor, item.id];

                      handleChange("servicesProvidedFor", updated);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 
                        ${active
                        ? "bg-indigo-600 text-white shadow-md scale-105"
                        : "bg-gray-200 hover:bg-gray-300"
                      }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>

            {form.servicesProvidedFor.length > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Selected: {form.servicesProvidedFor
                  .map(
                    (id) =>
                      servicesProvidedFor.find((s) => s.id === id)?.name
                  )
                  .join(", ")}
              </p>
            )}
          </div>
          {/* Languages Known */}
          <div className="col-span-full bg-white rounded-xl p-5 shadow-sm border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Languages Known
            </h3>

            <div className="flex flex-wrap gap-3">
              {languageOptions.map((lang) => {
                const active = form.languages.includes(lang.id);

                return (
                  <button
                    type="button"
                    key={lang.id}
                    onClick={() => {
                      const updated = active
                        ? form.languages.filter((l) => l !== lang.id)
                        : [...form.languages, lang.id];

                      handleChange("languages", updated);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 
                        ${active
                        ? "bg-indigo-600 text-white shadow-md scale-105"
                        : "bg-gray-200 hover:bg-gray-300"
                      }`}
                  >
                    {lang.name}
                  </button>
                );
              })}
            </div>

            {form.languages.length > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Selected: {form.languages
                  .map((id) => languageOptions.find((l) => l.id === id)?.name)
                  .join(", ")}
              </p>
            )}
          </div>
          {/* Premium Partner */}
          <div className="flex items-center gap-4">
            <span className="font-medium text-gray-700">Premium Partner</span>

            <button
              type="button"
              onClick={() => handleChange("isPremium", !form.isPremium)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${form.isPremium ? "bg-yellow-400" : "bg-gray-300"
                }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition ${form.isPremium ? "translate-x-6" : ""
                  }`}
              />
            </button>

            {form.isPremium && (
              <span className="text-yellow-600 font-medium">⭐ Premium</span>
            )}
          </div>
          {/* Salon Location */}
          <div className="col-span-full">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-300">
              <h3 className="text-lg font-semibold mb-3">
                Salon Location
              </h3>

              <div className="rounded-xl overflow-hidden border border-gray-300 h-72">
                <MapPicker
                  defaultLocation={
                    form.latitude && form.longitude
                      ? { lat: Number(form.latitude), lng: Number(form.longitude) }
                      : null
                  }
                  onSelectLocation={handleLocationSelect}
                  editable
                />
              </div>

              <p className="text-sm text-gray-500 mt-2">
                Selected: {form.latitude}, {form.longitude}
              </p>
            </div>
          </div>

          {/* LOGO */}
          <LogoUploadSection form={form} handleChange={handleChange} />


          {/* SALON IMAGES */}
          <SalonImagesSection
            form={form}
            handleChange={handleChange}
            id={id}
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(form)}
            disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save"
            )}
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

  const [servicesData, setServicesData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState(null);
  const [isDeleteServiceModalOpen, setIsDeleteServiceModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const API = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    dispatch(fetchServiceCategories())
      .unwrap()
      .then((res) => {
        setCategories([
          { id: "all", name: "All" },
          ...res.map((cat) => ({
            id: cat.id,
            name: cat.name,
          })),
        ]);
      })
      .catch((err) => console.error(err));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      getStoreServices({
        id,
        category_id: selectedCategory !== "all" ? selectedCategory : null,
      })
    )
      .unwrap()
      .then((res) => {
        console.log("API Response:", res);

        // 🔥 ALWAYS FORCE ARRAY
        if (Array.isArray(res)) {
          setServicesData(res);
        } else if (Array.isArray(res.services)) {
          setServicesData(res.services);
        } else {
          setServicesData([]);
        }
      })
      .catch((err) => console.error(err));

  }, [dispatch, id, selectedCategory]);

  //console.log('Services Data: ', servicesData);

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

  const handleDeleteService = (serviceId) => {
    setDeleteServiceId(serviceId);
    setIsDeleteServiceModalOpen(true);
  };
 
  const handleConfirmDeleteService = async () => {
    if (!deleteServiceId) return;
 
    setIsDeleting(true);
    try {
      await dispatch(deleteService(deleteServiceId)).unwrap();
 
      alert("Service deleted successfully ✅");
      
      setServicesData(prev => 
        prev.filter(service => service.id !== deleteServiceId)
      );
      
      setIsDeleteServiceModalOpen(false);
      setDeleteServiceId(null);
    } catch (error) {
      console.error("Delete service error:", error);
      alert(error || "Failed to delete service. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
 
  const handleCancelDeleteService = () => {
    setIsDeleteServiceModalOpen(false);
    setDeleteServiceId(null);
  };

  const urlToFile1 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();

    let fileName = url.split("/").pop().split("?")[0];

    const disposition = res.headers.get("content-disposition");
    if (disposition && disposition.includes("filename=")) {
      fileName = disposition.split("filename=")[1].replace(/"/g, "");
    }

    if (!fileName.includes(".")) {
      const ext = blob.type.split("/")[1] || "jpg";
      fileName = `file.${ext}`;
    }

    return new File([blob], fileName, {
      type: blob.type,
    });
  };

  const fetchWithFallback = async (img) => {
    try {
      const s3Url = `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${id}/images/${img}`;
      const res = await fetch(s3Url);

      if (!res.ok) throw new Error("S3 failed");

      return await urlToFile(s3Url, img);
    } catch {
      const localUrl = `${API}/images/${img}`;
      return await urlToFile(localUrl, img);
    }
  };

  const urlToFile = async (url, filename) => {
    const res = await fetch(url);
    const blob = await res.blob();

    return new File([blob], filename, {
      type: blob.type,
    });
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      // debugger;
      setSaving(true);
      console.log('handling save', updatedData);
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
      formData.append("servicesProvidedFor", JSON.stringify(updatedData.servicesProvidedFor));
      formData.append("languages", JSON.stringify(updatedData.languages));
      formData.append("isPremium", updatedData.isPremium);

      // -----------------------------
      // LOGO HANDLING
      // -----------------------------

      // New logo uploaded
      if (updatedData.logo instanceof File) {
        formData.append("logo", updatedData.logo);
      }

      // Logo removed
      if (!updatedData.logo && updatedData.newLogoAdded) {
        formData.append("removeLogo", "true");
      }

      // Keep existing logo
      if (typeof updatedData.logo === "string") {
        formData.append("oldLogo", updatedData.logo);
      }


      // -----------------------------
      // IMAGE HANDLING
      // -----------------------------

      const oldImages = [];
      const newImages = [];

      (updatedData.images || []).forEach((img) => {
        if (img instanceof File) {
          newImages.push(img);
        } else {
          oldImages.push(img);
        }
      });

      const oldFiles = await Promise.all(
        oldImages.map((img) => fetchWithFallback(img))
      );

      // ✅ send old images as JSON
      oldFiles.forEach((file) => {
        console.log("File Info:", {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        formData.append("images", file);
      });

      // ✅ send full files (already correct)
      newImages.forEach((file) => {
        formData.append("images", file);
      });

      console.log('formdata: ', formData)

      await dispatch(updatePartnerDetail(formData)).unwrap();

      alert("Partner Updated Successfully ✅");
      dispatch(getPartnerDetail({ id }));
      setShowEditModal(false);
    } catch (err) {
      alert("Failed to save changes. Please try again.");
    }
    finally {
      setSaving(false);
    }
  };

  const filteredServices = selectedCategory
    ? servicesData.filter(
      (service) => service.service_category === selectedCategory
    )
    : servicesData;

  const today = new Date();

  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - today.getDay());

  const [weekStart, setWeekStart] = useState(startOfCurrentWeek);

  const getMonthDays = (month, year) => {
    const days = [];
    const today = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);

      days.push({
        date: d,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        number: i,
        day: d.toLocaleDateString("en-US", { weekday: "long" }),
        full: d.toISOString().split("T")[0],
        isPast: d < todayStart,
        isToday: d.toDateString() === today.toDateString()
      });
    }

    return days;
  };

  const getWeekDays = (startDate) => {
    const days = [];
    const today = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {

      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      days.push({
        date: d,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        number: d.getDate(),
        day: d.toLocaleDateString("en-US", { weekday: "long" }),
        full: d.toISOString().split("T")[0],
        isPast: d < todayStart,
        isToday: d.toDateString() === today.toDateString()
      });

    }

    return days;
  };

  const days = useMemo(() => {
    return getWeekDays(weekStart);
  }, [weekStart]);

  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (days.length > 0) {
      setSelectedDate(days.find(d => !d.isPast) || days[0]);
    }
  }, [days]);



  const [selectedSlots, setSelectedSlots] = useState([]);

  const formatTime = (t) =>
    new Date(`1970-01-01T${t}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

  const toggleSelectSlot = (id) => {
    setSelectedSlots((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
    );
  };

  const toggleSlot = async (slot) => {

    const action = slot.status === "active" ? "block" : "unblock";
    const updatedStatus = action === "block" ? "blocked" : "active";

    try {

      await dispatch(
        BlockAndUnblockSlot({
          storeId: id,
          slotId: slot.id,
          status: action,
          date: selectedDate.full
        })
      ).unwrap();

      setData(prev => ({
        ...prev,
        timeslots: prev.timeslots.map(s =>
          s.id === slot.id
            ? { ...s, status: updatedStatus }
            : s
        )
      }));

    } catch (err) {
      alert("Failed to update slot");
    }
  };

  const blockSelectedSlots = async () => {

    try {

      await Promise.all(
        selectedSlots.map(id =>
          dispatch(
            BlockAndUnblockSlot({
              storeId: id,
              slotId: id,
              status: "block",
              date: selectedDate.full
            })
          ).unwrap()
        )
      );

      setData(prev => ({
        ...prev,
        timeslots: prev.timeslots.map(slot =>
          selectedSlots.includes(slot.id)
            ? { ...slot, status: "blocked" }
            : slot
        )
      }));

      setSelectedSlots([]);

    } catch {
      alert("Failed to block slots");
    }
  };

  const unblockSelectedSlots = async () => {

    try {

      await Promise.all(
        selectedSlots.map(id =>
          dispatch(
            BlockAndUnblockSlot({
              storeId: id,
              slotId: id,
              status: "unblock",
              date: selectedDate.full
            })
          ).unwrap()
        )
      );

      setData(prev => ({
        ...prev,
        timeslots: prev.timeslots.map(slot =>
          selectedSlots.includes(slot.id)
            ? { ...slot, status: "active" }
            : slot
        )
      }));

      setSelectedSlots([]);

    } catch {
      alert("Failed to unblock slots");
    }
  };


  const cleanLogo = (logo) => {
    if (!logo) return null;
    return logo.replace(/^"+|"+$/g, ""); // remove extra quotes
  };

  useEffect(() => {
    if (!selectedDate) return;

    dispatch(
      getBlockedSlots({
        storeId: id,
        date: selectedDate.full
      })
    )
      .unwrap()
      .then((blockedSlots) => {
        console.log("Blocked slots for", selectedDate.full, blockedSlots);
        const blockedIds = (blockedSlots || []).map(s => s.slot_id);

        setData(prev => ({
          ...prev,
          timeslots: (prev.timeslots || []).map(slot => ({
            ...slot,
            status: blockedIds.includes(slot.id) ? "blocked" : "active"
          }))
        }));

      })
      .catch(() => {
        console.log("Failed to fetch blocked slots");
      });

  }, [selectedDate, id, dispatch]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isPastSelectedDate =
    selectedDate?.date < todayStart;

  const isPastTimeSlot = (slotTime) => {

    if (!selectedDate) return false;
    if (!selectedDate.isToday) return false;

    const now = new Date();

    const [hour, minute] = slotTime.split(":");

    const slotDate = new Date();

    slotDate.setHours(Number(hour));
    slotDate.setMinutes(Number(minute));
    slotDate.setSeconds(0);
    slotDate.setMilliseconds(0);

    return slotDate <= now;

  };



  const isSlotDisabled = (slot) =>
    slot.status !== "active" ||
    isPastSelectedDate ||
    isPastTimeSlot(slot.from);

  const handleGenerateDefaultSlots = async () => {
    try {

      await dispatch(generateDefaultSlots(id)).unwrap();

      alert("Default slots created successfully");

    } catch (err) {
      console.error(err);
      alert("Failed to create slots");
    }
  };

  const slotsData = useMemo(() => {
    return data?.timeslots || [];
  }, [data?.timeslots]);

  const availableSlots = slotsData
    ?.filter(slot => selectedDate && slot.day === selectedDate.day);

  const hasActiveSlots = availableSlots?.some(
    slot => slot.status === "active"
  );

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

                    {/* LOGO */}
                    {data?.store_details?.logo && (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500 shadow">
                        <img
                          src={`${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${id}/logo/${cleanLogo(data.store_details.logo)}`}
                          alt="logo"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target;

                            if (!target.dataset.fallback) {
                              target.dataset.fallback = "true";
                              target.src = `${import.meta.env.VITE_API_BASE_URL}/images/${cleanLogo(data.store_details.logo)}`;
                            } else {
                              target.src = `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`;
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* IMAGE SLIDER */}
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
                                src={
                                  img instanceof File
                                    ? URL.createObjectURL(img)
                                    : img
                                      ? `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${id}/images/${img}`
                                      : `${import.meta.env.VITE_API_BASE_URL}/images/${img}`
                                }
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



                  <div className="grid grid-cols-2 sm:flex gap-2 mt-4 sm:mt-0">

                    {data?.store_details?.is_premium && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                        ⭐ Premium Partner
                      </span>
                    )}
                    <span
                      className={`
                      px-3 py-1 rounded-full text-sm font-medium
                      flex items-center justify-center
                      ${getStatusColor(data?.store_details?.status)}
                    `}
                    >
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

                    <p><span className="font-bold">Income:</span> ₹{data?.store_details?.income}</p>

                    <p>
                      <span className="font-bold">Services For:</span>{" "}
                      {data?.store_details?.services_provided_for?.length
                        ? data.servicesProvidedFor.join(", ")
                        : "N/A"}
                    </p>

                    <p>
                      <span className="font-bold">Languages:</span>{" "}
                      {data?.languages?.length
                        ? data.languages.join(", ")
                        : "N/A"}
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
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-300">
                <div className="flex justify-end mb-3">
                  <button
                    onClick={handleGenerateDefaultSlots}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
                  >
                    Generate Default Slots
                  </button>
                </div>
                {/* MONTH HEADER */}
                <div className="flex items-center justify-center gap-6 mb-4">

                  <button
                    onClick={() => {
                      const prev = new Date(weekStart);
                      prev.setDate(prev.getDate() - 7);
                      setWeekStart(prev);
                    }}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    ◀
                  </button>

                  <h2 className="text-lg font-semibold">
                    Week of {weekStart.toLocaleDateString()}
                  </h2>

                  <button
                    onClick={() => {
                      const next = new Date(weekStart);
                      next.setDate(next.getDate() + 7);
                      setWeekStart(next);
                    }}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    ▶
                  </button>

                </div>
                {/* DATE STRIP */}
                <div className="
  flex gap-2 mb-4 px-2 w-full
  overflow-x-auto no-scrollbar
  justify-start md:justify-center
">
                  {days.map((d) => (
                    <button
                      key={d.full}
                      disabled={d.isPast}
                      onClick={() => setSelectedDate(d)}
                      className={`flex flex-col items-center justify-center 
      min-w-[70px] flex-shrink-0 px-3 py-2 rounded-xl border transition
      ${d.isPast
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : selectedDate?.full === d.full
                            ? "bg-teal-600 text-white border-teal-600 shadow-md"
                            : d.isToday
                              ? "border-teal-500 text-teal-600 font-semibold"
                              : "border-gray-300 hover:bg-gray-100"
                        }`}
                    >
                      <span className="text-xs leading-none">{d.label}</span>
                      <span className="text-lg font-semibold leading-none">{d.number}</span>

                      {d.isToday && (
                        <span className="text-[10px] text-teal-600 leading-none">
                          Today
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {/* SELECTED DAY */}
                <h2 className="text-center text-lg font-semibold mb-4">
                  {selectedDate?.day}
                </h2>


                {/* SLOTS GRID */}
                {selectedSlots.length > 0 && (
                  <div className="flex justify-center gap-3 mb-4">

                    <button
                      onClick={blockSelectedSlots}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
                    >
                      Block ({selectedSlots.length})
                    </button>

                    <button
                      onClick={unblockSelectedSlots}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600"
                    >
                      Unblock ({selectedSlots.length})
                    </button>

                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto">

                  {slotsData
                    ?.filter(slot => selectedDate && slot.day === selectedDate.day)
                    ?.sort((a, b) => a.from.localeCompare(b.from))
                    ?.map((slot) => (

                      <div key={slot.id} className="relative group">

                        <button
                          disabled={slot.status === "blocked" || isSlotDisabled(slot)}
                          onClick={() => toggleSelectSlot(slot.id)}
                          className={`w-full py-3 rounded-full border text-sm font-medium transition

                          ${isSlotDisabled(slot)
                              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                              : selectedSlots.includes(slot.id)
                                ? "bg-teal-600 text-white border-teal-600"
                                : "border-teal-500 hover:bg-teal-50"
                            }`}
                        >
                          {formatTime(slot.from)} - {formatTime(slot.to)}
                        </button>

                        {/* Show Block/Unblock ONLY for active slots */}
                        {!isPastSelectedDate && (
                          <button
                            onClick={() => toggleSlot(slot)}
                            className="absolute top-1 right-2 text-xs bg-white px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition"
                          >
                            {slot.status === "active" ? "Block" : "Unblock"}
                          </button>
                        )}
                      </div>

                    ))}

                  {!hasActiveSlots && (
                    <div className="col-span-full text-center text-gray-400 py-10">
                      No available slots for this day
                    </div>
                  )}

                </div>

              </div>

              {/* EDIT SERVICES */}
              {/* SERVICES */}
              <div className="p-4">
                <p className="mb-2 font-semibold">Services</p>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-2 bg-black hover:bg-neutral-800 text-white flex gap-2 mb-3"
                >
                  <Plus /> Add Service
                </button>

                {/* CATEGORY TABS */}
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium transition ${selectedCategory === cat.id
                        ? "bg-black text-white shadow-md"
                        : "bg-gray-200 hover:bg-gray-300"
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* SERVICES TABLE */}
                <div className="max-h-72 overflow-y-auto rounded-lg">
                  {servicesData.length > 0 ? (
                    <table className="min-w-full text-sm border-collapse">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                          <th className="px-4 py-2 text-left border-b">Service</th>
                          <th className="px-4 py-2 text-left border-b">Amount</th>
                          <th className="px-4 py-2 text-left border-b">
                            Discounted Amount
                          </th>
                          <th className="px-4 py-2 text-left border-b">Duration</th>
                          <th className="px-4 py-2 text-left border-b">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {servicesData.map((item, index) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-neutral-200 cursor-pointer ${index % 2 === 0 ? "bg-neutral-100" : "bg-white"
                              }`}
                            onClick={() => {
                              setServiceId(item.id);
                              setServiceData(item);
                              setShowUpdateModal(true);
                            }}
                          >
                            <td className="border-x border-neutral-200 px-4 py-2">
                              {item.service_name}
                            </td>
                            <td className="border-x border-neutral-200 px-4 py-2">
                              ₹{item.amount}
                            </td>
                            <td className="border-x border-neutral-200 px-4 py-2">
                              ₹{item.discounted_amount}
                            </td>
                            <td className="border-x border-neutral-200 px-4 py-2">
                              {item.duration}
                            </td>
                            <td className="border-x border-neutral-200 px-4 py-2">
                              {/* DELETE BUTTON */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteService(item.id);
                                }}
                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No services available in this category.
                    </p>
                  )}
                </div>

                {showCreateModal && (
                  <CreateServiceModal
                    setShowModal={setShowCreateModal}
                    storeId={id}
                  />
                )}

                {showUpdateModal && (
                  <EditServiceModal
                    setShowModal={setShowUpdateModal}
                    storeId={id}
                    serviceId={serviceId}
                    serviceData={serviceData}
                  />
                )}
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

      {isDeleteServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
 
            <h3 className="text-lg font-semibold text-center text-gray-900">
              Delete Service?
            </h3>
 
            <p className="text-sm text-gray-600 text-center">
              Are you sure you want to delete this service? This action cannot be undone.
            </p>
 
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCancelDeleteService}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
 
              <button
                onClick={handleConfirmDeleteService}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        saving={saving}
      />
    </div>
  );
};

export default PartnerDetails;
