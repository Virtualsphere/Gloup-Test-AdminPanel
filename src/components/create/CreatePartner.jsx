import React, { useEffect, useState, useCallback, memo } from "react";
import { useDispatch } from "react-redux";
import { createPartner } from "../../redux/slices/partnersSlice";
import { useNavigate } from "react-router-dom";
import MapPicker from "./MapPicker";


/* -------------------- Reusable Input -------------------- */
const Input = memo(
  ({ label, name, value, error, onChange, type = "text", disabled = false }) => {
    return (
      <div>
        <label className="text-sm text-gray-600">{label}</label>
        <input
          type={type}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(name, e.target.value)}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm
            ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
            ${error ? "border-red-500" : "border-gray-300"}`}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);



/* -------------------- Main Component -------------------- */
const CreatePartner = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [previews, setPreviews] = useState([]);

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
  });

  /* -------------------- Handlers -------------------- */
  const handleChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleImageChange = (e) => {
    setForm((prev) => ({ ...prev, images: Array.from(e.target.files) }));
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
    if (!form.state) e.state = "State is required";

    if (!form.latitude || form.latitude < -90 || form.latitude > 90)
      e.latitude = "Latitude must be between -90 and 90";

    if (!form.longitude || form.longitude < -180 || form.longitude > 180)
      e.longitude = "Longitude must be between -180 and 180";

    if (!form.radius || form.radius <= 0)
      e.radius = "Radius must be greater than 0";

    if (form.images.length === 0)
      e.images = "At least one image is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* -------------------- Submit -------------------- */
  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (k !== "images") fd.append(k, v);
      });

      fd.append("location", `${form.longitude},${form.latitude}`);
      form.images.forEach((img) => fd.append("images", img));

      await dispatch(createPartner(fd)).unwrap();
      alert("Partner created successfully");
      navigate("/partners");
    } catch {
      alert("Failed to create partner");
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">Create Partner / Salon</h2>

      {/* BASIC INFO */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Basic Information</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Salon Name" name="name" value={form.name} error={errors.name} onChange={handleChange} />
          <Input label="Store Type" name="store_type" value={form.store_type} error={errors.store_type} onChange={handleChange} />
          <Input label="Email" name="email" value={form.email} error={errors.email} onChange={handleChange} />
          <Input label="Phone" name="phone" value={form.phone} error={errors.phone} onChange={handleChange} />
          <Input label="Password" name="password" type="password" value={form.password} error={errors.password} onChange={handleChange} />
          <Input label="Bank Account Holder" name="bank_account_holder" value={form.bank_account_holder} onChange={handleChange} />
        </div>
      </section>

      {/* BUSINESS */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Business Details</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Income" name="income" value={form.income} onChange={handleChange} />
          <Input label="Service Radius (km)" name="radius" value={form.radius} error={errors.radius} onChange={handleChange} />
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="md:col-span-2 border rounded-lg px-3 py-2 text-sm"
            placeholder="Description"
          />
        </div>
      </section>

      {/* ADDRESS */}
      <section className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h4 className="mb-4 font-medium">Address</h4>
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Address Line 1" name="addressLine1" value={form.addressLine1} error={errors.addressLine1} onChange={handleChange} />
          <Input label="Address Line 2" name="addressLine2" value={form.addressLine2} onChange={handleChange} />
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
        <input type="file" multiple accept="image/*" onChange={handleImageChange} />
        <div className="flex gap-3 mt-3 flex-wrap">
          {previews.map((src, i) => (
            <img key={i} src={src} className="w-20 h-20 object-cover rounded border" />
          ))}
        </div>
        {errors.images && <p className="text-xs text-red-500 mt-2">{errors.images}</p>}
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
