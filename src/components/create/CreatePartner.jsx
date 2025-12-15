import React, { useState } from "react";
import { XCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import { createPartner } from "../../redux/slices/partnersSlice"; // <-- update name if needed
import { useNavigate } from "react-router-dom";

const CreatePartner = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    store_type: "",
    password: "",
    bank_account_holder: "",
    category_id: "null",
    deviceId: ["fvSaLo4fTfKg15N_1zHDT4:APA91bFfvqY749XGErflelYec8dzjN07ys9nITHCpEotOOV51J6XHsRhqOZCppjMMAPLixi3oayxf15CGK8l9wfrObI-FxQui1v6zSEwmxUd8RF6sjhhzrk"],
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
    radius: "",
    status: "inactive",
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e) => {
    const files = [...e.target.files];
    handleChange("images", files);
  };

  const handleCreate = async () => {
    try {
      const fd = new FormData();

      Object.keys(form).forEach((key) => {
        if (key !== "images") fd.append(key, form[key]);
      });

      // location → longitude,latitude
      fd.append("location", `${form.longitude},${form.latitude}`);

      // Images
      form.images.forEach((file) => {
        fd.append("images", file);
      });

      await dispatch(createPartner(fd)).unwrap();

      alert("Partner created successfully!");
      navigate("/partners");

    } catch (err) {
      alert("Failed to create partner");
      console.error(err);
    }
  };

  // Timeslot - default 30min slots from 9am to 9pm done.

  return (
    <div>
      <div className="relative w-full mx-auto p-6 max-h-full">

        <h3 className="text-xl font-semibold mb-5 text-gray-800 text-center">
          Create New Partner / Salon
        </h3>

        {/* Inputs */}
        {[
          "name", "email", "phone", "store_type", "password", "bank_account_holder", "income", "description",
          "addressLine1", "addressLine2", "area", "city", "district", "state",
           "zipcode", "landmark", "latitude", "longitude", "radius",
          "status"
        ].map((field) => (
          <div className="mb-4" key={field}>
            <label className="block text-sm font-medium text-gray-700 capitalize">
              {field}
            </label>
            <input
              type={field === "phone" ? "number" : "text"}
              value={form[field]}
              onChange={(e) => handleChange(field, e.target.value)}
              className="mt-1 block w-full bg-white border border-gray-300 px-3 py-2 rounded-md focus:ring-indigo-500"
            />
          </div>
        ))}

        {/* Images */}
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

        {/* Image Preview */}
        <div className="flex flex-wrap gap-2 mt-3">
          {form.images.map((file, i) => (
            <img
              key={i}
              src={URL.createObjectURL(file)}
              className="w-16 h-16 rounded-md object-cover border"
            />
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            onClick={() => navigate("/partners")}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Partner
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePartner;