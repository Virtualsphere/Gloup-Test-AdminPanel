import { useEffect, useState} from "react";
import CouponTable from "../table/CouponTable";
import CouponForm from "../form/CouponForm";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "react-hot-toast";
import {
  getAllCouponsList, addCoupon
} from "../../redux/slices/couponSlice";


const Coupon = ({title }) => {
  const [data, setData] = useState([]);
   const dispatch = useDispatch();
    // Form data state
  const [formData, setFormData] = useState({
      id: null,
      code: "",
      description: "",
      usage_limit: null,
      discount_type: "",
      discount_value: null,
      start_date: "",
      end_date: "",
  });

  // Active tab state
  const [activeTab, setActiveTab] = useState("table");
  const allCouponsList = useSelector((state) => state.allCoupons.allCouponsList);
  const loading = useSelector((state) => state.allCoupons.loading); // fixed key
  const error = useSelector((state) => state.allCoupons.error);     // fixed key

  useEffect(() => {
    dispatch(getAllCouponsList());
      }, [dispatch]);

  useEffect(() => {
    if (allCouponsList) {
      setData(allCouponsList);
    }
  }, [allCouponsList]);

 
const handleAddData = async (finaldata) => {
       
    const toastId = "addCoupon-toast";
    try {
      const resultAction = await dispatch(addCoupon(finaldata));
      // check if fulfilled
      if (addCoupon.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllCouponsList());
        toast.success("Coupon added!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to add coupon.", { id: toastId });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Something went wrong.", { id: toastId });
      console.error("Failed to add data", error);
    }
  };

  const handleUpdateData = async (updatedData) => {
    const toastId = "updateCoupon-toast";
    try {
      const resultAction = await dispatch(addCoupon(updatedData)); // your update thunk
      // check if fulfilled
      if (addCoupon.fulfilled.match(resultAction)) {
        toast.dismiss(toastId);
        await dispatch(getAllCouponsList());
        toast.success("Coupon updated!", { id: toastId });
        setActiveTab("table");
      } else {
        toast.dismiss(toastId);
        toast.error("Failed to update coupon.", { id: toastId });
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
      code: record.code,
      description: record.description,
      usage_limit: record.usage_limit,
      discount_type: record.discount_type,
      discount_value: record.discount_value,
      start_date: record.start_date,
      end_date: record.end_date,
      
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
      code: "",
      description: "",
      usage_limit: null,
      discount_type: "",
      discount_value: null,
      start_date: "",
      end_date: "",
      
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
            ⚠️ Failed to load Coupon: {error}
          </div>
         ) : loading ? (
                  <div className="flex items-center justify-center py-10 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading Coupons...
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
                {title === "Coupon" && "Coupons"}
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
                  ? `Edit ${title === "Coupon" && "Coupon"}`
                  : `Add New ${title === "Coupon" && "Coupon"}`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              {activeTab === "form" ? (
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    {formData.id ? `Edit ${title} ` : `Add New ${title}`}
                  </h3>
                  <CouponForm
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
                      Add New {title === "Coupon" && "Coupon"}
                    </button>
                  </div>
                  <CouponTable
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

   
  
export default Coupon;
