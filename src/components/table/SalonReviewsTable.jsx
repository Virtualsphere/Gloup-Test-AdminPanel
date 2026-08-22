import { useEffect, useState } from "react";
import { Search, Star, ChevronDown } from "lucide-react";

const SALON_REVIEW_SEARCH_FIELDS = [
  "review_id",
  "store_name",
  "store_email",
  "user_firstname",
  "user_lastname",
  "user_email",
  "rating",
  "review_description",
  "review_status",
];

const matchesSearch = (item, searchTerm) => {
  if (!searchTerm) return true;
  const haystack = SALON_REVIEW_SEARCH_FIELDS.map((key) => item?.[key])
    .filter((value) => value != null && value !== "")
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
};

const StarRating = ({ rating }) => (
  <div className="flex items-center space-x-1">
    {[1, 2, 3, 4, 5].map((star) => {
      const fillPercentage =
        Math.min(Math.max(Number(rating) - star + 1, 0), 1) * 100;

      return (
        <div key={star} className="relative">
          <Star className="w-4 h-4 text-gray-300" />
          {fillPercentage > 0 && (
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
          )}
        </div>
      );
    })}
    <span className="ml-1 text-sm text-gray-600">{rating ?? "—"}</span>
  </div>
);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const SalonReviewsTable = ({ reviews = [], summaries = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = reviews.filter((item) => {
    const matchesStatus =
      statusFilter === "all" || item.review_status === statusFilter;
    const matchesStore =
      storeFilter === "all" || String(item.store_id) === storeFilter;
    return matchesSearch(item, searchTerm) && matchesStatus && matchesStore;
  });

  const sortedData = [...filteredData].sort(
    (a, b) => new Date(b.cretaed_at) - new Date(a.cretaed_at)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, storeFilter]);

  return (
    <div>
      {summaries.length > 0 ? (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Salon rating summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {summaries.slice(0, 6).map((summary) => (
              <div
                key={summary.store_id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
              >
                <p className="font-medium text-gray-900 capitalize truncate">
                  {summary.store_name}
                </p>
                <p className="text-xs text-gray-500 truncate mb-2">
                  {summary.store_email || summary.store_phone || "—"}
                </p>
                <div className="flex items-center justify-between">
                  <StarRating rating={summary.average_rating} />
                  <span className="text-xs text-gray-500">
                    {summary.review_count} review
                    {summary.review_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-3 p-4 border-b border-gray-200">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search salon, customer, or review..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white min-w-[180px]"
        >
          <option value="all">All salons</option>
          {summaries.map((summary) => (
            <option key={summary.store_id} value={String(summary.store_id)}>
              {summary.store_name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Review
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.review_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {indexOfFirstItem + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {item.store_name || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.store_email || item.store_phone || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {`${item.user_firstname || ""} ${
                        item.user_lastname || ""
                      }`.trim() || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.user_email || item.user_phone || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StarRating rating={item.rating} />
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-gray-700 truncate">
                      {item.review_description || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                        item.review_status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.review_status || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(item.cretaed_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No salon reviews found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">
            {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(indexOfLastItem, sortedData.length)}
          </span>{" "}
          of <span className="font-medium">{sortedData.length}</span> reviews
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            <ChevronDown className="rotate-90 h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-md bg-white text-sm text-gray-500 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            <ChevronDown className="rotate-270 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalonReviewsTable;
