import { useState } from "react";
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { useDispatch } from "react-redux";
import { bulkCreateServices, getStoreServices } from "../../redux/slices/partnersSlice";
import toast from "react-hot-toast";

const BulkUploadServiceModal = ({ setShowModal, storeId }) => {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { created_count, skipped_count, skipped_details }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(selected.type)) {
      toast.error("Please upload a valid .xlsx or .xls file");
      return;
    }

    setFile(selected);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please choose a file first");
      return;
    }

    setLoading(true);
    try {
      const data = await dispatch(
        bulkCreateServices({ store_id: storeId, file })
      ).unwrap();

      setResult(data);

      if (data.created_count > 0) {
        toast.success(`${data.created_count} service(s) created`);
        dispatch(getStoreServices({ store_id: storeId }));
      }
      if (data.skipped_count > 0) {
        toast.error(`${data.skipped_count} row(s) skipped — see details below`);
      }
    } catch (error) {
      toast.error(error?.message || error || "Failed to upload services");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-white w-[520px] max-h-[85vh] overflow-y-auto p-8 rounded-2xl shadow-2xl space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bulk Upload Services</h2>
          <button
            onClick={() => setShowModal(false)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Upload an Excel file with columns: <strong>service name, Duration,
          service category, Gender, Original price, offer price, priority, status</strong>.
        </p>

        {/* Drop / browse zone */}
        <label
          htmlFor="bulk-service-file"
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-black rounded-xl p-8 cursor-pointer transition"
        >
          {file ? (
            <>
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
              <span className="text-xs text-gray-400">Click to choose a different file</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Click to select .xlsx file
              </span>
            </>
          )}
          <input
            id="bulk-service-file"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className={`w-full py-3 rounded-lg font-medium transition ${
            loading || !file
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gradient-to-r from-black to-gray-800 text-white hover:opacity-90"
          }`}
        >
          {loading ? "Uploading..." : "Upload & Create Services"}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {result.created_count} created
            </div>

            {result.skipped_count > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {result.skipped_count} skipped
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Row</th>
                        <th className="px-3 py-2 text-left">Service</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.skipped_details.map((s, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-2">{s.row}</td>
                          <td className="px-3 py-2">{s.service_name}</td>
                          <td className="px-3 py-2 text-red-600">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUploadServiceModal;