import { useState, useRef, useEffect, useMemo } from "react";
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
  Eye,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import {
  updatePartnerStatus,
  getAllPartnersList,
  deletePartner,
  updateMultiplePartner,
} from "../../redux/slices/partnersSlice";
import { useDispatch } from "react-redux";
import Select from "react-select";
import moment from "moment";
import { Plus } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { Navigation, Pagination, Autoplay } from "swiper/modules";

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const PartnerTable = ({ data, title }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const statusOptions = [
  { value: "pending", label: "Pending Approval" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
  { value: "rejected", label: "Rejected" },
];

const [viewType, setViewType] = useState("card");

  // Filter out inactive from dropdown options for row updates, but keep it for display and global filter
  const getDropdownOptions = () => {
    return statusOptions.filter((option) => option.value !== "pending");
  };

  // Get the current value - this will show inactive if it exists in data
  const getCurrentValue = (currentStatus) => {
    return statusOptions.find((opt) => opt.value === currentStatus);
  };

  const getValue = (item, key) => {
    const details = item?.ownerDetails;

    switch (key) {
      case "ownerName":
        return details?.name;
      case "phone":
        return details?.phone;
      case "email":
        return details?.email;
      case "cityLocation":
        return details?.cityLocation;
      case "registrationDate":
        return details?.registrationDate;
      case "totalAppointments":
        return details?.totalAppointments;
      case "totalRevenue":
        return details?.totalRevenue;
      case "categoryName":
        return item?.categoryName;
      case "location":
        // ✅ Handle location object with city
        return item?.location?.city || item?.location || "";
      default:
        return item?.[key];
    }
  };

  // Original state
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    categoryName: true,
    ownerName: true,
    phone: true,
    email: true,
    location: true,
    createdAt: true,
    TotalAppointment: true,
    totalRevenue: true,
    status: true,
  });
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // New state for filters, pagination
  const [filters, setFilters] = useState({
    status: "active",
    city: "",
    categoryName: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); // Show 50 items per page
  const [selectedRows, setSelectedRows] = useState([]);
  const tableRef = useRef(null);

  const uniqueLocations = useMemo(() => {
    const locations = data
      .map((item) => item.location?.city) // ✅ extract city
      .filter(Boolean); // remove undefined/null

    return [...new Set(locations)]
      .sort()
      .map((city) => ({ value: city, label: city }));
  }, [data]);

  const uniqueCategories = useMemo(() => {
    const categories = data
      .map((item) => getValue(item, "categoryName"))
      .filter(Boolean);
    return [...new Set(categories)]
      .sort()
      .map((cat) => ({ value: cat, label: cat }));
  }, [data]);

  // Filter data based on search term AND filters
  // const filteredData = data.filter((item) => {
  //   const matchesSearch = Object.keys(visibleColumns).some((key) => {
  //     if (!visibleColumns[key]) return false;

  //     const value = getValue(item, key);
  //     const normalizedValue = value?.toString().trim().toLowerCase();
  //     const normalizedSearch = searchTerm.trim().toLowerCase();

  //     // ✅ Log each key and value clearly

  //     return normalizedValue?.includes(normalizedSearch);
  //   });

  //   const matchesStatusFilter =
  //     !filters.status || item.status === filters.status;

  //   const matchesEmailFilter = !filters.email || item.email === filters.email;

  //   const matchesLocationFilter =
  //     !filters.city || getValue(item, "location") === filters.city;

  //   const matchesCategoryFilter =
  //     !filters.categoryName ||
  //     getValue(item, "categoryName") === filters.categoryName;

  //   const matchesDateFilter =
  //     (!filters.startDate && !filters.endDate) ||
  //     (getValue(item, "registrationDate") >= filters.startDate &&
  //       getValue(item, "registrationDate") <= filters.endDate);

  //   return (
  //     matchesSearch &&
  //     matchesStatusFilter &&
  //     matchesLocationFilter &&
  //     matchesCategoryFilter &&
  //     matchesDateFilter &&
  //     matchesEmailFilter
  //   );
  // });
  const filteredData = data.filter((item) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // ✅ Search across all visible columns (even nested ones)
    const matchesSearch =
      !normalizedSearch ||
      Object.keys(visibleColumns).some((key) => {
        if (!visibleColumns[key]) return false;

        let value = getValue(item, key);

        // ✅ Fallback for direct properties like item.email or item.phone
        if (value === undefined && key in item) {
          value = item[key];
        }

        // ✅ If it's an object, search inside its values
        if (typeof value === "object" && value !== null) {
          return Object.values(value).some((nestedVal) =>
            nestedVal?.toString().toLowerCase().includes(normalizedSearch)
          );
        }

        // ✅ Standard match
        return value?.toString().toLowerCase().includes(normalizedSearch);
      });

    // ✅ Apply filters normally
    const matchesStatusFilter =
      !filters.status || item.status === filters.status;

    const matchesLocationFilter =
      !filters.city ||
      getValue(item, "location")?.city === filters.city ||
      getValue(item, "location") === filters.city;
    const matchesCategoryFilter =
      !filters.categoryName ||
      getValue(item, "categoryName") === filters.categoryName;
    const matchesDateFilter =
      (!filters.startDate && !filters.endDate) ||
      (getValue(item, "registrationDate") >= filters.startDate &&
        getValue(item, "registrationDate") <= filters.endDate);

    // ✅ Return combined result
    return (
      matchesSearch &&
      matchesStatusFilter &&
      matchesLocationFilter &&
      matchesCategoryFilter &&
      matchesDateFilter
    );
  });

  console.log(filteredData, "filteredData");

  // Sort data based on sort field and direction
  const compare = (aVal, bVal, dir) => {
    if (typeof aVal === "number" && typeof bVal === "number") {
      return dir === "asc" ? aVal - bVal : bVal - aVal;
    } else {
      aVal = aVal?.toString() ?? "";
      bVal = bVal?.toString() ?? "";
      if (aVal < bVal) return dir === "asc" ? -1 : 1;
      if (aVal > bVal) return dir === "asc" ? 1 : -1;
      return 0;
    }
  };

  const sortedData = [...filteredData].sort((a, b) => {
    const aVal = getValue(a, sortField);
    const bVal = getValue(b, sortField);
    return compare(aVal, bVal, sortDirection);
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

  // Handle selection - per page
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

  const toggleRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    currentItems.length > 0 &&
    currentItems.every((item) => selectedRows.includes(item.id));

  // Bulk actions
  const handleBulkActivate = async () => {
    if (selectedRows.length === 0) return;
    await dispatch(
      updateMultiplePartner({ ids: selectedRows, status: "active" })
    );
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  const handleBulkDeactivate = async () => {
    if (selectedRows.length === 0) return;
    await dispatch(
      updateMultiplePartner({ ids: selectedRows, status: "inactive" })
    );
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedRows.length} selected partners?`
      )
    )
      return;
    const promises = selectedRows.map((id) => dispatch(deletePartner(id)));
    await Promise.all(promises);
    dispatch(getAllPartnersList());
    setSelectedRows([]);
  };

  // Handle export selected
  const handleExportSelected = () => {
    if (selectedRows.length === 0) return;

    const selectedData = data.filter((item) => selectedRows.includes(item.id));

    // Get visible columns to include in CSV
    const headers = Object.keys(visibleColumns)
      .filter((key) => visibleColumns[key])
      .map((key) => key.charAt(0).toUpperCase() + key.slice(1));

    // Create CSV content
    let csvContent = headers.join(",") + "\r\n";

    selectedData.forEach((item) => {
      const row = Object.keys(visibleColumns)
        .filter((key) => visibleColumns[key])
        .map((key) => {
          // Escape commas and quotes in values
          let value = getValue(item, key)?.toString() ?? "";
          if (key === "totalRevenue") {
            value = `$${value}`;
          }
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
    link.setAttribute(
      "download",
      `${title.toLowerCase()}_selected_${selectedRows.length}.csv`
    );
    link.style.visibility = "hidden";

    // Add to document, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePartner = () => {
    navigate(`/createPartner`);
  }

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
          let value = getValue(item, key)?.toString() ?? "";
          if (key === "totalRevenue") {
            value = `$${value}`;
          }
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
    printContent += "<th>Actions</th>";
    printContent += "</tr></thead><tbody>";

    // Add table rows
    sortedData.forEach((item) => {
      printContent += "<tr>";
      Object.keys(visibleColumns).forEach((column) => {
        if (visibleColumns[column]) {
          const val = getValue(item, column);
          const displayVal =
            column === "totalRevenue" ? `$${val || 0}` : val || "";
          printContent += `<td>${displayVal}</td>`;
        }
      });
      printContent += `<td>View</td>`;
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showColumnToggle &&
        !event.target.closest(".column-toggle-container")
      ) {
        setShowColumnToggle(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnToggle]);

  // Reset to first page and clear selections when filters change
  useEffect(() => {
    // setCurrentPage();
    setSelectedRows([]);
  }, [filters, searchTerm]);

  const handleStatusChange = (id, newStatus) => {
    dispatch(updatePartnerStatus({ id: id, status: newStatus })).then(() => {
      dispatch(getAllPartnersList());
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this partner?")) {
      dispatch(deletePartner(id)).then(() => {
        dispatch(getAllPartnersList());
      });
    }
  };


const getPrimaryImageUrl = (img, storeId) => {
  if (!img) return `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`;

  return `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/store/${storeId}/images/${img}`;
};

const getFallbackImageUrl = (img) => {
  return `${import.meta.env.VITE_API_BASE_URL}/images/${img}`;
};

  // Calculate colSpan for no data row
  const visibleColumnCount =
    Object.keys(visibleColumns).filter((key) => visibleColumns[key]).length + 2; // +1 for checkbox +1 for actions

  return (
    <div>
     <div >

  {/* 🔍 ROW 1 → Search + Filters */}
  <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">

    {/* LEFT */}
    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

      {/* SEARCH */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search salons..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      </div>

      {/* FILTERS GROUP */}
      <div className="flex flex-wrap gap-2">

        <Select
          options={statusOptions}
          value={statusOptions.find(opt => opt.value === filters.status)}
          onChange={(opt) =>
            setFilters((prev) => ({ ...prev, status: opt ? opt.value : "" }))
          }
          placeholder="Status"
          className="min-w-[120px] text-sm"
        />

        <Select
          options={uniqueCategories}
          value={uniqueCategories.find(opt => opt.value === filters.categoryName)}
          onChange={(opt) =>
            setFilters((prev) => ({ ...prev, categoryName: opt ? opt.value : "" }))
          }
          placeholder="Category"
          className="min-w-[120px] text-sm"
        />

        <Select
      options={uniqueLocations}
      value={uniqueLocations.find(opt => opt.value === filters.city)}
      onChange={(opt) => setFilters((prev) => ({ ...prev, city: opt ? opt.value : "" }))}
      placeholder="Location"
      isSearchable={false}
      isClearable
      menuPortalTarget={document.body}
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
      className="min-w-[120px] text-sm"
      styles={{
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
      }}
    />

      </div>
    </div>

    {/* RIGHT → PRIMARY ACTION */}
    <button
      onClick={handleCreatePartner}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
    >
      <Plus size={16} />
      Create Partner
    </button>
  </div>

  {/* ⚙️ ROW 2 → ACTION BUTTONS */}
  <div className="flex flex-wrap justify-between items-center mt-4 gap-3">

    {/* LEFT */}
    <button
      onClick={() => setViewType(viewType === "table" ? "card" : "table")}
      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
    >
      {viewType === "table" ? "Card View" : "Table View"}
    </button>

    {/* RIGHT */}
    <div className="flex flex-wrap gap-2">

      <button
        onClick={handleDownloadCSV}
        className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
      >
        <Download size={14} /> Export
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
      >
        <Printer size={14} /> Print
      </button>

      <button
        onClick={() => setShowColumnToggle(!showColumnToggle)}
        className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
      >
        <EyeOff size={14} /> Columns
      </button>

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
              Activate
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
            >
              Delete
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

      {viewType === "card" && (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {currentItems.map((item) => {
    console.log("item:", item); // ✅ log works

    return (
      <div
        key={item.id}
        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group" >
        {/* IMAGE */}

  <div className="relative h-44 w-full overflow-hidden rounded-t-2xl">
    {/* IMAGE / SLIDER */}
    {item?.images?.length > 0 ? (
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation={item.images.length > 1}
        pagination={item.images.length > 1 ? { clickable: true } : false}
        autoplay={item.images.length > 1 ? { delay: 3000 } : false}
        loop={item.images.length > 1}
        className="h-full w-full"
      >
        {item.images.map((img, index) => (
          <SwiperSlide key={index}>
            <img
              src={getPrimaryImageUrl(img, item.id)} // ✅ try S3 first
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;

                if (!e.target.dataset.fallback) {
                  // 👉 First fallback → local server
                  e.target.dataset.fallback = "true";
                  e.target.src = getFallbackImageUrl(img);
                } else {
                  // 👉 Final fallback → default image
                  e.target.src = `${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`;
                }
              }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    ) : (
       <img
        src={`${import.meta.env.VITE_IMAGE_BASE_URL}/uploads/common/no-image.png`}
        className="w-full h-full object-cover opacity-60"
      />
    )}

    {/* LIGHT GRADIENT (FIXED) */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

    {/* TITLE */}
    <div className="absolute bottom-2 left-3 right-3">
      <h2 className="text-white text-sm font-semibold truncate">
        {item?.name || "No Name"}
      </h2>
    </div>

    {/* STATUS BADGE */}
    <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-green-500 text-white shadow">
      {item.status}
    </span>
  </div>
      

        {/* CONTENT */}
        <div className="p-4 flex flex-col justify-between h-[220px]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-gray-800 capitalize truncate">
              {item?.name || "No Name"}
            </h2>

            <span
              className={`text-xs px-2 py-1 rounded-full capitalize ${
                item.status === "active"
                  ? "bg-green-100 text-green-700"
                  : item.status === "inactive"
                  ? "bg-gray-100 text-gray-600"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {item.status}
            </span>
          </div>

        <div className="p-4 space-y-2">
            <p className="text-sm text-gray-600">
              <b>Owner:</b> {item?.ownerDetails?.name || "-"}
            </p>
            <p className="text-sm text-gray-600">
              <b>Phone:</b> {item?.ownerDetails?.phone || "-"}
            </p>
            <p className="text-sm text-gray-600">
              <b>City:</b> {item?.location?.city || "-"}
            </p>
          </div>

        <div className="flex justify-between items-center px-4 pb-4">
        <span className="text-base font-semibold text-gray-800">
          ₹{new Intl.NumberFormat("en-IN").format(item?.totalRevenue || 0)}
        </span>

        <div className="flex gap-2">
          <Link
            to={`/partnerdetails/${item?.id}`}
            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition inline-flex"
          >
            <Eye size={18} />
          </Link>
          <button 
           onClick={() => handleDelete(item?.id)}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
        </div>
      </div>
    );
  })}
          </div>
        </div>
      )}

      {viewType === "table" && (
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
                <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SNo
                </th>
              )}
              {visibleColumns.name && (
                <th
                  onClick={() => handleSort("name")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Name{getSortIcon("name")}
                </th>
              )}
              {visibleColumns.ownerName && (
                <th
                  onClick={() => handleSort("ownerName")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Owner Name{getSortIcon("ownerName")}
                </th>
              )}
              {visibleColumns.phone && (
                <th
                  onClick={() => handleSort("phone")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Phone{getSortIcon("phone")}
                </th>
              )}
              {visibleColumns.email && (
                <th
                  onClick={() => handleSort("email")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Email{getSortIcon("email")}
                </th>
              )}
              {visibleColumns.categoryName && (
                <th
                  onClick={() => handleSort("categoryName")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Category{getSortIcon("categoryName")}
                </th>
              )}
              {visibleColumns.location && (
                <th
                  onClick={() => handleSort("location")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  City/Location{getSortIcon("location")}
                </th>
              )}
              {visibleColumns.createdAt && (
                <th
                  onClick={() => handleSort("createdAt")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Registration Date{getSortIcon("createdAt")}
                </th>
              )}
              {visibleColumns.TotalAppointment && (
                <th
                  onClick={() => handleSort("TotalAppointment")}
                  className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Total Appointments{getSortIcon("TotalAppointment")}
                </th>
              )}
              {visibleColumns.totalRevenue && (
                <th
                  onClick={() => handleSort("totalRevenue")}
                  className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Total Revenue{getSortIcon("totalRevenue")}
                </th>
              )}

              {visibleColumns.status && (
                <th
                  onClick={() => handleSort("status")}
                  className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                >
                  Status{getSortIcon("status")}
                </th>
              )}
              <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => toggleRow(item.id)}
                      className="rounded"
                    />
                  </td>
                  {visibleColumns.id && (
                    <td className="px-6 capitalize">{index + 1}</td>
                  )}
                  {visibleColumns.name && (
                    <td className="px-6 whitespace-nowrap  capitalize">
                      {item?.name}
                    </td>
                  )}
                  {visibleColumns.ownerName && (
                    <td className="px-6 whitespace-nowrap capitalize">
                      {item?.ownerDetails?.name}
                    </td>
                  )}
                  {visibleColumns.phone && (
                    <td className="px-6 whitespace-nowrap ">
                      {item?.ownerDetails?.phone}
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td className="px-6 whitespace-nowrap ">
                      {item?.email}
                    </td>
                  )}
                  {visibleColumns.categoryName && (
                    <td className="px-6 whitespace-nowrap capitalize">
                      {item?.categoryName}
                    </td>
                  )}
                  {visibleColumns.location && (
                    <td className="px-6 whitespace-nowrap">
                      {item?.location?.city}
                    </td>
                  )}
                  {visibleColumns.createdAt && (
                    <td className="px-6 whitespace-nowrap">
                      {item?.createdAt
                        ? moment(item.createdAt).format("YYYY-MM-DD")
                        : "-"}
                    </td>
                  )}

                  {visibleColumns.TotalAppointment && (
                    <td className="px-6 whitespace-nowrap text-right">
                      {item?.TotalAppointment}
                    </td>
                  )}
                  {visibleColumns.totalRevenue && (
                    <td className="px-6 whitespace-nowrap text-right">
                      {item?.totalRevenue != null
                        ? `₹${new Intl.NumberFormat("en-IN").format(
                            item.totalRevenue
                          )}`
                        : "-"}
                    </td>
                  )}

                  {visibleColumns.status && (
                    <td className="px-2 whitespace-nowrap">
                      <div className="relative inline-block">
                        <Select
                          options={getDropdownOptions()} // Filtered options without inactive
                          value={getCurrentValue(item?.status)} // Current value (can include inactive)
                          onChange={(selectedOption) =>
                            handleStatusChange(item?.id, selectedOption.value)
                          }
                          isSearchable={false}
                          className="text-sm"
                          classNamePrefix="minimal-border-select"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"   
                          styles={{
                            control: (base, state) => ({
                              ...base,
                              minHeight: "32px",
                              height: "32px",
                              minWidth: "90px",
                              boxShadow: "none",
                              backgroundColor: "white",
                              cursor: "pointer",
                              border: state.isFocused
                                ? "1px solid #3B82F6"
                                : "1px solid #D1D5DB",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              "&:hover": {
                                borderColor: "#9CA3AF",
                              },
                            }),
                            valueContainer: (base) => ({
                              ...base,
                              padding: "0 2px 0 8px", // Minimal right padding, normal left padding
                              margin: 0,
                              display: "flex",
                              alignItems: "center",
                              height: "30px",
                              flex: "1 1 auto",
                            }),
                            singleValue: (base) => ({
                              ...base,
                              margin: 0,
                              padding: 0,
                              textTransform: "capitalize",
                              fontSize: "13px",
                              fontWeight: "500",
                              color: "#374151",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }),
                            indicatorsContainer: (base) => ({
                              ...base,
                              padding: 0,
                              margin: 0,
                              height: "30px",
                              width: "16px", // Minimal width for arrow
                              flexShrink: 0,
                            }),
                            dropdownIndicator: (base) => ({
                              ...base,
                              padding: "0 4px",
                              margin: 0,
                              width: "16px",
                              height: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9CA3AF",
                              "&:hover": {
                                color: "#6B7280",
                              },
                              svg: {
                                width: "12px",
                                height: "12px",
                              },
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isFocused
                                ? "#000000"
                                : "white",
                              color: state.isFocused ? "white" : "#374151",
                              cursor: "pointer",
                              textTransform: "capitalize",
                              fontSize: "13px",
                              padding: "8px 12px",
                              "&:active": {
                                backgroundColor: "#000000",
                              },
                            }),
                            menu: (base) => ({
                              ...base,
                              marginTop: "2px",
                              zIndex: 9999,
                              borderRadius: "6px",
                              boxShadow:
                                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                              border: "1px solid #E5E7EB",
                              minWidth: "120px",
                            }),
                            menuList: (base) => ({
                              ...base,
                              padding: "4px",
                            }),
                            menuPortal: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                        />
                      </div>
                    </td>
                  )}
                  <td className="px-6">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          navigate(`/partnerdetails/${item?.id}`);
                        }}
                        className="p-1 text-indigo-600 hover:text-green-600 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <Eye size={20} />
                      </button>
                      {/* <button
                        onClick={() => navigate(`/partnerdetails/${item?.id}`)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <Edit size={20} />
                      </button> */}
                      <button
                        onClick={() => handleDelete(item?.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-gray-100 rounded cursor-pointer"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumnCount}
                  className="px-6 text-center text-sm text-gray-500"
                >
                  No {title.toLowerCase()} found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between">
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

export default PartnerTable;
