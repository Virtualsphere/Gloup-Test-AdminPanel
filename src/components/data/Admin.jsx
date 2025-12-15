  import { useEffect, useState } from "react";
  import AdminForm from "../form/AdminForm";
  import { useDispatch, useSelector } from "react-redux";
  import { Toaster, toast } from "react-hot-toast";
  import { addAdmin, getAdmin } from "../../redux/slices/adminSlice";
  import AdminTable from "../table/Admintable";

  const Admin = ({ title }) => {
    const [data, setData] = useState([]);
    const dispatch = useDispatch();
    // Form data state
    const [formData, setFormData] = useState({
      id: null,
      username: "",
      email: "",
      password: "",
      phone: "",
    });

    // Active tab state
    const [activeTab, setActiveTab] = useState("table");

    const adminValue = useSelector((state) => state.admin.adminList);
    useEffect(() => {
      dispatch(getAdmin());
    }, [dispatch]);

    useEffect(() => {
      if (adminValue) {
        setData(adminValue);
      }
    }, [adminValue]);

    const handleAddData = async (newData) => {

      const toastId = "admin-toast";
      try {
        const resultAction = await dispatch(addAdmin(newData));
        // check if fulfilled
        if (addAdmin.fulfilled.match(resultAction)) {
          toast.dismiss(toastId);
          toast.success("Admin added!", { id: toastId });
          dispatch(getAdmin());
          setActiveTab("table");
        } else {
          toast.dismiss(toastId);
          toast.error(resultAction.payload, { id: toastId });
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
      formDataToSend.append("schoolName", updatedData.schoolName);
      formDataToSend.append("schoolEmail", updatedData.schoolEmail);
      formDataToSend.append("schoolContact", updatedData.schoolContact);
      formDataToSend.append("schoolWebsite", updatedData.schoolWebsite);
      formDataToSend.append("image", updatedData.image);
      try {
        const resultAction = await dispatch(formDataToSend); // your update thunk
        if (addAssignment.fulfilled.match(resultAction)) {
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

    const handleDeleteData = async (id) => {
      const toastId = "delete-toast"; // unique toast ID

      try {
        const resultAction = await dispatch(
          deleteAssignment({ feedId: id + "", status: "inActive" })
        );

        if (deleteAssignment.fulfilled.match(resultAction)) {
          toast.dismiss(toastId);
          toast.success("Successfully deleted!", { id: toastId });

          dispatch(getAssignmentList({ type: "assignments" }));
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
        classId: record?.classId,
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
        username: "",
        email: "",
        password: "",
        phone: "",
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
          <div className="flex border-b border-gray-200 mb-6">
            <button
              style={{ cursor: "pointer" }}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg mr-2 ${activeTab === "table"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              onClick={() => handleTabClick("table")}
            >
              {title === "Admin" && "Admins"}
            </button>
            <button
              style={{ cursor: "pointer" }}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === "form"
                ? "bg-white border border-gray-200 border-b-white text-blue-600"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              onClick={() => handleTabClick("form")}
            >
              {formData.id
                ? `Edit ${title === "Admin" && "Admin"}`
                : `Add New ${title === "Admin" && "Admin"}`}
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {activeTab === "form" ? (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                </h3>
                <AdminForm
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
                    Add New {title === "Admin" && "Admin"}
                  </button>
                </div>
                <AdminTable
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

  export default Admin;
