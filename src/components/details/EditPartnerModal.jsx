import React, { useState, useEffect } from "react";
import { XCircle, Upload, Trash2, AlertCircle } from "lucide-react";
import MapPicker from "../../components/MapPicker";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

const EditPartnerModal = ({ isOpen, onClose, partnerData, onSave }) => {

  console.log("partnerData in EditPartnerModal:", partnerData);

  const store = partnerData?.store_details || {};

  const [form, setForm] = useState({
    name: "",
    city: "",
    addressLine1: "",
    area: "",
    district: "",
    state: "",
    zipcode: "",
    radius: "",
    status: "pending",
    latitude: "",
    longitude: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* -------------------- Prefill -------------------- */
  useEffect(() => {
    if (!isOpen) return;

    setForm({
      name: store.name || "",
      city: store.city || "",
      addressLine1: store.addressLine1 || "",
      area: store.area || "",
      district: store.district || "",
      state: store.state || "",
      zipcode: store.zipcode || "",
      radius: store.radius || "",
      status: store.status || "pending",
      latitude: store.latitude || "",
      longitude: store.longitude || "",
    });

    if (store.images?.length) {
      setPreviewUrl(
        `${import.meta.env.VITE_API_BASE_URL}/images/${store.images[0]}`
      );
    }

    setImageFile(null);
    setError("");
  }, [isOpen, partnerData]);

  /* -------------------- Handlers -------------------- */
  const handleChange = (k, v) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleLocationSelect = (loc) => {
    setForm((p) => ({
      ...p,
      latitude: loc.lat.toFixed(6),
      longitude: loc.lng.toFixed(6),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.city) {
      setError("Name and City are required");
      return;
    }

    if (form.latitude && form.longitude) {
      setError(" Please select a valid location on the map");
      return;
    }

    if (isNaN(Number(form.radius)) || Number(form.radius) <= 0) {
      setError("Radius must be a positive number");
      return;
    }

    if(!form.addressLine1){
      setError("Address Line 1 is required");
      return;
    }

    if(!form.area){
      setError("Area is required");
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) =>
        fd.append(k, v ?? "")
      );

      if (imageFile) fd.append("image", imageFile);

      await onSave(fd);
      onClose();
    } catch (e) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start overflow-y-auto py-10 px-4">
  <div
    className="
      bg-white
      w-full
      max-w-5xl
      min-h-[60vh]
      max-h-[85vh]
      rounded-xl
      p-6
      space-y-4
      overflow-y-auto
    "
  >


        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Salon</h3>
          <button onClick={onClose}>
            <XCircle />
          </button>
        </div>

        {/* Image */}
        <div>
          <label className="text-sm font-medium">Salon Image</label>
          <div className="flex gap-4 mt-2">
            {previewUrl ? (
              <img src={previewUrl} className="w-24 h-24 rounded object-cover" />
            ) : (
              <div className="w-24 h-24 border-dashed border flex items-center justify-center">
                <Upload />
              </div>
            )}
            <input type="file" onChange={handleImageChange} />
          </div>
        </div>

        {/* Inputs */}
        <input
          className="input"
          placeholder="Salon Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />

        <input
          className="input"
          placeholder="City"
          value={form.city}
          onChange={(e) => handleChange("city", e.target.value)}
        />

        <input
          className="input"
          placeholder="Address"
          value={form.addressLine1}
          onChange={(e) => handleChange("addressLine1", e.target.value)}
        />

        <input
          className="input"
          placeholder="Area"
          value={form.area}
          onChange={(e) => handleChange("area", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            className="input"
            placeholder="Zipcode"
            value={form.zipcode}
            onChange={(e) => handleChange("zipcode", e.target.value)}
          />
          <input
            className="input"
            placeholder="Radius (km)"
            value={form.radius}
            onChange={(e) => handleChange("radius", e.target.value)}
          />
        </div>

        {/* Status */}
        <select
          className="input"
          value={form.status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Map */}
        <MapPicker
          defaultLocation={
            form.latitude && form.longitude
              ? { lat: Number(form.latitude), lng: Number(form.longitude) }
              : null
          }
          radiusKm={Number(form.radius)}
          onSelectLocation={handleLocationSelect}
          editable
        />

        {/* Errors */}
        {error && (
          <div className="text-red-600 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPartnerModal;
