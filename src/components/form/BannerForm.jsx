// import { useForm } from "react-hook-form";
// import { Save, X } from "lucide-react";
// import { useState } from "react";
// import ImageModal from "../modal/ImageModal";

// const BannerForm = ({
//   onSubmit,
//   onCancel,
//   defaultValues = {},
//   partnerOptions = [],
// }) => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//     reset,
//     watch,
//     setValue,
//   } = useForm({
//     defaultValues: {
//       id: defaultValues.id || null,
//       type: defaultValues.type || "",
//       appType: defaultValues.appType || "",
//       issub: defaultValues.issub || false,
//       image: [],
//     },
//   });

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedImageUrl, setSelectedImageUrl] = useState("");
//   const imageFiles = watch("image");

//   const onFormSubmit = (data) => {
//     const selectedFiles = data.image?.length ? Array.from(data.image) : [];

//     const finalData = {
//       ...data,
//       image:
//         selectedFiles.length > 0 ? selectedFiles : defaultValues.image || [],
//     };

//     onSubmit(finalData);
//     reset();
//   };

//   const handleImagePreview = (url) => {
//     setSelectedImageUrl(url);
//     setIsModalOpen(true);
//   };

//   const baseURL = import.meta.env.VITE_API_BASE_URL;

//   return (
//     <form
//       onSubmit={handleSubmit(onFormSubmit)}
//       className="grid grid-cols-1 md:grid-cols-2 gap-6"
//     >
//       {/* Image Upload */}
//       <div className="flex flex-col md:col-span-2">
//         <label className="text-sm font-medium text-gray-700 mb-1">
//           Upload Banner Images
//         </label>

//         <input
//           type="file"
//           accept="image/*"
//           multiple
//           {...register("image", {
//             required:
//               !defaultValues.image?.length && "At least one image is required",
//             validate: {
//               maxSize: (fileList) => {
//                 if (!fileList.length) return true;
//                 for (const file of fileList) {
//                   if (file.size > 4 * 1024 * 1024)
//                     return "Each image must be less than 4MB";
//                 }
//                 return true;
//               },
//             },
//           })}
//           className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
//             errors.image
//               ? "border-red-500 focus:ring-red-500"
//               : "border-gray-300 focus:ring-blue-500"
//           }`}
//         />

//         {errors.image && (
//           <p className="text-sm text-red-500 mt-1">{errors.image.message}</p>
//         )}

//         {/* Preview newly selected image */}
//         {imageFiles?.length > 0 && (
//           <div className="flex flex-wrap gap-3 mt-3">
//             {Array.from(imageFiles).map((file, index) => {
//               const previewUrl = URL.createObjectURL(file);
//               return (
//                 <div
//                   key={index}
//                   className="relative border rounded-md p-1 cursor-pointer"
//                   onClick={() => handleImagePreview(previewUrl)}
//                 >
//                   <img
//                     src={previewUrl}
//                     alt={`Preview ${index + 1}`}
//                     className="h-20 w-20 object-cover rounded-md"
//                   />
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* Preview existing image (edit mode) */}
//         {!imageFiles?.length && defaultValues.image?.length > 0 && (
//           <div className="flex flex-wrap gap-3 mt-3">
//             {defaultValues.image.map((img, index) => (
//               <div
//                 key={index}
//                 className="relative border rounded-md p-1 cursor-pointer"
//                 onClick={() =>
//                   handleImagePreview(`${baseURL}/profilepic/${img}`)
//                 }
//               >
//                 <img
//                   src={`${baseURL}/profilepic/${img}`}
//                   alt={`Existing ${index + 1}`}
//                   className="h-20 w-20 object-cover rounded-md"
//                 />
//               </div>
//             ))}
//           </div>
//         )}

//         <ImageModal
//           isOpen={isModalOpen}
//           onClose={() => setIsModalOpen(false)}
//           imageUrl={selectedImageUrl}
//         />
//       </div>

//       {/* Type Dropdown */}
//       <div className="flex flex-col">
//         <label className="text-sm font-medium text-gray-700 mb-1">Type</label>
//         <select
//           {...register("type", { required: "Type is required" })}
//           value={watch("type")}
//           onChange={(e) => setValue("type", e.target.value)}
//           className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
//             errors.type
//               ? "border-red-500 focus:ring-red-500"
//               : "border-gray-300 focus:ring-blue-500"
//           }`}
//         >
//           <option value="">Select type</option>
//           <option value="main">Main</option>
//           <option value="sub">Section-One</option>
//           <option value="sub2">Section-two</option>
//         </select>
//         {errors.type && (
//           <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
//         )}
//       </div>

//       {/* Partner Dropdown */}
//       <div className="flex flex-col">
//         <label className="text-sm font-medium text-gray-700 mb-1">
//           Partner
//         </label>
//         <select
//           {...register("id", { required: "Partner is required" })}
//           value={watch("id")}
//           onChange={(e) => setValue("id", e.target.value)}
//           className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
//             errors.id
//               ? "border-red-500 focus:ring-red-500"
//               : "border-gray-300 focus:ring-blue-500"
//           }`}
//         >
//           <option value="">Select a partner</option>
//           {partnerOptions.map((partner) => (
//             <option key={partner.id} value={partner.id}>
//               {partner.label}
//             </option>
//           ))}
//         </select>
//         {errors.id && (
//           <p className="mt-1 text-sm text-red-500">{errors.id.message}</p>
//         )}
//       </div>

