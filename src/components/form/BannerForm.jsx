import { useState } from "react";
import { useForm } from "react-hook-form";
import { X, Save, UploadCloud } from "lucide-react";

const BannerForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
  partnerOptions = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      id: defaultValues.id || null,
      type: defaultValues.type || "",
      appType: defaultValues.appType || "",
      issub: defaultValues.issub ?? false,
      image: [],
    },
  });

  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const imageFiles = watch("image");

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Handle Image Change
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setValue("image", files);

    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviewImages(previews);
  };

  // Remove image
  const removeImage = (index) => {
    const updated = [...previewImages];
    updated.splice(index, 1);
    setPreviewImages(updated);
    setValue(
      "image",
      updated.map((img) => img.file)
    );
  };

const onFormSubmit = async (data) => {
  try {
    setLoading(true);

    const finalData = {
      ...data,
      issub: data.issub === "true",
      image:
        previewImages.length > 0
          ? previewImages.map((i) => i.file)
          : defaultValues.image || [],
    };

    await onSubmit(finalData); 

    reset();
    setPreviewImages([]);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">
        {defaultValues.id ? "Update Banner" : "Create Banner"}
      </h2>

      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* IMAGE UPLOAD */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-600 mb-2 block">
            Upload Banner Images
          </label>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-black transition">
            <UploadCloud size={28} className="text-gray-500 mb-2" />
            <span className="text-gray-600 text-sm">
              Click or drag images to upload
            </span>
            <span className="text-xs text-gray-400">
              Max 4MB per image
            </span>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          {/* PREVIEW */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
            {previewImages.length > 0
              ? previewImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden border"
                  >
                    <img
                      src={img.url}
                      className="h-24 w-full object-cover group-hover:scale-105 transition"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              : defaultValues.image?.map((img, index) => (
                  <img
                    key={index}
                    src={`${baseURL}/profilepic/${img}`}
                    className="h-24 w-full object-cover rounded-xl border"
                  />
                ))}
          </div>

          {errors.image && (
            <p className="text-sm text-red-500 mt-2">
              {errors.image.message}
            </p>
          )}
        </div>

        {/* APP TYPE */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            App Type
          </label>
          <select
            {...register("appType", { required: "Required" })}
            className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-black ${
              errors.appType ? "border-red-500" : "border-gray-200"
            }`}
          >
            <option value="">Select</option>
            <option value="partner">Partner</option>
            <option value="user">User</option>
            <option value="web">Website</option>
          </select>
        </div>

        {/* TYPE */}
        {(watch("appType") === "web" ||
          watch("appType") === "user" ||
          watch("appType") === "partner") && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Type
            </label>
            <select
              {...register("type", { required: "Required" })}
              className={`w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-black ${
                errors.type ? "border-red-500" : "border-gray-200"
              }`}
            >
              <option value="">Select</option>
              <option value="main">Main</option>
              <option value="sub">Section One</option>
              {watch("appType") === "web" && (
                <option value="sub2">Section Two</option>
              )}
            </select>
          </div>
        )}

        {/* SUBSCRIPTION */}
        <div>
          <label className="text-sm text-gray-600 mb-1 block">
            Subscription Type
          </label>
          <select
            {...register("issub", { required: "Required" })}
            className="w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-black border-gray-200"
          >
            <option value="">Select</option>
            {watch("appType") === "partner" && (
              <option value="true">Subscription</option>
            )}
            <option value="false">Normal</option>
          </select>
        </div>

        {/* PARTNER */}
        {watch("issub") === "true" && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Partner
            </label>
            <select
              {...register("id")}
              className="w-full px-4 py-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-black border-gray-200"
            >
              <option value="">Select Partner</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ACTIONS */}
        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg border text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
<button
  type="submit"
  disabled={loading}
  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white transition 
  ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:opacity-90"}`}
>
  {loading ? (
    <>
      {/* Spinner */}
      <svg
        className="animate-spin h-4 w-4"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="white"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="white"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>

      Processing...
    </>
  ) : (
    <>
      <Save size={16} />
      {defaultValues.id ? "Updating..." : "Save"}
    </>
  )}
</button>
        </div>
      </form>
    </div>
  );
};

export default BannerForm;