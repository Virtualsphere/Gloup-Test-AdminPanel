import { useEffect, useState} from "react";
import NotificationTable from "../table/NotificationTable";
import NotificationForm from "../form/NotificationForm";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import {
  getAllNotificationList, addNotification
} from "../../redux/slices/notificationSlice";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";

const Notification = ({title }) => {
  const [data, setData] = useState([]);
   const dispatch = useDispatch();
    // Form data state
  const [formData, setFormData] = useState({
    notification_type: "",
    sent_to: "",
    title: "",
    description: "",
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");

  const allNotificationList = useSelector((state) => state.allNotification.allNotificationList);
  const loading = useSelector((state) => state.allNotification.loading); // fixed key
  const error = useSelector((state) => state.allNotification.error);     // fixed key

  useEffect(() => {
    dispatch(getAllNotificationList());
    dispatch(getAllPartnersList());
  }, [dispatch]);

  useEffect(() => {
    if (allNotificationList) {
      setData(allNotificationList);
    }
  }, [allNotificationList]);

  let partnerOptions = useSelector((state) => state.allPartners.allPartnersList);
  const formattedPartnerOptions = Array.isArray(partnerOptions)
  ? partnerOptions
      .filter((partner) => partner.completion_status === "completed")
      .map((partner) => ({
        label: partner.name,
        id: partner.id,
      }))
  : [];



const handleAddData = async (finaldata) => {
    
   
    const toastId = "notification-toast";
    try {
      const resultAction = await dispatch(addNotification(finaldata));
      // check if fulfilled
      if (addNotification.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllNotificationList());
        toast.success("Notification added!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add notification.", { id: toastId });
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
    formDataToSend.append("name", updatedData.name);
    formDataToSend.append("image", updatedData.image);
    try {
      const resultAction = await dispatch(formDataToSend); // your update thunk
      if (addNotification.fulfilled.match(resultAction)) {
        alert("Updated successfully");

        // Optional: refresh list from server
        // await dispatch(getAssignmentList());

        // Or, update the local data state manually:
        // const updatedList = data.map(item =>
        //   item.id === updatedData.id ? updatedData : item
        // );
        // setData(updatedList);

        setActiveTab("table");
      } else {
        alert("Update failed");
      }
    } catch (error) {
      console.error("Failed to update data", error);
    }
  };

  // const handleDeleteData = async (id) => {
  //   const toastId = "delete-toast"; // unique toast ID

  //   try {
  //     const resultAction = await dispatch({ id: id });

  //     if (deleteNotification.fulfilled.match(resultAction)) {
  //       toast.dismiss(toastId);
  //       toast.success("Successfully deleted!", { id: toastId });
  //       await dispatch(getAllCategoryList());
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
      name: record.name,
      image: record.image,
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
            ⚠️ Failed to load Notification: {error}
          </div>
         ) : loading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading Notifications...
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
                {title === "Notification" && "Notifications"}
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
                  ? `Edit ${title === "Notification" && "Notification"}`
                  : `Add New ${title === "Notification" && "Notification"}`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {activeTab === "form" ? (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                  </h3>
                  <NotificationForm
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
                      Add New {title === "Notification" && "Notification"}
                    </button>
                  </div>
                  <NotificationTable
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

   
  
export default Notification;
