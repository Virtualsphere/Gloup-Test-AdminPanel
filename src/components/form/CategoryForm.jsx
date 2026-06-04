import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";
import { useState } from 'react';
import ImageModal from '../modal/ImageModal'; 
import { getImageUrl } from "../../utils/image";
const CategoryForm = ({
  onSubmit,
  onCancel,
  defaultValues = {},
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    defaultValues: {
      name: defaultValues.name || "",  
      image: "",
    },
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const imageUrl = defaultValues.image
    ? getImageUrl(
        typeof defaultValues.image === "string"
          ? defaultValues.image
          : defaultValues.image.name
      )
    : "";
  const imageFile = watch("image");

  const onFormSubmit = (data) => {
    const selectedFile = data.image?.[0] || null;
     
    const finalData = {
      ...data,
      image: selectedFile || defaultValues.image || null,
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
      {/* Category Name */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Category Name</label>
        <input
          type="text"
          {...register("name", {
            required: "Category name is required",
            minLength: { value: 3, message: "Minimum 3 characters" },
          })}
          placeholder="Enter category name"
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      
      {/* Image Upload */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Upload Image</label>
               
        <input
          type="file"
          accept="image/*"
          {...register("image", {
            required: !defaultValues.image && "Image is required",
            validate: {
            maxSize: (fileList) =>
            !fileList[0] || fileList[0].size <= 4 * 1024 * 1024 || "Image must be less than 4MB",
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
        {imageFile?.[0] ? (
          <div className="my-3">
            <img
              src={URL.createObjectURL(imageFile[0])}
              alt="Preview"
              className="h-16 object-contain"
            />
          </div>
        ) : defaultValues.image && !imageFile?.length && (
           <>
          <div className="my-3">
              <img
                src={imageUrl}
                alt="Existing logo"
                className="h-16 object-contain"
              />
              {/* <button
              type= "button"
                onClick={() => setIsModalOpen(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                View current image
              </button> */}
            </div>

            {/* <ImageModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              imageUrl={imageUrl}
            /> */}
            </>
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
          {defaultValues.name ? "Update" : "Save"}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;

