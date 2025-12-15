import { useEffect, useState } from "react";
import SubscriptionTable from "../table/SubscriptionTable";
import SubscriptionForm from "../form/SubscriptionForm";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import {
  getAllSubscriptionsList,
  addSubscription,
  updateSubscriptionStatus,
} from "../../redux/slices/subscriptionSlice";

const Subscription = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  // Form data state
  const [formData, setFormData] = useState({
    id: null,
    type: "",
    days: null,
    price: null,
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");

  const allSubscriptionsList = useSelector(
    (state) => state.allSubscriptions.allSubscriptionsList
  );
  const loading = useSelector((state) => state.allSubscriptions.loading); // fixed key
  const error = useSelector((state) => state.allSubscriptions.error); // fixed key

  useEffect(() => {
    dispatch(getAllSubscriptionsList());
  }, [dispatch]);

  useEffect(() => {
    if (allSubscriptionsList) {
      setData(allSubscriptionsList);
    }
  }, [allSubscriptionsList]);

  const handleAddData = async (finaldata) => {
    const toastId = "addSubscription-toast";
    try {
      const resultAction = await dispatch(addSubscription(finaldata));
      // check if fulfilled
      if (addSubscription.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllSubscriptionsList());
        toast.success("Subscription added!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add subscription.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to add data", error);
    }
  };

  const handleUpdateData = async (updatedData) => {
    const toastId = "updateSubscription-toast";
    try {
      const resultAction = await dispatch(addSubscription(updatedData)); // your update thunk
      // check if fulfilled
      if (addSubscription.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllSubscriptionsList());
        toast.success("Subscription updated!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to update subscription.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to update data", error);
    }
  };

  // const handleDeleteData = async (id) => {
  //   const toastId = "delete-toast"; // unique toast ID

  //   try {
  //     const resultAction = await dispatch(deleteCoupon({ id: id }));

  //     if (deleteCoupon.fulfilled.match(resultAction)) {
  //       toast.dismiss(toastId);
  //       toast.success("Successfully deleted!", { id: toastId });
  //       await dispatch(getAllCouponsList());
  //     } else {
  //       toast.dismiss(toastId);
  //       toast.error("Failed to delete.", { id: toastId });
  //     }
  //   } catch (error) {
  //     toast.dismiss(toastId);
  //     toast.error("An error occurred while deleting.", { id: toastId });
  //     console.error("Failed to delete data", error);
  //   }
  // };

  const handleEditClick = (record) => {
    setFormData({
      id: record.id,
      type: record.type,
      days: record.days,
      price: record.price,
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
      type: "",
      days: null,
      price: null,
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
            ⚠️ Failed to load Subscriptions: {error}
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
            Loading Subscriptions...
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
                {title === "Subscription" && "Subscriptions"}
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
                  ? `Edit ${title === "Subscription" && "Subscription"}`
                  : `Add New ${title === "Subscription" && "Subscription"}`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {activeTab === "form" ? (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                  </h3>
                  <SubscriptionForm
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
                      Add New {title === "Subscription" && "Subscription"}
                    </button>
                  </div>
                  <SubscriptionTable
                    data={data}
                    title={title}
                    onEdit={handleEditClick}
                    // onDelete={handleDeleteData}
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

export default Subscription;
