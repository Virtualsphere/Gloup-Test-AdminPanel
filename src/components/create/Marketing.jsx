import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileSpreadsheet, Image as ImageIcon, Video as VideoIcon, X, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  sendMarketingWhatsapp,
  resetMarketingState,
} from "../../redux/slices/marketingSlice";
import MarketingVideo from "./MarketingVideo";

const GENDER_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "male", label: "Male only" },
  { value: "female", label: "Female only" },
];

const MarketingImage = () => {
  const dispatch = useDispatch();
  const { loading, result } = useSelector((state) => state.marketing);

  const [excelFile, setExcelFile] = useState(null);
  const [imageMode, setImageMode] = useState("upload"); // "upload" | "url"
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [gender, setGender] = useState("all");

  const handleExcelChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setExcelFile(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setExcelFile(null);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    setServiceName("");
    setOfferPrice("");
    setGender("all");
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!excelFile) {
      toast.error("Upload the recipient sheet first");
      return;
    }
    if (imageMode === "upload" && !imageFile) {
      toast.error("Upload a promo image, or switch to pasting an image URL");
      return;
    }
    if (imageMode === "url" && !imageUrl.trim()) {
      toast.error("Paste an image URL, or switch to uploading a file");
      return;
    }
    if (!serviceName.trim() || !offerPrice.toString().trim()) {
      toast.error("Service name and offer price are required");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);
    if (imageMode === "upload") {
      formData.append("image", imageFile);
    } else {
      formData.append("image_url", imageUrl.trim());
    }
    formData.append("service_name", serviceName.trim());
    formData.append("offer_price", offerPrice);
    formData.append("gender", gender);

    try {
      const data = await dispatch(sendMarketingWhatsapp(formData)).unwrap();
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
          Send WhatsApp Marketing Broadcast
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the recipient sheet, add the promo details, and optionally target one gender.
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
                Click to upload the Number / User Name / Gender sheet
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

        {/* Promo Image */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-600">
              Promo Image
            </label>

            <div className="flex text-xs rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`px-3 py-1.5 transition ${imageMode === "upload"
                  ? "bg-black text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => setImageMode("url")}
                className={`px-3 py-1.5 transition ${imageMode === "url"
                  ? "bg-black text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
              >
                Use URL
              </button>
            </div>
          </div>

          {imageMode === "upload" ? (
            !imageFile ? (
              <label className="flex items-center gap-3 border border-dashed border-gray-300 hover:border-black rounded-lg px-4 py-3 cursor-pointer transition">
                <ImageIcon size={20} className="text-gray-500" />
                <span className="text-sm text-gray-500">
                  Click to upload the image shown in the message
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between border border-gray-300 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={imagePreview}
                    alt="Promo preview"
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                  <span className="text-sm text-gray-700 truncate">
                    {imageFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            )
          ) : (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/promo.jpg"
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
            />
          )}
        </div>

        {/* Service Name + Offer Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Service Name
            </label>
            <input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Hair Spa"
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-600">
              Offer Price
            </label>
            <input
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="e.g. 499"
              className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
              required
            />
          </div>
        </div>

        {/* Gender filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">
            Send To
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg transition"
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 pt-1">
            Filters by the "Gender" column in the sheet. Rows without a gender value are skipped unless "Everyone" is selected.
          </p>
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
              onClick={() => dispatch(resetMarketingState())}
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

          <p className="text-sm text-gray-500">
            Filter applied: <span className="font-medium text-gray-700">{result.gender_filter}</span>
          </p>

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

const Marketing = () => {
  const [tab, setTab] = useState("image");

  return (
    <div>
      <div className="max-w-3xl mx-auto pt-10 px-4">
        <div className="inline-flex text-sm rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("image")}
            className={`flex items-center gap-1.5 px-4 py-2 transition ${tab === "image"
              ? "bg-black text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
          >
            <ImageIcon size={15} />
            Image
          </button>
          <button
            type="button"
            onClick={() => setTab("video")}
            className={`flex items-center gap-1.5 px-4 py-2 transition ${tab === "video"
              ? "bg-black text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
          >
            <VideoIcon size={15} />
            Video
          </button>
        </div>
      </div>

      {tab === "image" ? <MarketingImage /> : <MarketingVideo />}
    </div>
  );
};

export default Marketing;