import { useEffect, useState } from "react";
import NotificationTable from "../table/NotificationTable";
import NotificationForm from "../form/NotificationForm";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  getAllNotificationList,
  addNotification,
  getNotificationById
} from "../../redux/slices/notificationSlice";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";

const Notification = ({ title }) => {

  const dispatch = useDispatch();

  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("table");

  const [formData, setFormData] = useState({
    id: null,
    notification_type: "",
    sent_to: "",
    title: "",
    description: "",
  });

  const {
    allNotificationList,
    loading,
    error,
    selectedNotification,
    notificationReport
  } = useSelector((state) => state.allNotification);

  const partnerOptions = useSelector(
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

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    dispatch(getAllNotificationList());
    dispatch(getAllPartnersList());
  }, [dispatch]);

  useEffect(() => {
    if (allNotificationList) {
      setData(allNotificationList);
    }
  }, [allNotificationList]);

  /* ================= AUTO FILL EDIT ================= */
  useEffect(() => {
    if (selectedNotification) {
      setFormData({
        id: selectedNotification.id,
        notification_type: selectedNotification.notification_type || "",
        sent_to: selectedNotification.sent_to || "",
        title: selectedNotification.title || "",
        description: selectedNotification.description || "",
      });
    }
  }, [selectedNotification]);

  /* ================= ADD ================= */
  const handleAddData = async (finaldata) => {
    const resultAction = await dispatch(addNotification(finaldata));

    if (addNotification.fulfilled.match(resultAction)) {
      toast.success("Notification added!");
      dispatch(getAllNotificationList());
      setActiveTab("table");
    } else {
      toast.error("Failed to add notification.");
    }
  };

  /* ================= EDIT / VIEW ================= */
  const handleEditClick = async (record) => {
    const result = await dispatch(getNotificationById(record.id));
    if (getNotificationById.fulfilled.match(result)) {
      setActiveTab("form");
    }
  };

  const handleViewClick = async (record) => {
    const result = await dispatch(getNotificationById(record.id));
    if (getNotificationById.fulfilled.match(result)) {
      setActiveTab("form");
    }
  };

  /* ================= CLEAR FORM ================= */
  const clearForm = () => {
    setFormData({
      id: null,
      notification_type: "",
      sent_to: "",
      title: "",
      description: "",
    });

    dispatch({ type: "allNotification/clearSelectedNotification" });
  };

  /* ================= UI ================= */
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md">
          ⚠️ Failed to load Notification: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Loading Notifications...
        </div>
      ) : (
        <>
          {/* ================= TABS ================= */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("table")}
              className={`px-4 py-2 ${
                activeTab === "table"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
            >
              Notifications
            </button>

            <button
              onClick={() => setActiveTab("form")}
              className={`px-4 py-2 ${
                activeTab === "form"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
            >
              {formData.id ? "Edit Notification" : "Add Notification"}
            </button>
          </div>

          {/* ================= TAB CONTENT ================= */}
          {activeTab === "form" ? (
            <div className="space-y-6">

              {/* FORM CARD */}
              <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                <NotificationForm
                  defaultValues={formData}
                  partnerOptions={formattedPartnerOptions}
                  onSubmit={formData.id ? handleAddData : handleAddData}
                  onCancel={() => {
                    clearForm();
                    setActiveTab("table");
                  }}
                />
              </div>

              {/* REPORT CARD */}
              {notificationReport && formData.id && (
                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-lg font-semibold mb-6">
                    Notification Delivery Report
                  </h3>

                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total Sent" value={notificationReport.total_sent} color="blue" />
                    <StatCard label="Success" value={notificationReport.success_count} color="green" />
                    <StatCard label="Failed" value={notificationReport.failed_count} color="red" />
                    <StatCard
                      label="Success %"
                      value={
                        notificationReport.total_sent > 0
                          ? (
                              (notificationReport.success_count /
                                notificationReport.total_sent) *
                              100
                            ).toFixed(1)
                          : 0
                      }
                      color="yellow"
                      suffix="%"
                    />
                  </div>

                  {notificationReport.failed_details?.length > 0 && (
                    <table className="w-full border text-sm"> 
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border p-3 text-left">User ID</th>
                          <th className="border p-3 text-left">Username</th>
                          <th className="border p-3 text-left">User Email</th>
                          <th className="border p-3 text-left">Error Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notificationReport.failed_details.map((item, index) => (
                          <tr key={index}>
                            <td className="border p-3">
                              {item.username || item.user_id}
                            </td>
                            <td className="border p-3">
                              {item.firstname || ""} {item.lastname || ""} 
                            </td>
                            <td className="border p-3">
                              {item.email}
                            </td>
                              <td className="border p-3">
                                {item.error_code}
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>
          ) : (
           <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
              <div className="p-4">
                <button
                  onClick={() => {
                    clearForm();
                    setActiveTab("form");
                  }}
                  className="px-4 py-2 bg-black text-white rounded"
                >
                  Add New Notification
                </button>
              </div>

              <NotificationTable
                data={data}
                onEdit={handleEditClick}
                onView={handleViewClick}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ================= SMALL STAT CARD COMPONENT ================= */
const StatCard = ({ label, value, color, suffix = "" }) => (
  <div className={`p-4 rounded border bg-${color}-50 text-center`}>
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`text-2xl font-bold text-${color}-700`}>
      {value}
      {suffix}
    </p>
  </div>
);

export default Notification;