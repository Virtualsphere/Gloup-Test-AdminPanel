
import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux";
import { getStoreServices } from "../../redux/slices/partnersSlice";
import { Clock, Tag, Scissors, Sparkles, Heart, Search, Filter, CheckCircle, XCircle } from "lucide-react"
import { useParams } from 'react-router-dom';


const StoreServices = ({ title }) => {

  const { id } = useParams();
  const [data, setData] = useState({});
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("services")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const allStoreServicesValue = useSelector((state) => state.allPartners.storeServices);
  const loading = useSelector((state) => state.allPartners.loading);
  const error = useSelector((state) => state.allPartners.error);

  useEffect(() => {
     dispatch(getStoreServices({ id: id }));
  }, [dispatch, id]);

  useEffect(() => {
    if (allStoreServicesValue) {
      setData(allStoreServicesValue);
    }
  }, [allStoreServicesValue]);


  // Helper functions
  // 
  const formatDuration = (duration) => {
  const [hours, minutes] = duration.split(":");
  const h = Number.parseInt(hours);
  const m = Number.parseInt(minutes);

  return h && m
    ? `${h}h ${m} min`
    : h
    ? `${h}h`
    : `${m} min`;
};


  const getDiscountPercentage = (original, discounted) => {
    return Math.round(((original - discounted) / original) * 100)
  }

  const getStatusColor = (status) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  }

  const getStatusIcon = (status) => {
    return status === "active" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
  }

  
   // Filter functions with safety checks
  const filterItems = (items, isCombo = false) => {
    if (!items || !Array.isArray(items)) return []

    return items.filter((item) => {
      const name = isCombo ? item?.combo : item?.service_name
      if (!name) return false

      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || item?.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  const filteredServices = filterItems(data?.services)
  const filteredCombos = filterItems(data?.combos, true)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        {/* Error Message */}
        {error ? (
          <div className="text-red-600 bg-red-50 border border-red-200 p-4 rounded-md mb-4">
            ⚠️ Failed to load partners: {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading partners...
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Services & Combos</h1>
                  <p className="text-gray-600">Manage your beauty services and combo packages</p>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search services or combos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <Filter className="text-gray-400 w-5 h-5" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                      <button
                        onClick={() => setActiveTab("services")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "services"
                            ? "border-black text-black"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        Services ({filteredServices.length})
                      </button>
                      <button
                        onClick={() => setActiveTab("combos")}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "combos"
                            ? "border-black text-black"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                          }`}
                      >
                        Combos ({filteredCombos.length})
                      </button>
                    </nav>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {activeTab === "services" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredServices.length > 0 ? (
                          filteredServices.map((service) => (
                            <div
                              key={service?.id}
                              className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <h3 className="text-lg font-bold text-black">{service?.service_name}</h3>
                                  
                                  </div>
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(service.status)}`}
                                >
                                  {getStatusIcon(service?.status)}
                                  <span>{service?.status}</span>
                                </div>
                              </div>

                              {/* Pricing */}
                              <div className="mb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-2xl font-bold text-gray-900">₹{service?.discounted_amount}</span>
                                  <span className="text-lg text-gray-500 line-through">₹{service?.amount}</span>
                                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                    {getDiscountPercentage(service?.amount, service?.discounted_amount)}% OFF
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">You save ₹{service?.amount - service?.discounted_amount}</p>
                              </div>

                              {/* Duration */}
                              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{formatDuration(service?.duration)}</span>
                              </div>

                                                                                         
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-12">
                            <Scissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "combos" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCombos.length > 0 ? (
                          filteredCombos.map((combo) => (
                            <div
                              key={combo?.id}
                              className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:scale-105"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  
                                  <div>
                                    <h3 className="text-lg font-bold text-black">{combo?.combo}</h3>
                                  </div>
                                </div>
                                <div
                                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(combo?.status)}`}
                                >
                                  {getStatusIcon(combo?.status)}
                                  <span>{combo.status}</span>
                                </div>
                              </div>

                              {/* Pricing */}
                              <div className="mb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-2xl font-bold text-gray-900">₹{combo?.amount}</span>
                                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                                    COMBO DEAL
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">Special combo pricing</p>
                              </div>

                              {/* Duration */}
                              <div className="flex items-center space-x-2 text-gray-600 mb-4">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">{formatDuration(combo?.duration)}</span>
                              </div>

                              </div>
                          ))
                        ) : (
                          <div className="col-span-full text-center py-12">
                            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No combos found</h3>
                            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Services</p>
                        <p className="text-2xl font-bold text-purple-600">{data?.services?.length}</p>
                      </div>
                      <Scissors className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Combos</p>
                        <p className="text-2xl font-bold text-orange-600">{data?.combos?.length}</p>
                      </div>
                      <Tag className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Services</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(data?.services ?? []).filter((s) => s?.status === "active").length}
                          {/* {data?.services.filter((s) => s?.status === "active").length} */}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg. Discount</p>
                        <p className="text-2xl font-bold text-pink-600">
                          
                            {Math.round(
                              (data?.services ?? []).reduce(
                                (acc, service) =>
                                  acc + getDiscountPercentage(service?.amount, service?.discounted_amount),
                                0
                              ) / ((data?.services ?? []).length || 1)
                            )}%
                        </p>
                      </div>
                      <Sparkles className="w-8 h-8 text-pink-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default StoreServices
