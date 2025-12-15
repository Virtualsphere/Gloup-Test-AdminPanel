import { useEffect, useState } from "react";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import { showToast } from "../../utils/toast";
import UsersTable from "../table/UsersTable";
import { getAllUsersList } from "../../redux/slices/allUsersSlice";

const AllUsers = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  // Form data state
  const [formData, setFormData] = useState({
    id: null,
    classId: [],
    feedTitle: "",
    feedContent: "",
    type: "",
    section: "",
    date: "",
    media: null,
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");

  const allUsersValue = useSelector((state) => state.allUsers.allUsersList
  );

  
  useEffect(() => {
    dispatch(getAllUsersList());
  }, [dispatch]);

  useEffect(() => {
    if (allUsersValue) {
      setData(allUsersValue);
    }
  }, [allUsersValue]);

  const handleAddData = async (newData) => {
    newData.feedType = "announcements";

    const formDataToSend = new FormData();
    formDataToSend.append("feedTitle", newData.feedTitle);
    formDataToSend.append("feedContent", newData.feedContent);
    formDataToSend.append("feedType", newData.feedType);
    // ✅ Send classId as JSON stringified array
    formDataToSend.append("classId", JSON.stringify(newData.classId));
    formDataToSend.append("type", newData.type);
    const formattedDate = moment(newData.date).format("YYYY-MM-DD");
    formDataToSend.append("date", formattedDate);
    if (newData?.subject) {
      formDataToSend.append("subject", newData.subject);
    }
    if (newData.media && newData.media.length > 0) {
      Array.from(newData.media).forEach((file) => {
        formDataToSend.append("media", file);
      });
    }
    const toastId = "announcement-toast";
    try {
      const resultAction = await dispatch(addAssignment(formDataToSend));

      // check if fulfilled
      if (addAssignment.fulfilled.match(resultAction)) {
        // showToast("announcement-toast", resultAction?.payload);
        toast.dismiss(toastId);
        toast.success("announcement added!", { id: toastId });
        dispatch(getAnnouncementList({ type: "announcements" }));
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add announcement.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to add data", error);
    }
  };

  const handleUpdateData = async (updatedData) => {
    updatedData.feedType = "announcements";

    const formDataToSend = new FormData();
    formDataToSend.append("id", updatedData.id); // important for update
    formDataToSend.append("feedTitle", updatedData.feedTitle);
    formDataToSend.append("feedContent", updatedData.feedContent);
    formDataToSend.append("feedType", updatedData.feedType);

    const formattedDate = moment(updatedData.date).format("YYYY-MM-DD");
    formDataToSend.append("date", formattedDate);

    if (updatedData.media) {
      formDataToSend.append("media", updatedData.media);
    }

    try {
      const resultAction = await dispatch(addAssignment(formDataToSend)); // your update thunk
      if (addAssignment.fulfilled.match(resultAction)) {
        alert("Updated successfully");

        // Optional: refresh list from server
        await dispatch(getAnnouncementList({ type: "announcements" }));

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

  const handleDeleteData = async (id) => {
    const toastId = "delete-toast"; // unique toast ID

    try {
      const resultAction = await dispatch(
        deleteAnnouncement({ feedId: id + "", status: "inActive" })
      );

      if (deleteAnnouncement.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        toast.success("Successfully deleted!", { id: toastId });

        dispatch(getAnnouncementList({ type: "announcements" }));
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
      id: record.id,
      feedTitle: record.feedTitle,
      feedContent: record.feedContent,
      date: record.date,
      media: record.feedAttachment,
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
      classId: [],
      feedTitle: "",
      feedContent: "",
      type: "",
      section: "",
      date: "",
      media: null,
    });
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        {/* Tab Navigation */}
        {/* <div className="flex border-b border-gray-200 mb-6">
          <button
            style={{ cursor: "pointer" }}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${
              activeTab === "table"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => handleTabClick("table")}
          >
            {title === "Users" && "Users"}
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
              ? `Edit ${title === "Users" && "Users"}`
              : `Add New ${title === "Users" && "Users"}`}
          </button>
        </div> */}

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === "form" ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {formData.id ? `Edit ${title} ` : `Add New ${title}`}
              </h3>
              <UsersForm
                classList={classList}
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
              {/* <div className="p-4 border-b border-gray-100">
                <button
                  style={{ cursor: "pointer" }}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black"
                  onClick={handleAddNewClick}
                >
                  Add New {title === "Users" && "Users"}
                </button>
              </div> */}
          
              <UsersTable
                data={data}
                title={title}
                onEdit={handleEditClick}
                onDelete={handleDeleteData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllUsers;
