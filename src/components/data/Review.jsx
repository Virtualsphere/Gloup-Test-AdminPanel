import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReviewTable from "../table/ReviewTable";
import {
  getAllDeleteReviewRequest,
  clearReviewError,
} from "../../redux/slices/reviewSlice";

const Review = ({ title }) => {
  const [data, setData] = useState([]);
  const dispatch = useDispatch();

  const allReviewValue = useSelector(
    (state) => state.allReviews.allDeleteReviewRequest
  );
  const fetchLoading = useSelector((state) => state.allReviews.fetchLoading);
  const error = useSelector((state) => state.allReviews.error);

  useEffect(() => {
    dispatch(getAllDeleteReviewRequest());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(allReviewValue)) {
      setData(allReviewValue);
    }
  }, [allReviewValue]);

  const handleRefresh = () => {
    dispatch(clearReviewError());
    dispatch(getAllDeleteReviewRequest());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={fetchLoading}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-500 -mt-4 mb-4">
        Partner requests to remove customer reviews. Approving soft-deletes the
        review; rejecting keeps it visible in the apps.
      </p>

      {error ? (
        <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
          Failed to load review requests: {error}
        </div>
      ) : null}

      {fetchLoading && data.length === 0 ? (
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
          Loading review delete requests...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <ReviewTable data={data} title={title} onRefresh={handleRefresh} />
        </div>
      )}
    </div>
  );
};

export default Review;
