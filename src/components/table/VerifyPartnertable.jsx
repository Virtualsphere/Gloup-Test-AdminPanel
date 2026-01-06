import { useState, useEffect, useRef } from "react";
import {
  Download, Search, Printer, Eye, X,
  EyeOff, ChevronDown, ArrowUp, ArrowDown
} from "lucide-react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateMultiplePartner, getVerifiedPartnersList } from "../../redux/slices/partnersSlice";
import { Toaster, toast } from "react-hot-toast";

const VerifyPartnerTable = ({ data, title }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tableRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    categoryName: true,
    ownerName: true,
    phone: true,
    email: true,
    location: true,
    createdAt: true,
    status: true,
  });


  console.log('Verify Partner page list table')


  // 🔹 Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [remarks, setRemarks] = useState("");

  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  const handleSelectAll = () => {
    const currentIds = currentItems.map((item) => item.id);
    setSelectedRows((prev) => {
      const allCurrentSelected = currentIds.every((id) => prev.includes(id));
      if (allCurrentSelected) {
        return prev.filter((id) => !currentIds.includes(id));
      } else {
        return [...new Set([...prev, ...currentIds])];
      }
    });
  };

  // 🔹 Checkbox toggle
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id)
        : [...prev, id]
    );
  };

  // 🔹 Select all pending
  const selectAllPending = () => {
    const pendingIds = filteredData
      .filter((p) => p.status === "pending")
      .map((p) => p.id);
    setSelectedIds(pendingIds);
  };

  // 🔹 Filter
  const filteredData = data.filter((item) =>
    Object.values(item)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // 🔹 Sort
  const sortedData = [...filteredData].sort((a, b) => {
    if (a[sortField] < b[sortField]) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (a[sortField] > b[sortField]) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // 🔹 Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) =>
    sortField === field &&
    (sortDirection === "asc" ? (
      <ArrowUp size={14} />
    ) : (
      <ArrowDown size={14} />
    ));

  const isAllSelected =
    currentItems.length > 0 &&
    currentItems.every((item) => selectedRows.includes(item.id));

    const safeValue = (val) =>
  val === null || val === undefined ? "" : String(val);

  // Handle CSV download (real implementation)
const handleDownloadCSV = () => {
  if (!sortedData.length) return;

  // Headers
  const headers = Object.keys(visibleColumns)
    .filter((key) => visibleColumns[key])
    .map(formatHeader);

  // Add BOM for Excel compatibility
  let csvContent = "\uFEFF" + headers.join(",") + "\r\n";

  // Rows
  sortedData.forEach((item) => {
    const row = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => {
        let value = safeValue(getValue(item, key));
        // Escape quotes
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(",");

    csvContent += row + "\r\n";
  });

  // Download
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, "_")}_data.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  URL.revokeObjectURL(url);
};


  const formatHeader = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

const escapeHTML = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // Handle print (real implementation)
const handlePrint = () => {
  let printContent = `
    <html>
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        h2 { margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <h2>${escapeHTML(title)}</h2>
      <table>
        <thead>
          <tr>
  `;

  Object.keys(visibleColumns).forEach((col) => {
    if (visibleColumns[col]) {
      printContent += `<th>${formatHeader(col)}</th>`;
    }
  });

  printContent += `<th>Actions</th></tr></thead><tbody>`;

  sortedData.forEach((item) => {
    printContent += "<tr>";
    Object.keys(visibleColumns).forEach((col) => {
      if (visibleColumns[col]) {
        const val = getValue(item, col);
        const displayVal =
          col === "totalRevenue" ? `₹${val || 0}` : val || "";
        printContent += `<td>${escapeHTML(displayVal)}</td>`;
      }
    });
    printContent += `<td>View</td></tr>`;
  });

  printContent += "</tbody></table></body></html>";

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(printContent);
  iframe.contentDocument.close();

  iframe.onload = () => {
    iframe.contentWindow.print();
    document.body.removeChild(iframe);
  };
};


  const handleExportSelected = () => {
  if (selectedRows.length === 0) return;

  const selectedData = data.filter((item) =>
    selectedRows.includes(item.id)
  );

  const headers = Object.keys(visibleColumns)
    .filter((key) => visibleColumns[key])
    .map(formatHeader);

  let csvContent = headers.join(",") + "\r\n";

  selectedData.forEach((item) => {
    const row = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => {
        let value = getValue(item, key) ?? "";
        if (key === "totalRevenue") value = `₹${value}`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",");

    csvContent += row + "\r\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase()}_selected_${selectedRows.length}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


  const visibleColumnCount =
    Object.keys(visibleColumns).filter((key) => visibleColumns[key]).length + 2; // +1 for checkbox +1 for actions

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getSelectedPartnerNames = () => {
    return data
      .filter((item) => selectedRows.includes(item.id))
      .map((item) => item.name);
  };

  const handleBulkActivate = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one partner");
      return;
    }

    const names = getSelectedPartnerNames();
    const displayNames =
      names.length > 3
        ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more`
        : names.join(", ");

    const toastId = toast.loading(`Approving: ${displayNames}`);

    try {
      await dispatch(
        updateMultiplePartner({
          partnerIds: selectedRows,
          status: "completed",
        })
      ).unwrap();

      toast.success(`Approved: ${displayNames}`, { id: toastId });

      dispatch(getVerifiedPartnersList());
      setSelectedRows([]);
    } catch (error) {
      toast.error(error?.message || "Failed to approve partners", {
        id: toastId,
      });
    }
  };

  const getValue = (item, key) => {
    switch (key) {
      case "ownerName":
        return item?.name;
      case "phone":
        return item?.phone;
      case "email":
        return item?.email;
      case "registrationDate":
        return item?.registrationDate
          ? moment(item.registrationDate).format("DD-MM-YYYY HH:mm:ss")
          : "-";
      case "categoryName":
        return item?.store_type;
      case "location":
        // ✅ Handle location object with city
        return item?.city || item?.area || "";
      default:
        return item?.[key];
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one partner");
      return;
    }

    const names = getSelectedPartnerNames();
    const displayNames =
      names.length > 3
        ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more`
        : names.join(", ");

    const toastId = toast.loading(`Rejecting: ${displayNames}`);

    try {
      await dispatch(
        updateMultiplePartner({
          partnerIds: selectedRows,
          status: "rejected",
        })
      ).unwrap();

      toast.success(`Rejected: ${displayNames}`, { id: toastId });

      dispatch(getVerifiedPartnersList());
      setSelectedRows([]);
    } catch (error) {
      toast.error(error?.message || "Failed to reject partners", {
        id: toastId,
      });
    }
  };



  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };


  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-gray-200">
        <div className="relative w-full md:w-64 mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>


        <div className="flex space-x-2">
          <button
            style={{ cursor: "pointer" }}
            onClick={handleDownloadCSV}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Download size={16} className="mr-1" />
            <span className="text-sm">Export</span>
          </button>

          <button
            style={{ cursor: "pointer" }}
            onClick={handlePrint}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <Printer size={16} className="mr-1" />
            <span className="text-sm">Print</span>
          </button>

          <div className="relative column-toggle-container">
            <button
              style={{ cursor: "pointer" }}
              onClick={() => setShowColumnToggle(!showColumnToggle)}
              className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <EyeOff size={16} className="mr-1" />
              <span className="text-sm">Columns</span>
              <ChevronDown size={16} className="ml-1" />
            </button>

            {showColumnToggle && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Toggle Columns
                  </h4>
                  <div className="space-y-1">
                    {Object.keys(visibleColumns).map((column) => (
                      <label key={column} className="flex items-center text-sm">
                        <input
                          style={{ cursor: "pointer" }}
                          type="checkbox"
                          checked={visibleColumns[column]}
                          onChange={() => toggleColumn(column)}
                          className="mr-2"
                        />
                        {column.charAt(0).toUpperCase() +
                          column.slice(1).replace(/([A-Z])/g, " $1")}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {selectedRows.length} selected
            </span>
            <button
              onClick={handleExportSelected}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
            >
              Export
            </button>
            <button
              onClick={handleBulkActivate}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
            >
              Rejected
            </button>
          </div>
          <button
            onClick={() => setSelectedRows([])}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={16} className="mr-1" />
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-scroll full overflow-y-scroll max-h-[600px]">
        <table className="w-full" ref={tableRef}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-3 w-8">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </th>
              {visibleColumns.id && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SNo
                </th>
              )}
              {visibleColumns.name && (
                <th
                  onClick={() => handleSort("name")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Name{getSortIcon("name")}
                </th>
              )}
              {visibleColumns.ownerName && (
                <th
                  onClick={() => handleSort("ownerName")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Owner Name{getSortIcon("ownerName")}
                </th>
              )}
              {visibleColumns.phone && (
                <th
                  onClick={() => handleSort("phone")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Phone{getSortIcon("phone")}
                </th>
              )}
              {visibleColumns.email && (
                <th
                  onClick={() => handleSort("email")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Email{getSortIcon("email")}
                </th>
              )}
              {visibleColumns.categoryName && (
                <th
                  onClick={() => handleSort("categoryName")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Category{getSortIcon("categoryName")}
                </th>
              )}
              {visibleColumns.location && (
                <th
                  onClick={() => handleSort("location")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  City/Location{getSortIcon("location")}
                </th>
              )}
              {visibleColumns.createdAt && (
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Registration Date{getSortIcon("createdAt")}
                </th>
              )}

              {visibleColumns.status && (
                <th
                  onClick={() => handleSort("status")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Status{getSortIcon("status")}
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-2 py-4 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="rounded"
                    />
                  </td>
                  {visibleColumns.id && (
                    <td className="px-6 py-4 capitalize">{index + 1}</td>
                  )}
                  {visibleColumns.name && (
                    <td className="px-6 py-4 whitespace-nowrap  capitalize">
                      {item?.name}
                    </td>
                  )}
                  {visibleColumns.ownerName && (
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {item?.name}
                    </td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-6 py-4 whitespace-nowrap ">
                      {item?.phone}
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-6 py-4 whitespace-nowrap ">
                      {item?.email}
                    </td>
                  )}
                  {visibleColumns.categoryName && (
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {item?.store_type}
                    </td>
                  )}
                  {visibleColumns.location && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {[item?.area, item?.city].filter(Boolean).join(" / ") || "-"}
                    </td>
                  )}

                  {visibleColumns.createdAt && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item?.createdAt
                        ? moment(item.createdAt).format("YYYY-MM-DD")
                        : "-"}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="relative inline-block">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          Pending
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          navigate(`/partnerdetails/${item?.id}`);
                        }}
                        className="p-1 text-indigo-600 hover:text-green-600 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <Eye size={20} />
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No {title.toLowerCase()} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(indexOfLastItem, sortedData.length)}
              </span>{" "}
              of <span className="font-medium">{sortedData.length}</span>{" "}
              results
            </p>
          </div>
          <div className="flex">
            <nav className="flex rounded-md" aria-label="Pagination">
              {/* Previous button with ChevronLeft icon */}
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`flex items-center justify-center px-3 py-2 rounded-l-md bg-white text-sm font-medium cursor-pointer ${currentPage === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                  }`}
              >
                <ChevronDown className="rotate-90 h-5 w-5" />
              </button>

              {/* Fixed width container for page numbers - no borders */}
              <div className="flex">
                {(() => {
                  // Always show exactly 5 elements for consistent width:
                  // First page, ellipsis/page, current/adjacent, ellipsis/page, last page

                  // Create array to hold exactly 5 pagination items
                  const pages = new Array(5).fill(null);

                  if (totalPages <= 5) {
                    // Simple case: just show all pages
                    for (let i = 0; i < Math.min(totalPages, 5); i++) {
                      const pageNum = i + 1;
                      pages[i] = (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === pageNum
                              ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                            } text-sm transition-all duration-200`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  } else {
                    // Complex case: 5+ pages, show strategic positions

                    // Element 0: Always first page
                    pages[0] = (
                      <button
                        key={1}
                        onClick={() => paginate(1)}
                        className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === 1
                            ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                          } text-sm transition-all duration-200`}
                      >
                        1
                      </button>
                    );

                    // Element 4: Always last page
                    pages[4] = (
                      <button
                        key={totalPages}
                        onClick={() => paginate(totalPages)}
                        className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === totalPages
                            ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                          } text-sm transition-all duration-200`}
                      >
                        {totalPages}
                      </button>
                    );

                    // Next, determine elements 1, 2, and 3 based on current page position
                    if (currentPage <= 3) {
                      // Near the start: show 1, 2, 3, ..., last
                      pages[1] = (
                        <button
                          key={2}
                          onClick={() => paginate(2)}
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === 2
                              ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                            } text-sm transition-all duration-200`}
                        >
                          2
                        </button>
                      );

                      pages[2] = (
                        <button
                          key={3}
                          onClick={() => paginate(3)}
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === 3
                              ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                            } text-sm transition-all duration-200`}
                        >
                          3
                        </button>
                      );

                      pages[3] = (
                        <button
                          key="right-dots"
                          onClick={() => paginate(Math.min(4, totalPages - 1))}
                          className="flex items-center justify-center w-10 py-2 bg-white text-gray-700 hover:bg-gray-100 text-sm cursor-pointer mx-0.5 rounded transition-all duration-200"
                        >
                          ...
                        </button>
                      );
                    } else if (currentPage >= totalPages - 2) {
                      // Near the end: show 1, ..., last-2, last-1, last
                      pages[1] = (
                        <button
                          key="left-dots"
                          onClick={() => paginate(Math.max(2, totalPages - 3))}
                          className="flex items-center justify-center w-10 py-2 bg-white text-gray-700 hover:bg-gray-100 text-sm cursor-pointer mx-0.5 rounded transition-all duration-200"
                        >
                          ...
                        </button>
                      );

                      pages[2] = (
                        <button
                          key={totalPages - 2}
                          onClick={() => paginate(totalPages - 2)}
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === totalPages - 2
                              ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                            } text-sm transition-all duration-200`}
                        >
                          {totalPages - 2}
                        </button>
                      );

                      pages[3] = (
                        <button
                          key={totalPages - 1}
                          onClick={() => paginate(totalPages - 1)}
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${currentPage === totalPages - 1
                              ? "bg-black text-white font-medium transform scale-110 z-10 shadow-md shadow-black"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                            } text-sm transition-all duration-200`}
                        >
                          {totalPages - 1}
                        </button>
                      );
                    } else {
                      // Middle case: show 1, ..., current, ..., last
                      pages[1] = (
                        <button
                          key="left-dots"
                          onClick={() => paginate(Math.max(2, currentPage - 1))}
                          className="flex items-center justify-center w-10 py-2 bg-white text-gray-700 hover:bg-gray-100 text-sm cursor-pointer mx-0.5 rounded transition-all duration-200"
                        >
                          ...
                        </button>
                      );

                      pages[2] = (
                        <button
                          key={currentPage}
                          onClick={() => paginate(currentPage)}
                          className="flex items-center justify-center w-10 py-2 bg-black text-white font-medium text-sm cursor-pointer mx-0.5 rounded transform scale-110 z-10 shadow-md shadow-black transition-all duration-200"
                        >
                          {currentPage}
                        </button>
                      );

                      pages[3] = (
                        <button
                          key="right-dots"
                          onClick={() =>
                            paginate(Math.min(currentPage + 1, totalPages - 1))
                          }
                          className="flex items-center justify-center w-10 py-2 bg-white text-gray-700 hover:bg-gray-100 text-sm cursor-pointer mx-0.5 rounded transition-all duration-200"
                        >
                          ...
                        </button>
                      );
                    }
                  }

                  // Filter out any null elements (if totalPages < 5)
                  return pages.filter(Boolean);
                })()}
              </div>

              {/* Next button with ChevronRight icon */}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className={`flex items-center justify-center px-3 py-2 rounded-r-md bg-white text-sm font-medium cursor-pointer ${currentPage === totalPages || totalPages === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-500 hover:bg-gray-100"
                  }`}
              >
                <ChevronDown className="rotate-270 h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPartnerTable;
