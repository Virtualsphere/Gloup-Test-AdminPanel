import React, { useEffect, useState, useCallback, memo, use } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useDispatch } from "react-redux";
import { createPartner, getLanguageList, getServiceProvidedForOptions } from "../../redux/slices/partnersSlice";
import { useNavigate } from "react-router-dom";
import MapPicker from "./MapPicker";
import { Toaster, toast } from "react-hot-toast";
import { useRef } from "react";
import { get } from "react-hook-form";

/* -------------------- Reusable Input -------------------- */
const Input = memo(
  ({ label, name, value, error, onChange, type = "text", disabled = false, showToggle, onToggle, className = "", maxLength, }) => {
    //console.log("Password toggle state:", showPassword);
    //console.log("Input props:", props);
    return (
      <div>
        <label className="text-sm text-gray-600">{label}</label>
        <div className="relative">
          <input
            name={name}
            type={type}
            value={value ?? ""}
            disabled={disabled}
            onChange={onChange}
            maxLength={maxLength}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm
              ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
              ${error ? "border-red-500" : "border-gray-300"}
              ${showToggle ? "pr-10" : ""}
              ${className}`}
          />
          {/* 👁 Eye icon */}
          {showToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {type === "password" ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);
/* -------------------- Main Component -------------------- */
const CreatePartner = () => {
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [languageOptions, setLanguageOptions] = useState([]);
  const [servicesProvidedFor, setServicesProvidedFor] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category_id: "null",
    deviceId: ["fvSaLo4fTfKg15N_1zHDT4:APA91bFfvqY749XGErflelYec8dzjN07ys9nITHCpEotOOV51J6XHsRhqOZCppjMMAPLixi3oayxf15CGK8l9wfrObI-FxQui1v6zSEwmxUd8RF6sjhhzrk"],
    store_type: "",
    password: "",
    bank_account_holder: "",
    income: "",
    description: "",
    images: [],
    addressLine1: "",
    addressLine2: "",
    area: "",
    city: "",
    district: "",
    state: "",
    zipcode: "",
    landmark: "",
    latitude: "",
    longitude: "",
    radius: "",
    status: "active",
    logo: null,
    servicesProvidedFor: [],
    isPremium: false,
    languages: [],
  });

  /* -------------------- Handlers -------------------- */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    if (name === "phone" && !/^\d*$/.test(value)) return;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

 

 useEffect(() => {
    dispatch(getLanguageList()).then((res) => {
      if (res.payload) {
        setLanguageOptions(res.payload);
      }
    });
  }, [dispatch]);

  useEffect(() => {
    dispatch(getServiceProvidedForOptions()).then((res) => {
      if (res.payload) {
        setServicesProvidedFor(res.payload);
      }
    });
  }, [dispatch]);

  const MAX_IMAGES = 4;
  const handleImageChange = (e) => {
    debugger;
    const files = Array.from(e.target.files);

    const allowedTypes = ["image/jpeg", "image/png"];

    const validFiles = [];
    const previews = [];

    for (let file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: "Only JPG and PNG images are allowed",
        }));
        continue;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }

    if (files.length > MAX_IMAGES) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images only`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrors((prev) => ({ ...prev, images: null }));

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...validFiles],
    }));

    setPreviews((prev) => [...prev, ...previews]);
  };


  const handleLocationSelect = (location) => {
    console.log("MAP LOCATION:", location);

    setForm((prev) => ({
      ...prev,
      latitude: location.lat.toFixed(6),
      longitude: location.lng.toFixed(6),
    }));
  };



  useEffect(() => {
    const urls = form.images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [form.images]);

  /* -------------------- Validation -------------------- */
  const validateForm = () => {
    const e = {};

    if (!form.name.trim()) e.name = "Salon name is required";
    if (!form.store_type.trim()) e.store_type = "Store type is required";

    if (!form.email) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      e.email = "Invalid email format";

    if (!/^\d{10}$/.test(form.phone))
      e.phone = "Phone must be 10 digits";

    if (!form.password || form.password.length < 6)
      e.password = "Password must be at least 6 characters";

    if (!form.addressLine1) e.addressLine1 = "Address is required";
    if (!form.city) e.city = "City is required";
    if (!form.area) e.area = "Area is required";
    if (!form.district) e.district = "District is required";

    if (!form.latitude || form.latitude < -90 || form.latitude > 90)
      e.latitude = "Latitude must be between -90 and 90";

    if (!form.longitude || form.longitude < -180 || form.longitude > 180)
      e.longitude = "Longitude must be between -180 and 180";

    if (!form.radius || form.radius <= 0)
      e.radius = "Radius must be greater than 0";

    if (form.images.length === 0)
      e.images = "At least one image is required";

    if (form.images.length > 4) {
      e.images = "Maximum 4 images allowed";
      return;
    }

    if (!form.servicesProvidedFor.length)
      e.servicesProvidedFor = "Select at least one service type";

    if (!form.languages.length)
      e.languages = "Select at least one language";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };


  /* -------------------- Submit -------------------- */
  const handleCreate = async () => {
  if (!validateForm()) {
    toast.error("Please fix validation errors");
    return;
  }

  try {
    const fd = new FormData();

    // --------------------------------
    // 1️⃣ Append normal fields only
    // --------------------------------
    Object.entries(form).forEach(([k, v]) => {
      if (
        k !== "images" &&
        k !== "logo" &&
        k !== "languages" &&
        k !== "servicesProvidedFor"
      ) {
        fd.append(k, v);
      }
    });

    // --------------------------------
    // 2️⃣ Location
    // --------------------------------
    fd.append("location", `${form.longitude},${form.latitude}`);

    // --------------------------------
    // 3️⃣ Arrays as JSON
    // --------------------------------
    fd.append("languages", JSON.stringify(form.languages));
    fd.append(
      "servicesProvidedFor",
      JSON.stringify(form.servicesProvidedFor)
    );

    // --------------------------------
    // 4️⃣ Images
    // --------------------------------
    form.images.forEach((img) => {
      fd.append("images", img);
    });

    // --------------------------------
    // 5️⃣ Logo (only once)
    // --------------------------------
    if (form.logo) {
      fd.append("logo", form.logo);
    }

    // --------------------------------
    // 6️⃣ API Call
    // --------------------------------
    const toastId = toast.loading("Creating partner...");
    await dispatch(createPartner(fd)).unwrap();

    toast.success("Partner created successfully 🎉", {
      id: toastId,
    });

    navigate("/partners");

  } catch (error) {
    toast.error(error?.message || "Failed to create partner");
  }
};

  const handleRemoveImage = (index) => {
    const updatedImages = form.images.filter((_, i) => i !== index);

    setForm((prev) => ({
      ...prev,
      images: updatedImages,
    }));

    setPreviews((prev) => prev.filter((_, i) => i !== index));

    // 🔥 Rebuild FileList
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      updatedImages.forEach((file) => dataTransfer.items.add(file));
      fileInputRef.current.files = dataTransfer.files;
    }
  };




  /* -------------------- UI -------------------- */
  return (
    <div className="max-w-8xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Create Partner</h2>

      {/* BASIC INFO */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Basic Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Partner Name" name="name" value={form.name} error={errors.name} onChange={handleChange} />
          <Input label="Partner Type" name="store_type" value={form.store_type} error={errors.store_type} onChange={handleChange} />
          <Input label="Email" name="email" value={form.email} error={errors.email} onChange={handleChange} />
          <Input label="Phone" name="phone" maxLength={10} value={form.phone} error={errors.phone} onChange={handleChange} />
          <Input label="Password" name="password" type={showPassword ? "text" : "password"} value={form.password} error={errors.password} onChange={handleChange} showToggle onToggle={() => setShowPassword((prev) => !prev)} />
          <Input label="Bank Account Holder" name="bank_account_holder" value={form.bank_account_holder} onChange={handleChange} />
        </div>
      </section>

      {/* BUSINESS */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Business Details</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Income" name="income" value={form.income} onChange={handleChange} />
          <Input label="Service Radius (km)" name="radius" value={form.radius} error={errors.radius} onChange={handleChange} />
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">
              Description
            </label>

            <textarea
              rows="3"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm resize-none
      ${errors.description ? "border-red-500" : "border-gray-300"}
    `}
              placeholder="Enter salon description..."
            />

            {/* Character Counter */}
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-xs text-red-500">
                  {errors.description}
                </p>
              ) : (
                <span />
              )}

              <p className="text-xs text-gray-400">
                {form.description.length}/500
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SALON SETTINGS */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Salon Settings</h4>

        <div className="grid md:grid-cols-2 gap-4">

          {/* Services Provided For */}
           <div>
            <label className="text-sm text-gray-600 mb-2 block">
              Services Provided For
            </label>

            <div className="flex flex-wrap gap-2">
              {servicesProvidedFor.map((type) => {
                const selected = form.servicesProvidedFor.includes(type.id);

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        servicesProvidedFor: selected
                          ? prev.servicesProvidedFor.filter((t) => t !== type.id)
                          : [...prev.servicesProvidedFor, type.id],
                      }));
                    }}
                    className={`px-4 py-2 rounded-full text-sm border transition
                    ${
                      selected
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {type.name}
                  </button>
                );
              })}
            </div>

            {errors.servicesProvidedFor && (
              <p className="text-xs text-red-500 mt-1">
                {errors.servicesProvidedFor}
              </p>
            )}
          </div>
          {/* Premium Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">
              Premium Salon
            </label>

            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  isPremium: !prev.isPremium,
                }))
              }
              className={`w-12 h-6 flex items-center rounded-full p-1 transition
      ${form.isPremium ? "bg-indigo-600" : "bg-gray-300"}`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition
        ${form.isPremium ? "translate-x-6" : ""}`}
              />
            </button>
          </div>

          {/* Languages */}
          <div className="md:col-span-2">
              <label className="text-sm text-gray-600 mb-2 block">
                Languages Known
              </label>

              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => {
                  const selected = form.languages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          languages: selected
                            ? prev.languages.filter((l) => l !== lang.id)
                            : [...prev.languages, lang.id],
                        }));
                      }}
                      className={`px-4 py-2 rounded-full text-sm border transition
                      ${
                        selected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {lang.name}
                    </button>
                  );
                })}
              </div>

              {errors.languages && (
                <p className="text-xs text-red-500 mt-1">{errors.languages}</p>
              )}
          </div>
        </div>
      </section>

      {/* ADDRESS */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Address</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Address Line 1" name="addressLine1" value={form.addressLine1} error={errors.addressLine1} onChange={handleChange} />
          <Input label="Area" name="area" value={form.area} onChange={handleChange} />
          <Input label="City" name="city" value={form.city} error={errors.city} onChange={handleChange} />
          <Input label="District" name="district" value={form.district} onChange={handleChange} />
          <Input label="State" name="state" value={form.state} error={errors.state} onChange={handleChange} />
          <Input label="Zipcode" name="zipcode" value={form.zipcode} onChange={handleChange} />
          <Input label="Landmark" name="landmark" value={form.landmark} onChange={handleChange} />
        </div>
      </section>

      {/* LOCATION */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Location</h4>

        <MapPicker
          defaultLocation={
            form.latitude && form.longitude
              ? { lat: Number(form.latitude), lng: Number(form.longitude) }
              : null
          }
          onSelectLocation={handleLocationSelect}
          editable={true}
        />


        <div className="grid grid-cols-2 gap-4 mt-4">
          <Input
            label="Latitude"
            name="latitude"
            value={String(form.latitude)}
            error={errors.latitude}
            onChange={handleChange}
            disabled
          />
          <Input
            label="Longitude"
            name="longitude"
            value={String(form.longitude)}
            error={errors.longitude}
            onChange={handleChange}
            disabled
          />
        </div>
      </section>


      {/* IMAGES */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Salon Images</h4>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg, image/png"
          onChange={handleImageChange}
        />
        <p className="text-xs text-gray-500 mt-1">
          Only <strong>4 images</strong> allowed in <strong>JPG / PNG</strong> format
        </p>
        <div className="flex gap-3 mt-4 flex-wrap">
          {previews.map((src, i) => (
            <div
              key={i}
              className="relative w-20 h-20 rounded border overflow-hidden group"
            >
              <img
                src={src}
                alt={`preview-${i}`}
                className="w-full h-full object-cover"
              />

              {/* ❌ Delete Button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {errors.images && (
          <p className="text-xs text-red-500 mt-2">{errors.images}</p>
        )}
      </section>

      {/* LOGO */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Salon Logo</h4>

        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              logo: e.target.files[0],
            }))
          }
        />

        {form.logo && (
          <div className="relative mt-3 w-24 h-24 border rounded overflow-hidden">
            <img
              src={URL.createObjectURL(form.logo)}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  logo: null,
                }))
              }
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3">
        <button onClick={() => navigate("/partners")} className="px-5 py-2 border rounded-lg">
          Cancel
        </button>
        <button onClick={handleCreate} className="px-5 py-2 bg-indigo-600 text-white rounded-lg">
          Create Partner
        </button>
      </div>
    </div>
  );
};

export default CreatePartner;
