import { useForm } from "react-hook-form";
import { Save, X, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { LOYALTY_TIERS } from "../../utils/loyalty";

const parseLoyaltyDefault = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const NotificationForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  partnerOptions = [],
  report = null,
  loyaltyCounts = null,
}) => {
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(defaultValues.image || "");
  const [loyaltySelected, setLoyaltySelected] = useState(
    parseLoyaltyDefault(defaultValues.loyalty_status)
  );

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
      image: defaultValues.image || "",
    },
  });

  const watchType = watch("notification_type");
  const watchSentTo = watch("sent_to");
  const watchImageUrl = watch("image");

  useEffect(() => {
    if (watchType === "subscription") {
      setValue("sent_to", "user");
      setLoyaltySelected([]);
    } else {
      resetField("sent_to");
    }
  }, [watchType, setValue, resetField]);

  useEffect(() => {
    if (loyaltySelected.length > 0 && watchSentTo !== "user") {
      setValue("sent_to", "user");
    }
  }, [loyaltySelected, watchSentTo, setValue]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const sentToOptions =
    watchType === "subscription"
      ? [{ value: "user", label: "User" }]
      : [
          { value: "all", label: "All" },
          { value: "user", label: "User" },
          { value: "store", label: "Partner" },
        ];

  const showLoyaltyFilter =
    watchType === "general" &&
    (watchSentTo === "user" || loyaltySelected.length > 0);

  const toggleLoyalty = (tier) => {
    setLoyaltySelected((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  const selectedAudienceCount = (() => {
    if (!loyaltyCounts?.tiers || loyaltySelected.length === 0) return null;
    return loyaltySelected.reduce(
      (sum, tier) => sum + (Number(loyaltyCounts.tiers[tier]) || 0),
      0
    );
  })();

  const handleFilePick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, WebP, etc.)");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      event.target.value = "";
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setImageFile(file);
    setPreviewUrl(objectUrl);
    setValue("image", "");
  };

  const clearPickedImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl(watchImageUrl || "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onFormSubmit = (data) => {
    const finalData = {
      ...data,
      id: defaultValues.id || null,
      imageFile: imageFile || null,
      loyalty_status:
        showLoyaltyFilter && loyaltySelected.length > 0
          ? loyaltySelected
          : undefined,
    };

    onSubmit(finalData);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl("");
    setLoyaltySelected([]);
    reset();
  };

  const displayPreview =
    previewUrl ||
    (watchImageUrl && String(watchImageUrl).startsWith("http")
      ? watchImageUrl
      : "");

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Notification Type
        </label>
        <select
          {...register("notification_type", {
            required: "Notification Type is required",
          })}
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

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Sent To</label>
        <select
          {...register("sent_to", { required: "Sent To is required" })}
          disabled={loyaltySelected.length > 0}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.sent_to
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          } disabled:bg-gray-100`}
        >
          <option value="">Select Sent To</option>
          {sentToOptions.map((option, index) => (
            <option key={index} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loyaltySelected.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Loyalty filter targets customers only (Sent To = User).
          </p>
        )}
        {errors.sent_to && (
          <p className="text-sm text-red-500 mt-1">{errors.sent_to.message}</p>
        )}
      </div>

      {showLoyaltyFilter && (
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Loyalty audience{" "}
            <span className="text-gray-400 text-xs font-normal">
              (optional — leave empty to notify all users)
            </span>
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Based on paid booking count: new → first booking → repeat → loyal →
            VIP.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {LOYALTY_TIERS.map((tier) => {
              const checked = loyaltySelected.includes(tier.value);
              const count = loyaltyCounts?.tiers?.[tier.value];
              return (
                <label
                  key={tier.value}
                  className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    checked
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLoyalty(tier.value)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {tier.label}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 pl-6">
                    {tier.description}
                    {typeof count === "number" ? ` · ${count} users` : ""}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedAudienceCount != null && (
            <p className="text-sm text-gray-600 mt-2">
              Selected audience:{" "}
              <span className="font-semibold">{selectedAudienceCount}</span>{" "}
              active user
              {selectedAudienceCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}

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

      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
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

      <div className="flex flex-col md:col-span-2 gap-3">
        <label className="text-sm font-medium text-gray-700">
          Notification Image{" "}
          <span className="text-gray-400 text-xs">(optional)</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <ImagePlus size={16} />
            Pick from device
          </button>
          {(imageFile || displayPreview) && (
            <button
              type="button"
              onClick={clearPickedImage}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50"
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
          {imageFile && (
            <span className="text-sm text-gray-500 truncate max-w-xs">
              {imageFile.name}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">
            Or paste an image URL
          </label>
          <input
            type="url"
            {...register("image", {
              onChange: (e) => {
                if (!imageFile) {
                  setPreviewUrl(e.target.value || "");
                }
              },
            })}
            placeholder="https://example.com/image.jpg"
            disabled={!!imageFile}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>

        {displayPreview ? (
          <div className="mt-1">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <img
              src={displayPreview}
              alt="Notification preview"
              className="max-h-48 rounded-md border border-gray-200 object-contain bg-gray-50"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : null}
      </div>

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

      {report && (
        <div className="mt-6 border rounded-md p-4 bg-gray-50 md:col-span-2">
          <h3 className="text-lg font-semibold mb-3">Notification Report</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded">
              <p>Total Sent</p>
              <p className="font-bold">{report.total_sent}</p>
            </div>

            <div className="p-3 bg-green-100 rounded">
              <p>Success</p>
              <p className="font-bold text-green-700">{report.success_count}</p>
            </div>

            <div className="p-3 bg-red-100 rounded">
              <p>Failed</p>
              <p className="font-bold text-red-700">{report.failed_count}</p>
            </div>
          </div>

          {report.failed_details?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Failed Details</h4>
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 border">User ID</th>
                    <th className="p-2 border">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {report.failed_details.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2 border">{item.user_id}</td>
                      <td className="p-2 border text-red-600">
                        {item.error_code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </form>
  );
};

export default NotificationForm;
