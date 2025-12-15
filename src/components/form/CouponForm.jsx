import { useForm, Controller } from "react-hook-form";
import { Save, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
const CouponForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  
}) => {
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch
     } = useForm({
    defaultValues: {
      code:defaultValues.code || "",
      description:defaultValues.description || "",
      usage_limit:defaultValues.usage_limit ?? null,
      discount_type:defaultValues.discount_type || "",
      discount_value:defaultValues.discount_value ?? null,
      start_date:defaultValues.start_date || "",
      end_date: defaultValues.end_date ||"",
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
      {/* Code */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Code</label>
        <input
          type="text"
          {...register("code", {
            required: "Code is required",
            minLength: { value: 3, message: "Minimum 3 characters" },
          })}
          placeholder="Enter Code"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.code
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.code && (
          <p className="text-sm text-red-500 mt-1">{errors.code.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          placeholder="Describe the Coupon in detail"
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

      {/* Usage Limit */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
        <input
          type="number"
          {...register("usage_limit", {
            required: "Usage limit is required",
            min: { value: 1, message: "Usage limit must be at least 1" },
            // validate: (v) =>
            // Number.isInteger(v) || "Usage limit must be a whole number",
           setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="Enter Usage Limit"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.usage_limit
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.usage_limit && (
          <p className="text-sm text-red-500 mt-1">{errors.usage_limit.message}</p>
        )}
      </div>


      {/* Discount Type */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Discount Type
              </label>
              <select
                {...register("discount_type", { required: "Discount Type is required" })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.discount_type
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
              >
                <option value="">Select Discount Type</option>
                <option value="flat">Flat</option>
                <option value="percentage">Percentage</option>
              </select>
              {errors.discount_type && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.discount_type.message}
                </p>
              )}
            </div>

          {/* Discount Value */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Discount Value</label>
        <input
          type="number"
          {...register("discount_value", {
            required: "Discount Value is required",
            min: { value: 1, message: "Discount Value must be at least 1" },
           
           setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
          })}
          placeholder="Enter Discount Value"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.discount_value
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.discount_value && (
          <p className="text-sm text-red-500 mt-1">{errors.discount_value.message}</p>
        )}
      </div>

           {/* Start Date */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Start Date
        </label>
        <Controller
          control={control}
          name="start_date"
          rules={{ required: "Start date is required" }}
          render={({ field }) => (
            <DatePicker
              selected={field.value ? new Date(field.value) : null}
              onChange={(date) => {
                field.onChange(date ? format(date, "yyyy-MM-dd") : null);
              }}
              // onChange={(date) => {
              //   field.onChange(date?.toISOString().split("T")[0]); // sets "YYYY-MM-DD"
              // }}
              placeholderText="Pick start date"
              dateFormat="dd, MMMM, yyyy"
              minDate={new Date()} 
              
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.start_date
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
              calendarClassName="custom-datepicker"
            />
          )}
        />
        {errors.start_date && (
          <p className="mt-1 text-sm text-red-500">
            {errors.start_date.message}
          </p>
        )}
      </div>

      {/* End Date */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <Controller
            control={control}
            name="end_date"
            rules={{
              required: "End date is required",
              validate: (value) => {
                const start = watch("start_date");
                if (!start || !value) return true;
                const startDate = new Date(start);
                const endDate = new Date(value);
                if (endDate <= startDate) {
                  return "End date must be at least 1 day after start date";
                }
                return true;
              },
            }}
            render={({ field }) => (
              <DatePicker
                selected={field.value ? new Date(field.value) : null}
                onChange={(date) => {
                field.onChange(date ? format(date, "yyyy-MM-dd") : null);
              }}
                // onChange={(date) =>
                //   field.onChange(date?.toISOString().split("T")[0])
                // }
                placeholderText="Pick end date"
                dateFormat="dd, MMMM, yyyy"
                minDate={
                  watch("start_date")
                    ? new Date(new Date(watch("start_date")).getTime() + 86400000)
                    : new Date()
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.end_date
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-blue-500"
                }`}
                calendarClassName="custom-datepicker"
              />
            )}
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-500">
              {errors.end_date.message}
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
          {defaultValues.code ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};


export default CouponForm;

