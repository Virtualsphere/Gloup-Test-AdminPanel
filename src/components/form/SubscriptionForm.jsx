import { useForm, Controller } from "react-hook-form";
import { Save, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
const SubscriptionForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  
}) => {
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    
     } = useForm({
    defaultValues: {
      type:defaultValues.type || "",
      days:defaultValues.days ?? null,
      price:defaultValues.price ?? null,
      },
  });

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
       {/* Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                {...register("type", { required: "Type is required" })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.type
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Select Type</option>
                <option value="chairs">Chairs</option>
                <option value="range">Range</option>
                <option value="banner">Banner</option>
                <option value="notification">Notification</option>
              </select>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

      {/* days */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Days</label>
        <input
          type="number"
          {...register("days", {
            required: "Days is required",
            min: { value: 1, message: "Days must be at least 1" },
            
           setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="Enter Days"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.days
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.days && (
          <p className="text-sm text-red-500 mt-1">{errors.days.message}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Price</label>
        <input
          type="number"
          {...register("price", {
            required: "Price is required",
            min: { value: 1, message: "Price must be at least 1" },
            setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="Enter Price"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.price
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.price && (
          <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
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
          {defaultValues.type ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};


export default SubscriptionForm;

