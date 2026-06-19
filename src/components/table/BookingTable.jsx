import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Select from "react-select";

const statusOptions = [
    { value: "", label: "All Bookings" },
    { value: "booked", label: "Booked" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
];

const STATUS_LABEL = {
    booked: "Booked",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
};


const STATUS_COLOR = {
    booked: "bg-orange-400",
    confirmed: "bg-blue-500",
    completed: "bg-green-600",
    cancelled: "bg-red-500",
    refunded: "bg-purple-600",
};

const BookingsTable = ({ data = [], page, limit, total, setPage, status, setStatus, search, setSearch, fromDate, toDate, setFromDate, setToDate, paymentStatus, setPaymentStatus }) => {

    const navigate = useNavigate();

    const safeData = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
            ? data.data
            : [];

    // 🔍 Client-side search
    const filteredData = safeData
    .filter((row) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        row.id?.toString().includes(q) ||
        row.user_name?.toLowerCase().includes(q) ||
        row.salon_name?.toLowerCase().includes(q) ||
        STATUS_LABEL[row.status?.toLowerCase()]?.toLowerCase().includes(q)
      );
    })
    .filter((row) => {
      if (!paymentStatus) return true;
      return row.payment_status === paymentStatus;
    });

    // 📄 Pagination

    const totalPages = Math.ceil(total / limit);
    const paginatedData = filteredData;



    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 3;

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);

            if (page > maxVisible) {
                pages.push("...");
            }

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (page < totalPages - maxVisible + 1) {
                pages.push("...");
            }

            pages.push(totalPages);
        }

        return pages;
    };


    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-200 items-end">
                {/* Payment Status Toggle — add inside the header flex div */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                        setPage(1);
                        setPaymentStatus(paymentStatus === "success" ? "" : "success");
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                        paymentStatus === "success"
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                        ✓ Paid
                    </button>
                    <button
                        onClick={() => {
                        setPage(1);
                        setPaymentStatus(paymentStatus === "pending" ? "" : "pending");
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                        paymentStatus === "pending"
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                        ✗ Unpaid
                    </button>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => {
                            setPage(1);
                            setSearch(e.target.value);
                        }}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status */}
                <div className="w-full md:w-40">
                    <Select
                        options={statusOptions}
                        value={statusOptions.find((opt) => opt.value === status)}
                        onChange={(opt) => {
                            setPage(1);
                            setStatus(opt?.value || "");
                        }}
                        placeholder="All Bookings"
                        isSearchable={false}
                        isClearable={false}
                        menuPortalTarget={document.body}
                        components={{ IndicatorSeparator: () => null }}
                        styles={{
                            control: (base) => ({
                                ...base,
                                minHeight: "36px",
                                borderRadius: "6px",
                            }),
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                    />
                </div>

                {/* From Date */}
                <div className="w-full md:w-40">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                            setPage(1);
                            setFromDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                {/* To Date */}
                <div className="w-full md:w-40">
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                            setPage(1);
                            setToDate(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-scroll full overflow-y-scroll max-h-[600px]">
                <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-3 py-2">Booking ID</th>
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2">Salon</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Date & Time</th>
                            <th className="px-3 py-2">Payable</th>
                            <th className="px-3 py-2">Order Date</th>
                            <th className="px-3 py-2">Action</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-6">
                                    No bookings found
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => (
                                <tr key={row.id}>
                                    <td className="px-3 py-2">{row.id}</td>
                                    <td className="px-3 py-2">{row.user_name}</td>
                                    <td className="px-3 py-2">{row.salon_name}</td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`text-white px-3 py-1 rounded-full text-xs ${STATUS_COLOR[row.status?.toLowerCase()]
                                                }`}
                                        >
                                            {STATUS_LABEL[row.status?.toLowerCase()] || row.status}
                                        </span>
                                    </td>

                                    <td className="px-3 py-2">{row.booking_datetime}</td>
                                    <td className="px-3 py-2 text-right">
                                        ₹{row.payable_amount}
                                    </td>
                                    <td className="px-3 py-2">{row.order_date}</td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => navigate(`/bookings/${row.id}`)}
                                            className="bg-teal-700 text-white px-3 py-1 rounded"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <div className="text-sm text-gray-700">
                            Showing{" "}
                            <span className="font-medium">
                                {(page - 1) * limit + 1}
                            </span>{" "}
                            to{" "}
                            <span className="font-medium">
                                {Math.min(page * limit, total)}
                            </span>{" "}
                            of <span className="font-medium">{filteredData.length}</span> results
                        </div>
                    </div>
                </div>
                <div>
                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="flex items-center justify-between px-4 py-3">
                            {/* Controls */}
                            <div className="flex items-center gap-1">
                                {/* Prev */}
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-2 py-1 border rounded disabled:opacity-50"
                                >
                                    &lt;
                                </button>

                                {getPageNumbers().map((p, i) =>
                                    p === "..." ? (
                                        <span key={i} className="px-2 text-gray-500">
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`px-3 py-1 border rounded ${page === p
                                                ? "bg-teal-600 text-white border-teal-600"
                                                : "hover:bg-gray-100"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                {/* Next */}
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === totalPages}
                                    className="px-2 py-1 border rounded disabled:opacity-50"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BookingsTable;