//       {/* App Type Dropdown */}
//       <div className="flex flex-col">
//         <label className="text-sm font-medium text-gray-700 mb-1">
//           App Type
//         </label>
//         <select
//           {...register("appType", { required: "App type is required" })}
//           value={watch("appType")}
//           onChange={(e) => setValue("appType", e.target.value)}
//           className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
//             errors.appType
//               ? "border-red-500 focus:ring-red-500"
//               : "border-gray-300 focus:ring-blue-500"
//           }`}
//         >
//           <option value="">Select app type</option>
//           <option value="partner">Partner</option>
//           <option value="user">User</option>
//           <option value="web">Website</option>
//         </select>
//         {errors.appType && (
//           <p className="mt-1 text-sm text-red-500">{errors.appType.message}</p>
//         )}
//       </div>

//       {/* Buttons */}
//       <div className="md:col-span-2 flex justify-end gap-3 pt-2">
//         <button
//           type="button"
//           onClick={onCancel}
//           className="flex items-center cursor-pointer px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
//         >
//           <X size={16} className="mr-1" />
//           Cancel
//         </button>
//         <button
//           type="submit"
//           className="flex items-center cursor-pointer px-4 py-2 bg-black hover:bg-black text-white rounded-md"
//         >
//           <Save size={16} className="mr-1" />
//           {defaultValues.id ? "Update" : "Save"}
//         </button>
//       </div>
//     </form>
//   );
// };

// export default BannerForm;

import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";
import { useState } from "react";
import ImageModal from "../modal/ImageModal";

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const imageFiles = watch("image");

  const onFormSubmit = (data) => {
    const selectedFiles = data.image?.length ? Array.from(data.image) : [];
    console.log(data,"data");
    
    const finalData = {
      ...data,
      issub: data.issub === "true",
      image:
        selectedFiles.length > 0 ? selectedFiles : defaultValues.image || [],
    };

    onSubmit(finalData);
    reset();
  };

  const handleImagePreview = (url) => {
    setSelectedImageUrl(url);
    setIsModalOpen(true);
  };

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      {/* Image Upload */}
      <div className="flex flex-col md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Upload Banner Images
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          {...register("image", {
            required:
              !defaultValues.image?.length && "At least one image is required",
            validate: {
              maxSize: (fileList) => {
                if (!fileList.length) return true;
                for (const file of fileList) {
                  if (file.size > 4 * 1024 * 1024)
                    return "Each image must be less than 4MB";
                }
                return true;
              },
            },
          })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.image
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />

        {errors.image && (
          <p className="text-sm text-red-500 mt-1">{errors.image.message}</p>
        )}

        {/* Preview newly selected image */}
        {imageFiles?.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {Array.from(imageFiles).map((file, index) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div
                  key={index}
                  className="relative border rounded-md p-1 cursor-pointer"
                  onClick={() => handleImagePreview(previewUrl)}
                >
                  <img
                    src={previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-md"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Preview existing image (edit mode) */}
        {!imageFiles?.length && defaultValues.image?.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {defaultValues.image.map((img, index) => (
              <div
                key={index}
                className="relative border rounded-md p-1 cursor-pointer"
                onClick={() =>
                  handleImagePreview(`${baseURL}/profilepic/${img}`)
                }
              >
                <img
                  src={`${baseURL}/profilepic/${img}`}
                  alt={`Existing ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-md"
                />
              </div>
            ))}
          </div>
        )}

        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={selectedImageUrl}
        />
      </div>

      {/* App Type Dropdown */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          App Type
        </label>
        <select
          {...register("appType", { required: "App type is required" })}
          value={watch("appType")}
          onChange={(e) => setValue("appType", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.appType
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        >
          <option value="">Select app type</option>
          <option value="partner">Partner</option>
          <option value="user">User</option>
          <option value="web">Website</option>
        </select>
        {errors.appType && (
          <p className="mt-1 text-sm text-red-500">{errors.appType.message}</p>
        )}
      </div>

      {/* Type Dropdown (conditionally rendered) */}
      {(watch("appType") === "web" ||
        watch("appType") === "user" ||
        watch("appType") === "partner") && (
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            {...register("type", { required: "Type is required" })}
            value={watch("type")}
            onChange={(e) => setValue("type", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.type
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          >
            <option value="">Select type</option>
            <option value="main">Main</option>

            <option value="sub">Section-One</option>
            {watch("appType") === "web" && (
              <option value="sub2">Section-two</option>
            )}
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
          )}
        </div>
      )}

      {/* Partner Dropdown */}
      {watch("issub") === "true" && (
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            Partner
          </label>
          <select
            {...register(
              "id"
              //  { required: "Partner is required" }
            )}
            value={watch("id")}
            onChange={(e) => setValue("id", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.id
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
          {errors.id && (
            <p className="mt-1 text-sm text-red-500">{errors.id.message}</p>
          )}
        </div>
      )}

      {/* Subscription Type Dropdown 👇 */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Subscription Type
        </label>
        <select
          {...register("issub", { required: "Select subscription type" })}
          value={watch("issub").toString()}
          onChange={(e) => setValue("issub", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.issub
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        >
          <option value="">Select type</option>
          {watch("appType") === "partner" && (
            <option value="true">Subscription</option>
          )}

          <option value="false">Normal</option>
        </select>
        {errors.issub && (
          <p className="mt-1 text-sm text-red-500">{errors.issub.message}</p>
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
          {defaultValues.id ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};

export default BannerForm;
