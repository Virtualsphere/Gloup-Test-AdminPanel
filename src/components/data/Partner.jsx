import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PartnerTable from "../table/PartnerTable";
import { getAllPartnersList } from "../../redux/slices/partnersSlice";
import { Toaster, toast } from "react-hot-toast";

const Partner = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();

  const allPartnersValue = useSelector(
    (state) => state.allPartners.allPartnersList
  );
  const loading = useSelector((state) => state.allPartners.loading);
  const error = useSelector((state) => state.allPartners.error);

  console.log('Partner page')

  useEffect(() => {
    dispatch(getAllPartnersList());
  }, [dispatch]);

  useEffect(() => {
    if (allPartnersValue) {
      setData(allPartnersValue);
    }
  }, [allPartnersValue]);

  return (
    <div className="space-y-6">
      <div>
        {/* <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>*/}
        {/* Error Message */}
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ Failed to load partners: {error}
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
            Loading partners...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <PartnerTable data={data} title={title} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Partner;
