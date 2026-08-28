import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileSpreadsheet, Video as VideoIcon, X, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  sendVideoMarketingWhatsapp,
  resetVideoMarketingState,
} from "../../redux/slices/marketingSlice";

const MarketingVideo = () => {
  const dispatch = useDispatch();
  const { videoLoading: loading, videoResult: result } = useSelector((state) => state.marketing);

  const [excelFile, setExcelFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const handleExcelChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setExcelFile(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setExcelFile(null);
    setVideoFile(null);
    setVideoPreview(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!excelFile) {
      toast.error("Upload the recipient sheet first");
      return;
    }
    if (!videoFile) {
      toast.error("Upload a video to send");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);
    formData.append("video", videoFile);

    try {
      await dispatch(sendVideoMarketingWhatsapp(formData)).unwrap();
      toast.success("Broadcast sent");
      resetForm();
    } catch (error) {
      toast.error(error?.message || error || "Failed to send broadcast");
    }
  }

  return (
    <div className="max-w-3xl mx-auto pt-6 pb-10 px-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Send WhatsApp Video Broadcast
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the recipient sheet and a video, and optionally target one gender.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">

        {/* Recipient Sheet */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">
            Recipient Sheet (.xlsx)
          </label>

          {!excelFile ? (
            <label className="flex items-center gap-3 border border-dashed border-gray-300 hover:border-black rounded-lg px-4 py-3 cursor-pointer transition">
              <FileSpreadsheet size={20} className="text-gray-500" />
              <span className="text-sm text-gray-500">
                Click to upload the phone number sheet
              </span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelChange}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-700 truncate">
                <FileSpreadsheet size={18} className="text-gray-500 shrink-0" />
                <span className="truncate">{excelFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setExcelFile(null)}
                className="p-1 rounded-full hover:bg-gray-100 transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Video */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">
            Video
          </label>

          {!videoFile ? (
            <label className="flex items-center gap-3 border border-dashed border-gray-300 hover:border-black rounded-lg px-4 py-3 cursor-pointer transition">
              <VideoIcon size={20} className="text-gray-500" />
              <span className="text-sm text-gray-500">
                Click to upload the video to send (MP4, max 16MB)
              </span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoChange}
              />
            </label>
          ) : (
            <div className="space-y-2">
              <video
                src={videoPreview}
                controls
                className="w-full max-h-64 rounded-lg border border-gray-300 bg-black"
              />
              <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5">
                <span className="text-sm text-gray-700 truncate">
                  {videoFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-black to-gray-800 text-white hover:opacity-90"
            }`}
        >
          {loading ? (
            "Sending..."
          ) : (
            <>
              <Send size={16} />
              Send Broadcast
            </>
          )}
        </button>
      </form>

      {/* Result summary */}
      {result && (
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Broadcast Summary
              </h2>
            </div>
            <button
              onClick={() => dispatch(resetVideoMarketingState())}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryStat label="In Sheet" value={result.total_recipients_in_sheet} />
            <SummaryStat label="Valid Numbers" value={result.valid_numbers} />
            <SummaryStat label="Invalid Numbers" value={result.invalid_numbers} />
            <SummaryStat label="Batches Sent" value={result.batches_sent} />
          </div>

          {result.batches_failed > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                {result.batches_failed} batch{result.batches_failed > 1 ? "es" : ""} failed to send. Check server logs for details.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SummaryStat = ({ label, value }) => (
  <div className="border border-gray-200 rounded-lg px-4 py-3 text-center">
    <div className="text-xl font-semibold text-gray-900">{value ?? 0}</div>
    <div className="text-xs text-gray-500 mt-1">{label}</div>
  </div>
);

export default MarketingVideo;
