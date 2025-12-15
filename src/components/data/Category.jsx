import { useEffect, useState} from "react";
import CategoryTable from "../table/CategoryTable";
import CategoryForm from "../form/CategoryForm";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import {
  getAllCategoryList, addCategory, deleteCategory
} from "../../redux/slices/categorySlice";

const Category = ({title }) => {
  const [data, setData] = useState([]);
   const dispatch = useDispatch();
    // Form data state
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    image:"",
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");
  const allCategoryList = useSelector((state) => state.allCategory.allCategoryList);
  const loading = useSelector((state) => state.allCategory.loading); // fixed key
  const error = useSelector((state) => state.allCategory.error);     // fixed key

  useEffect(() => {
    dispatch(getAllCategoryList());
  }, [dispatch]);

  useEffect(() => {
    if (allCategoryList) {
      setData(allCategoryList);
    }
  }, [allCategoryList]);


const handleAddData = async (newData) => {
    const formDataToSend = new FormData();
    formDataToSend.append("name", newData.name);
     formDataToSend.append("image", newData.image);
   
    const toastId = "addcategory-toast";
    try {
      const resultAction = await dispatch(addCategory(formDataToSend));
      // check if fulfilled
      if (addCategory.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllCategoryList());
        toast.success("Category added!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add category.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to add data", error);
    }
  };

   // Utility function to convert image URL to File object
  const convertImageUrlToFile = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      // Create a File object from the blob
      const file = new File([blob], fileName, { type: blob.type });
      return file;
    } catch (error) {
      console.error('Error converting image to file:', error);
      return null;
    }
  };
  const handleUpdateData = async (updatedData) => {
    const formDataToSend = new FormData();
    formDataToSend.append("id", updatedData.id); // important for update
    formDataToSend.append("name", updatedData.name);
    formDataToSend.append("image", updatedData.image);
    const toastId = "updatecategory-toast";
    try {
      const resultAction = await dispatch(addCategory(formDataToSend)); // your update thunk
      if (addCategory.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
          await dispatch(getAllCategoryList());
          toast.success(resultAction.payload, { id: toastId });
          setActiveTab("table");
          } else {
          toast.dismiss(toastId);
          toast.error("Failed to update category.", { id: toastId });
        }
      } catch (error) {
        toast.dismiss(toastId);
        toast.error("Something went wrong.", { id: toastId });
        console.error("Failed to update data", error);
      }
    };

   
  const handleDeleteData = async (id) => {
    const toastId = "delete-toast"; // unique toast ID

    try {
      const resultAction = await dispatch(deleteCategory({ id: id }));

      if (deleteCategory.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        toast.success("Successfully deleted!", { id: toastId });
        await dispatch(getAllCategoryList());
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to delete.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("An error occurred while deleting.", { id: toastId });
      console.error("Failed to delete data", error);
    }
  };

  const handleEditClick = async (record) => {
    let imageFile = null;
      // Convert existing image to File object
    if (record.image) {
      const imageUrl = `${import.meta.env.VITE_API_BASE_URL}/profilepic/${record.image}`;
      imageFile = await convertImageUrlToFile(imageUrl, record.image);
    }
    setFormData({
      id: record.id,
      name: record.name,
      image:  imageFile,
      
    });
      
    setActiveTab("form");
  };

  const handleAddNewClick = () => {
    clearForm();
    setActiveTab("form");
  };

  const clearForm = () => {
    setFormData({
      id: null,
      name: "",
      image: null,
    });
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };


 

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        {/* Error Message */}
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ Failed to load Category: {error}
          </div>
         ) : loading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading Category...
        </div>
        ) : (
          <div>
            
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                style={{ cursor: "pointer" }}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${
                  activeTab === "table"
                    ? "bg-white border border-gray-200 border-b-white text-blue-600"
                    : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => handleTabClick("table")}
              >
                {title === "Category" && "Categories"}
              </button>
              <button
                style={{ cursor: "pointer" }}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
                  activeTab === "form"
                    ? "bg-white border border-gray-200 border-b-white text-blue-600"
                    : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => handleTabClick("form")}
              >
                {formData.id
                  ? `Edit ${title === "Category" && "Category"}`
                  : `Add New ${title === "Category" && "Category"}`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {activeTab === "form" ? (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                  </h3>
                  <CategoryForm
                    defaultValues={formData}
                    onSubmit={formData.id ? handleUpdateData : handleAddData}
                    onCancel={() => {
                      clearForm();
                      setActiveTab("table");
                    }}
                  />
                </div>
              ) : (
                <div>
                  <div className="p-4 border-b border-gray-100">
                    <button
                      style={{ cursor: "pointer" }}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black"
                      onClick={handleAddNewClick}
                    >
                      Add New {title === "Category" && "Category"}
                    </button>
                  </div>
                  <CategoryTable
                    data={data}
                    title={title}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteData}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

   
  
export default Category;
