import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import BookingTable from "../table/BookingTable";
import { getbDetailByOrderDate } from "../../redux/slices/bookingSlice";

const getTodayDateString = () => new Date().toISOString().split("T")[0];

const BookingsByOrderDate = ({ title }) => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayDateString();

  // 🔹 Dates (default today), filters, and pagination all live in the URL
  // so they survive navigating into a booking's detail page and back.
  const fromDate = searchParams.get("fromDate") || today;
  const toDate = searchParams.get("toDate") || today;
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const paymentStatus = searchParams.has("paymentStatus")
    ? searchParams.get("paymentStatus")
    : "success";
  const page = Number(searchParams.get("page")) || 1;

  const limit = 50;

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const setFromDate = (value) => updateParam("fromDate", value);
  const setToDate = (value) => updateParam("toDate", value);
  const setStatus = (value) => updateParam("status", value);
  const setSearch = (value) => updateParam("search", value);
  const setPage = (value) => updateParam("page", value === 1 ? "" : String(value));
  // paymentStatus's default ("success") differs from its cleared value (""),
  // so unlike the others it must always stay present in the URL — deleting
  // it on clear would make it fall back to "success" instead of "off".
  const setPaymentStatus = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("paymentStatus", value ?? "");
      return next;
    });
  };

  // 🔹 Redux state
  const {
    bookingsByOrderDate = [],
    totalByOrderDate = 0,
    loadingByOrderDate,
    errorByOrderDate,
  } = useSelector((state) => state.allBookings || {});

  // 🔹 Fetch bookings
  useEffect(() => {
    dispatch(
      getbDetailByOrderDate({
        fromDate,
        toDate,
        page,
        limit,
        status: status === "All Bookings" ? "" : status,
      })
    );
  }, [dispatch, fromDate, toDate, page, status]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
      {/* 🔹 Error */}
      {errorByOrderDate ? (
        <div className="text-red-600 bg-red-50 border p-4 rounded">
          Failed to load bookings: {errorByOrderDate}
        </div>
      ) : loadingByOrderDate ? (
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
            data={bookingsByOrderDate}
            page={page}
            limit={limit}
            total={totalByOrderDate}
            setPage={setPage}
            status={status}
            setStatus={setStatus}
            search={search}
            setSearch={setSearch}
            fromDate={fromDate}
            toDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
          />
        </div>
      )}
    </div>
  );
};

export default BookingsByOrderDate;
