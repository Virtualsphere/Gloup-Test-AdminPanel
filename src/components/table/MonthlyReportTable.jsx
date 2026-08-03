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

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "--";

const MonthlyReportTable = ({
    data = [],
    page,
    limit,
    total,
    setPage,
    status,
    setStatus,
    search,
    setSearch,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
}) => {
    const navigate = useNavigate();

    const safeData = Array.isArray(data) ? data : [];

    const filteredData = safeData.filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const userName = `${row.user_firstname || ""} ${row.user_lastname || ""}`.toLowerCase();
        return (
            row.id?.toString().includes(q) ||
            userName.includes(q) ||
            row.user_phone?.toLowerCase().includes(q) ||
            row.user_email?.toLowerCase().includes(q) ||
            row.partner_name?.toLowerCase().includes(q)
        );
    });

    const totalPages = Math.ceil(total / limit);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 3;

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > maxVisible) pages.push("...");

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (page < totalPages - maxVisible + 1) pages.push("...");
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-200 items-end">
                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        type="text"
                        placeholder="Search user, phone, email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                    <label className="block text-xs text-gray-500 mb-1">From</label>
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
                    <label className="block text-xs text-gray-500 mb-1">To</label>
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
                            <th className="px-3 py-2">Customer</th>
                            <th className="px-3 py-2">Salon</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Appointment Date</th>
                            <th className="px-3 py-2">Order Date</th>
                            <th className="px-3 py-2">Amount</th>
                            <th className="px-3 py-2">Payment</th>
                            <th className="px-3 py-2">Action</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="text-center py-6">
                                    No bookings found for this period
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((row) => (
                                <tr key={row.id}>
                                    <td className="px-3 py-2">{row.id}</td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">
                                            {row.user_firstname} {row.user_lastname}
                                        </div>
                                        <div className="text-xs text-gray-500">{row.user_phone}</div>
                                        <div className="text-xs text-gray-500">{row.user_email}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div>{row.partner_name}</div>
                                        <div className="text-xs text-gray-500">{row.partner_phone}</div>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`text-white px-3 py-1 rounded-full text-xs ${
                                                STATUS_COLOR[row.status?.toLowerCase()] || "bg-gray-400"
                                            }`}
                                        >
                                            {STATUS_LABEL[row.status?.toLowerCase()] || row.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">{formatDate(row.appointment_date)}</td>
                                    <td className="px-3 py-2">{formatDate(row.booking_date)}</td>
                                    <td className="px-3 py-2 text-right">
                                        ₹{row.discounted_amount || row.amount || 0}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs ${
                                                row.paid_status === "paid"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {row.paid_status || row.payment_status}
                                        </span>
                                    </td>
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
                    <div className="text-sm text-gray-700">
                        Showing{" "}
                        <span className="font-medium">
                            {total === 0 ? 0 : (page - 1) * limit + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-medium">{Math.min(page * limit, total)}</span>{" "}
                        of <span className="font-medium">{total}</span> results
                    </div>
                </div>
                <div>
                    {totalPages > 0 && (
                        <div className="flex items-center gap-1">
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
                                        className={`px-3 py-1 border rounded ${
                                            page === p
                                                ? "bg-teal-600 text-white border-teal-600"
                                                : "hover:bg-gray-100"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="px-2 py-1 border rounded disabled:opacity-50"
                            >
                                &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyReportTable;
