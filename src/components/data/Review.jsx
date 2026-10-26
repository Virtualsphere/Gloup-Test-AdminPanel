import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReviewTable from "../table/ReviewTable";
import SalonReviewsTable from "../table/SalonReviewsTable";
import {
  getAllDeleteReviewRequest,
  getAllSalonReviews,
  clearReviewError,
} from "../../redux/slices/reviewSlice";

const TABS = {
  SALON_REVIEWS: "salon_reviews",
  DELETE_REQUESTS: "delete_requests",
};

const Review = ({ title }) => {
  const [activeTab, setActiveTab] = useState(TABS.SALON_REVIEWS);
  const [deleteRequestData, setDeleteRequestData] = useState([]);
  const dispatch = useDispatch();

  const allReviewValue = useSelector(
    (state) => state.allReviews.allDeleteReviewRequest
  );
  const salonReviews = useSelector((state) => state.allReviews.salonReviews);
  const salonSummaries = useSelector(
    (state) => state.allReviews.salonSummaries
  );
  const fetchLoading = useSelector((state) => state.allReviews.fetchLoading);
  const salonReviewsLoading = useSelector(
    (state) => state.allReviews.salonReviewsLoading
  );
  const error = useSelector((state) => state.allReviews.error);
  const salonReviewsError = useSelector(
    (state) => state.allReviews.salonReviewsError
  );

  useEffect(() => {
    dispatch(getAllSalonReviews({ status: "all" }));
    dispatch(getAllDeleteReviewRequest());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(allReviewValue)) {
      setDeleteRequestData(allReviewValue);
    }
  }, [allReviewValue]);

  const handleRefresh = () => {
    dispatch(clearReviewError());
    if (activeTab === TABS.SALON_REVIEWS) {
      dispatch(getAllSalonReviews({ status: "all" }));
    } else {
      dispatch(getAllDeleteReviewRequest());
    }
  };

  const isLoading =
    activeTab === TABS.SALON_REVIEWS ? salonReviewsLoading : fetchLoading;
  const activeError =
    activeTab === TABS.SALON_REVIEWS ? salonReviewsError : error;
  const hasData =
    activeTab === TABS.SALON_REVIEWS
      ? salonReviews.length > 0
      : deleteRequestData.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab(TABS.SALON_REVIEWS)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === TABS.SALON_REVIEWS
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Salon Reviews & Ratings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(TABS.DELETE_REQUESTS)}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === TABS.DELETE_REQUESTS
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Delete Requests
          {deleteRequestData.length > 0 ? (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
              {deleteRequestData.length}
            </span>
          ) : null}
        </button>
      </div>

      <p className="text-sm text-gray-500 -mt-2">
        {activeTab === TABS.SALON_REVIEWS
          ? "View customer ratings and reviews submitted for each salon."
          : "Partner requests to remove customer reviews. Approving soft-deletes the review; rejecting keeps it visible in the apps."}
      </p>

      {activeError ? (
        <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
          Failed to load data: {activeError}
        </div>
      ) : null}

      {isLoading && !hasData ? (
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
          {activeTab === TABS.SALON_REVIEWS
            ? "Loading salon reviews..."
            : "Loading review delete requests..."}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {activeTab === TABS.SALON_REVIEWS ? (
            <SalonReviewsTable
              reviews={salonReviews}
              summaries={salonSummaries}
            />
          ) : (
            <ReviewTable
              data={deleteRequestData}
              title={title}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Review;
