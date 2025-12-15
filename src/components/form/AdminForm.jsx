import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";

const AdminForm = ({ onSubmit, onCancel, defaultValues = {} }) => {
  const isEditMode = Boolean(defaultValues?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      username: defaultValues.username || "",
      email: defaultValues.email || "",
      password: "",
      phone: defaultValues.phone || "",
    },
  });

  const onFormSubmit = (data) => {
    const trimmedData = {
      username: data.username.trim(),
      email: data.email.trim(),
      password: data.password,
      phone: data.phone.trim(),
      id: defaultValues.id || null,
    };

    onSubmit(trimmedData);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-md shadow"
    >
      {/* Username */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          type="text"
          {...register("username", {
            required: "Username is required",

            validate: (value) =>
              value.trim() !== "" || "Username cannot be only spaces",
          })}
          placeholder="Enter username"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.username
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.username && (
          <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^@]+@/,
              message: "Enter a valid email address",
            },
          })}
          placeholder="Enter email address"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.email
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Password{" "}
          {isEditMode && (
            <span className="text-gray-400">(leave blank to keep current)</span>
          )}
        </label>
        <input
          type="password"
          {...register("password", {
            required: !isEditMode && "Password is required",
            minLength: isEditMode
              ? {
                  value: 0,
                  message: "",
                }
              : {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
            validate: (value) =>
              isEditMode || value.trim().length >= 6 || "Minimum 6 characters",
          })}
          placeholder="Enter password"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.password
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          {...register("phone", {
            required: "Phone number is required",
            pattern: {
              value: /^[0-9]{10,15}$/,
              message: "Phone must be 10 to 15 digits",
            },
          })}
          placeholder="Enter phone number"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.phone
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.phone && (
          <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
        )}
      </div>

      {/* Buttons */}
      <div className="md:col-span-2 flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
        >
          <X size={16} className="mr-1" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center cursor-pointer px-4 py-2 bg-black hover:bg-black text-white rounded-md"
        >
          <Save size={16} className="mr-1" />
          {defaultValues.username ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};

export default AdminForm;
