import { useEffect, useState } from "react";
import BannerTable from "../table/BannerTable";
import BannerForm from "../form/BannerForm";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import {
  getActiveBannerList,
  addBanner,
  deleteBanner,
} from "../../redux/slices/bannerSlice";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";

const Banner = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  // Form data state
  const [formData, setFormData] = useState({
    id: null,
    image: null,
    type: "",
    appType: "",
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");

  const allActiveBanners = useSelector(
    (state) => state.allBanners.allActiveBanners
  ); // fixed key
  const loading = useSelector((state) => state.allBanners.loading); // fixed key
  const error = useSelector((state) => state.allBanners.error); // fixed key

  useEffect(() => {
    dispatch(getActiveBannerList());
    dispatch(getAllPartnersList());
  }, [dispatch]);

  useEffect(() => {
    if (allActiveBanners) {
      setData(allActiveBanners);
    }
  }, [allActiveBanners]);

  let partnerOptions = useSelector(
    (state) => state.allPartners.allPartnersList
  );
  const formattedPartnerOptions = Array.isArray(partnerOptions)
    ? partnerOptions
        .filter((partner) => partner.completion_status === "completed")
        .map((partner) => ({
          label: partner.name,
          id: partner.id,
        }))
    : [];

  // const handleAddData = async (newData) => {
  //   console.log(newData, "kj");

  //   const formDataToSend = new FormData();
  //   formDataToSend.append("id", newData.id);
  //   formDataToSend.append("image", newData.image);
  //   formDataToSend.append("type", newData.type);

  //   const toastId = "addBanner-toast";
  //   try {
  //     const resultAction = await dispatch(addBanner(formDataToSend));

  //     // check if fulfilled
  //     if (addBanner.fulfilled.match(resultAction)) {
  //       toast.dismiss(toastId);
  //       await dispatch(getActiveBannerList());
  //       toast.success(resultAction.payload, { id: toastId });
  //       setActiveTab("table");
  //     } else {
  //       toast.dismiss(toastId);
  //       toast.error("Failed to add banner.", { id: toastId });
  //     }
  //   } catch (error) {
  //     toast.dismiss(toastId);
  //     toast.error("Something went wrong.", { id: toastId });
  //     console.error("Failed to add data", error);
  //   }
  // };

  const handleAddData = async (newData) => {
    console.log(newData,"newData");
    
    const formDataToSend = new FormData();
    if (newData.id == null) {
      formDataToSend.append("store_id", "");
    } else {
      formDataToSend.append("store_id", newData.id);
    }

    formDataToSend.append("type", newData.type);
    formDataToSend.append("place", newData.appType);
    formDataToSend.append("issub", newData.issub);

    // ✅ Append multiple images using the same key name "image"
    if (Array.isArray(newData.image)) {
      newData.image.forEach((file) => {
        formDataToSend.append("image", file);
      });
    } else if (newData.image) {
      formDataToSend.append("image", newData.image);
    }

    const toastId = "addBanner-toast";
    try {
      const resultAction = await dispatch(addBanner(formDataToSend));

      if (addBanner.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getActiveBannerList());
        toast.success(resultAction.payload, { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add banner.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to add data", error);
    }
  };

  const handleUpdateData = async (updatedData) => {
    const formDataToSend = new FormData();
    formDataToSend.append("id", updatedData.id); // important for update
    formDataToSend.append("image", updatedData.image);
    formDataToSend.append("type", updatedData.type);

    const toastId = "updateBanner-toast";
    try {
      const resultAction = await dispatch(addBanner(formDataToSend)); // your update thunk
      if (addBanner.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getActiveBannerList());
        toast.success(resultAction.payload, { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to update banner.", { id: toastId });
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
      const resultAction = await dispatch(deleteBanner({ id: id }));

      if (deleteBanner.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        toast.success("Successfully deleted!", { id: toastId });
        await dispatch(getActiveBannerList());
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

  const handleEditClick = (record) => {
    setFormData({
      id: record?.store_id,
      image: record?.image,
      type: record?.type,
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
      image: null,
      type: "",
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
            ⚠️ Failed to load Banner: {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <svg
              className="animate-spin h-5 w-5 text-purple-500 mr-2"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Loading Banner...
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
                {title === "Banner" && "Banners"}
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
                  ? `Edit ${title === "Banner" && "Banner"}`
                  : `Add New ${title === "Banner" && "Banner"}`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="max-w-8xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              {activeTab === "form" ? (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                  </h3>
                  <BannerForm
                    defaultValues={formData}
                    partnerOptions={formattedPartnerOptions}
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
                      Add New {title === "Banner" && "Banner"}
                    </button>
                  </div>
                  <BannerTable
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

export default Banner;
