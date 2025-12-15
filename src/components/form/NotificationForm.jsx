import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";

const NotificationForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  partnerOptions= []
}) => {
  // const [dropdownOpen, setDropdownOpen] = useState(false);
  //   const dropdownRef = useRef(null);
  //   useEffect(() => {
  //     const handleClickOutside = (event) => {
  //       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
  //         setDropdownOpen(false);
  //       }
  //     };
  //     document.addEventListener("mousedown", handleClickOutside);
  //     return () => document.removeEventListener("mousedown", handleClickOutside);
  //   }, []);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
    resetField,
   
  } = useForm({
    defaultValues: {
      notification_type: defaultValues.notification_type || "",  
      sent_to: defaultValues.sent_to || "",  
      title: defaultValues.title || "",  
      description: defaultValues.description || "",  
    },
  });

  const watchType = watch("notification_type");

   useEffect(() => {
    if (watchType === "subscription") {
      setValue("sent_to", "user");
    } else {
      resetField("sent_to"); // reset to empty if it's not subscription
    }
  }, [watchType, setValue, resetField]);

  const sentToOptions =
    watchType === "subscription"
      ? [{ value: "user", label: "User" }]
      : [
          { value: "all", label: "All" },
          { value: "user", label: "User" },
          { value: "store", label: "Partner" },
        ];

  const onFormSubmit = (data) => {
   
    const finalData = {
      ...data,
      id: defaultValues.id || null,
    };

    onSubmit(finalData);
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >

      {/* Notification Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Notification Type
              </label>
              <select
                {...register("notification_type", { required: "Notification Type is required" })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.notification_type
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Select Notification Type</option>
                <option value="general">General</option>
                <option value="subscription">Subscription</option>
              </select>
              {errors.notification_type && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.notification_type.message}
                </p>
              )}
            </div>

          {/* Store ID */}
        {watchType === "subscription" && (
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Partner
          </label>
          <select
            {...register("store_id", { required: "Partner is required" })}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.store_id
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          >
            <option value="">Select a partner</option>
            {partnerOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.label}
              </option>
            ))}
          </select>
          {errors.store_id && (
            <p className="mt-1 text-sm text-red-500">
              {errors.store_id.message}
            </p>
          )}
        </div>
      )}

                   
      {/* Sent To */}
       <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Sent To
              </label>
              <select
                {...register("sent_to", { required: "Sent To is required" })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.sent_to
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                  <option value="">Select Sent To</option>
                  {sentToOptions.map((option,index) => (
                  <option key={index} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.sent_to && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.sent_to.message}
                </p>
              )}
             </div>
      

      {/* Title */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          {...register("title", {
            required: "Title is required",
            minLength: { value: 3, message: "Minimum 3 characters" },
          })}
          placeholder="Enter Notification Title"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.title
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          placeholder="Describe the notification in detail"
          {...register("description", {
            required: "Description is required",
            minLength: { value: 10, message: "At least 10 characters" },
          })}
        
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.description
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          } text-gray-900`}
           rows={2}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">
            {errors.description.message}
            </p>
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
          {defaultValues.notification_type ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};

export default NotificationForm;

