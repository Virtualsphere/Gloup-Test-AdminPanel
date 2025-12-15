import { useState, useRef, useEffect } from "react";
import {
  Search,
  Download,
  Printer,
  EyeOff,
  ChevronDown,
  Edit,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import moment from "moment";


const CouponTable = ({ data, title, onEdit }) => {
  // Original state
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    code: true,
    description: true,
    usage_limit: true,
    discount_type:true,
    discount_value: true,
    start_date: true,
    end_date: true,
    status: true,
         
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortField, setSortField] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");

  // New state for filters, pagination, and filter dropdown
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 5 items per page
  const tableRef = useRef(null);

  // Get unique departments and statuses for filter dropdowns

  // Filter data based on search term AND filters
  const filteredData = data.filter((item) => {
    const matchesSearch = Object.keys(visibleColumns).some(
      (key) =>
        visibleColumns[key] &&
        item[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesDepartmentFilter =
      !filters.department || item.department === filters.department;

    return matchesSearch && matchesDepartmentFilter;
  });

  // Sort data based on sort field and direction
  const sortedData = [...filteredData].sort((a, b) => {
    if (a[sortField] < b[sortField]) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (a[sortField] > b[sortField]) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Get current page data for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Generate array of page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Toggle column visibility
  const toggleColumn = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle CSV download (real implementation)
  const handleDownloadCSV = () => {
    // Get visible columns to include in CSV
    const headers = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => key.charAt(0).toUpperCase() + key.slice(1));

    // Create CSV content
    let csvContent = headers.join(",") + "\r\n";

    sortedData.forEach((item) => {
      const row = Object.keys(visibleColumns)
        .filter((key) => visibleColumns[key])
        .map((key) => {
          // Escape commas and quotes in values
          const value = item[key].toString();
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",");

      csvContent += row + "\r\n";
    });

    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Set up download attributes
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.toLowerCase()}_data.csv`);
    link.style.visibility = "hidden";

    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle print (real implementation)
  const handlePrint = () => {
    // Store original body content
    const originalContent = document.body.innerHTML;

    // Create a print-friendly version of the table
    let printContent = "<html><head><title>Print</title>";
    printContent += "<style>";
    printContent += "table { border-collapse: collapse; width: 100%; }";
    printContent +=
      "th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }";
    printContent += "th { background-color: #f2f2f2; }";
    printContent += "</style></head><body>";
    printContent += `<h2>${title}</h2>`;
    printContent += "<table>";

    // Add table headers
    printContent += "<thead><tr>";
    Object.keys(visibleColumns).forEach((column) => {
      if (visibleColumns[column]) {
        printContent += `<th>${
          column.charAt(0).toUpperCase() + column.slice(1)
        }</th>`;
      }
    });
    printContent += "</tr></thead><tbody>";

    // Add table rows
    sortedData.forEach((item) => {
      printContent += "<tr>";
      Object.keys(visibleColumns).forEach((column) => {
        if (visibleColumns[column]) {
          if (column === "status") {
            printContent += `<td><span>${item[column]}</span></td>`;
          } else if (column === "feedAttachment") {
            printContent += `<td><span>${
              import.meta.env.VITE_API_BASE_URL + item[column]
            }</span></td>`;
          } else {
            printContent += `<td>${item[column]}</td>`;
          }
        }
      });
      printContent += "</tr>";
    });

    printContent += "</tbody></table></body></html>";

    // Create an iframe for printing
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-999px";
    document.body.appendChild(printFrame);

    // Write content to iframe and print it
    printFrame.contentDocument.write(printContent);
    printFrame.contentDocument.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      document.body.removeChild(printFrame);
    }, 500);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get sort icon for column
  const getSortIcon = (field) => {
    if (sortField !== field) return null;

    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="ml-1" />
    ) : (
      <ArrowDown size={14} className="ml-1" />
    );
  };

  // Reset filters

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showColumnToggle &&
        !event.target.closest(".column-toggle-container")
      ) {
        setShowColumnToggle(false);
      }
      if (showFilters && !event.target.closest(".filter-container")) {
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnToggle, showFilters]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

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
              <span className="text-sm">Filter</span>
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
                        {column.charAt(0).toUpperCase() + column.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" ref={tableRef}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {visibleColumns.id && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SNo
                </th>
              )}
              {visibleColumns.code && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
              )}
              {visibleColumns.description && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              )}
              {visibleColumns.usage_limit && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Limit
                </th>
              )}
              {visibleColumns. discount_type && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Discount Type
                </th>
              )}
              {visibleColumns.discount_value && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount Value
                </th>
              )}
          
              {visibleColumns.start_date && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
              )}

               {visibleColumns.end_date && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
              )}
              
              {visibleColumns.status && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                <tr key={item?.id}>
                  {visibleColumns.id && (
                    <td className="px-6 py-4 capitalize">{index + 1}</td>
                  )}
                  {visibleColumns.code && (
                    <td className="px-6 py-4 capitalize">{item?.code}</td>
                  )}
                  {visibleColumns.description && (
                    <td className="px-6 py-4 capitalize">{item?.description}</td>
                  )}
                  {visibleColumns.usage_limit && (
                    <td className="px-6 py-4 capitalize">{item?.usage_limit}</td>
                  )}
                  {visibleColumns.discount_type && (
                    <td className="px-6 py-4 capitalize">{item?.discount_type}</td>
                  )}
                  {visibleColumns.discount_value && (
                    <td className="px-6 py-4 capitalize">{item?.discount_value}</td>
                  )}
                  {visibleColumns.start_date && (
                    <td className="px-6 py-4 capitalize">
                       {moment(item?.start_date).format("MMMM Do YYYY, h:mm A")}
                      </td>
                  )}
                  {visibleColumns.end_date && (
                  <td className="px-6 py-4 capitalize">
                       {moment(item?.end_date).format("MMMM Do YYYY, h:mm A")}
                      </td>
                  )}

                   {visibleColumns.status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 inline-flex text-xs leading-5 font-semibold rounded capitalize ${
                          item?.status === "active"
                            ? "bg-green-100 text-green-800"
                            : item?.status === "terminated"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item?.status}
                      </span>
                    </td>
                  )}              

                  
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <button
                        style={{ cursor: "pointer" }}
                        onClick={() => onEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                        >
                        Edit
                        </button>
                    {/* <button
                      style={{ cursor: "pointer" }}
                      onClick={() => onDelete(item?.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button> */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
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
                className={`flex items-center justify-center px-3 py-2 rounded-l-md bg-white text-sm font-medium cursor-pointer ${
                  currentPage === 1
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
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                            currentPage === pageNum
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
                        className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                          currentPage === 1
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
                        className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                          currentPage === totalPages
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
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                            currentPage === 2
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
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                            currentPage === 3
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
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                            currentPage === totalPages - 2
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
                          className={`flex items-center justify-center w-10 py-2 cursor-pointer mx-0.5 rounded ${
                            currentPage === totalPages - 1
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
                className={`flex items-center justify-center px-3 py-2 rounded-r-md bg-white text-sm font-medium cursor-pointer ${
                  currentPage === totalPages || totalPages === 0
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

export default CouponTable;
