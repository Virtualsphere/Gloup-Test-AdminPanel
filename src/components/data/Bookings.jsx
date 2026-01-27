import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import BookingTable from "../table/BookingTable";
import { getbDetail } from "../../redux/slices/bookingSlice";

const Bookings = ({ title }) => {
  const dispatch = useDispatch();

  // 🔹 Dates (default today)
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // 🔹 Filters
  const [status, setStatus] = useState("");

  const [search, setSearch] = useState("");

  // 🔹 Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // 🔹 Redux state
  const {
    bookingsDetail = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.allBookings || {});


  // 🔹 Fetch bookings (CORRECT PLACE)
  useEffect(() => {
    dispatch(
      getbDetail({
        fromDate,
        toDate,
        page,
        limit,
        status: status === "All Bookings" ? "" : status,
      })
    );
  }, [dispatch, fromDate, toDate, page, status]);

  console.log("Bookings Component Data: ", bookingsDetail);
  console.log("Redux state:", { bookingsDetail, total });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
      {/* 🔹 Error */}
      {error ? (
        <div className="text-red-600 bg-red-50 border p-4 rounded">
          Failed to load bookings: {error}
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
          Loading Bookings...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <BookingTable
            data={bookingsDetail}
            page={page}
            limit={limit}
            total={total}
            setPage={setPage}
            status={status}
            setStatus={setStatus}
            search={search}
            setSearch={setSearch}
            fromDate={fromDate}
            toDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
          />

        </div>
      )}
    </div>
  );
};

export default Bookings;
