import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { setUserGender, removeUserFromList } from "../../redux/slices/genderProbabilitySlice";

const GenderProbabilityTable = ({ data }) => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState(null);

  const currentPage = Number(searchParams.get("page")) || 1;
  const setCurrentPage = (updater) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const newPage = typeof updater === "function" ? updater(currentPage) : updater;
      if (newPage <= 1) next.delete("page");
      else next.set("page", String(newPage));
      return next;
    });
  };
  const itemsPerPage = 10;

  const filteredData = data.filter((item) =>
    `${item.firstname || ""} ${item.lastname || ""} ${item.phone || ""} ${item.email || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSetGender = async (item, gender) => {
    setSavingId(item.user_id);
    try {
      await dispatch(setUserGender({ id: item.user_id, gender })).unwrap();
      toast.success(`Set ${item.firstname || "user"} as ${gender}`);
      dispatch(removeUserFromList(item.user_id));
    } catch (error) {
      toast.error(error || "Failed to update gender");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Male Signal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Female Signal</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probability</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((item, index) => {
                const isSaving = savingId === item.user_id;
                const suggested = item.suggested_gender;
                return (
                  <tr key={item.user_id}>
                    <td className="px-4 py-4 text-gray-500">{indexOfFirstItem + index + 1}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">
                      {[item.firstname, item.lastname].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <div>{item.phone || "—"}</div>
                      <div className="text-xs text-gray-400">{item.email || ""}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {item.male_score}{" "}
                      <span className="text-xs text-gray-400">
                        ({item.male_service_count} service, {item.male_salon_count} salon)
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {item.female_score}{" "}
                      <span className="text-xs text-gray-400">
                        ({item.female_service_count} service, {item.female_salon_count} salon)
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{item.probability_male}% M</span>
                          <span>{item.probability_female}% F</span>
                        </div>
                        <div className="h-2 rounded-full bg-pink-100 overflow-hidden">
                          <div
                            className="h-2 bg-blue-500"
                            style={{ width: `${item.probability_male}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetGender(item, "male")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                            suggested === "male"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          Set Male
                        </button>
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetGender(item, "female")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                            suggested === "female"
                              ? "bg-pink-600 text-white hover:bg-pink-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          Set Female
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No users to review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            <span className="font-medium">{totalPages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-md text-sm ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-md text-sm ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenderProbabilityTable;
