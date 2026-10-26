import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FileSpreadsheet, X, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  sendMarketingSMS,
  resetSMSMarketingState,
} from "../../redux/slices/marketingSlice";

const TEMPLATES = {
  partner: {
    label: "Partners (Salons)",
    message: `GLOUP FOR SALONS: 🚀 Get more customers. Fill your empty seats. Grow your salon.

GloUp is a fast-growing salon booking platform, already with 800+ salons onboarded across Chennai.

💰 0% Commission
📅 Get 30–150 potential bookings/month
📍 Reach new customers near your salon
📈 Turn your Monday–Friday empty slots into paid bookings
⏱️ Reduce idle hours and increase daily revenue

Don't let empty chairs become lost revenue. Let GloUp bring new customers to your salon while you focus on your business.

🔥 Onboard your salon today and start receiving new customers!

Join GloUp: https://api.v1.gloup.in/download/partner

Booking volume depends on location, availability, pricing, services and customer demand. Terms apply.`,
  },
  user: {
    label: "Users (Customers)",
    message: `GLOUP: ✨ Chennai's salon offers are here! Haircut @₹49 | Trim @₹29 | Shave @₹29 | De-Tan @₹49. 800+ salons available in Chennai. Book now on GloUp and save money & time! T&C apply.

Join GloUp: https://api.v1.gloup.in/download`,
  },
};

const MarketingSMS = () => {
  const dispatch = useDispatch();
  const { smsLoading: loading, smsResult: result } = useSelector((state) => state.marketing);

  const [recipientType, setRecipientType] = useState("user");
  const [excelFile, setExcelFile] = useState(null);

  const handleExcelChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setExcelFile(file);
  };

  const resetForm = () => {
    setExcelFile(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!excelFile) {
      toast.error("Upload the recipient sheet first");
      return;
    }

    const formData = new FormData();
    formData.append("excel", excelFile);
    formData.append("recipient_type", recipientType);

    try {
      await dispatch(sendMarketingSMS(formData)).unwrap();
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
          Send Marketing SMS
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fixed, DLT-approved templates — only the recipient list changes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">

        {/* Recipient Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Send To</label>
          <div className="flex text-sm rounded-lg border border-gray-300 overflow-hidden w-fit">
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRecipientType(key)}
                className={`px-4 py-2 transition ${
                  recipientType === key
                    ? "bg-black text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message preview */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-600">Message Preview</label>
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap max-h-56 overflow-y-auto">
            {TEMPLATES[recipientType].message}
          </div>
        </div>

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
              Send SMS Broadcast
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
              onClick={() => dispatch(resetSMSMarketingState())}
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
            Sent as: <span className="font-medium text-gray-700">{TEMPLATES[result.recipient_type]?.label || result.recipient_type}</span>
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

export default MarketingSMS;
