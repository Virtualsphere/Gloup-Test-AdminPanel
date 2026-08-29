import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import GenderProbabilityTable from "../table/GenderProbabilityTable";
import { getGenderProbabilityUsers } from "../../redux/slices/genderProbabilitySlice";

const GenderProbability = ({ title }) => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.genderProbability);

  useEffect(() => {
    dispatch(getGenderProbabilityUsers());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Users with no gender on file, ranked by how strongly their booking history
          (gendered services booked, gendered salons visited) suggests one.
        </p>

        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ {error}
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
            Loading...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <GenderProbabilityTable data={users} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GenderProbability;
