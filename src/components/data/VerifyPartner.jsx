import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import VerifyPartnerTable from "../table/VerifyPartnertable";
import { getVerifiedPartnersList } from "../../redux/slices/partnersSlice";
import { Toaster, toast } from "react-hot-toast";

const VerifyPartner = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();

  const verifiedPartnersValue = useSelector(
    (state) => state.allPartners.verifiedPartners
  );
  const loading = useSelector((state) => state.allPartners.loading);
  const error = useSelector((state) => state.allPartners.error);

  console.log('Verify Partner page')

 useEffect(() => {
  dispatch(getVerifiedPartnersList());
}, []); // dispatch is stable, safe to ignore

  useEffect(() => {
    if (verifiedPartnersValue) {
      setData(verifiedPartnersValue);
    }
  }, [verifiedPartnersValue]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
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
            <VerifyPartnerTable data={data} title={title} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyPartner;
