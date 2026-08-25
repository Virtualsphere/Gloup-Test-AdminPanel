import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle, RotateCcw } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  fetchInvoiceDetails,
  downloadInvoicePDF,
  markInvoicePayout,
  undoInvoicePayout,
  clearInvoiceDetails,
} from "../../redux/slices/invoiceSlice";

const InvoiceDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const invoiceDate = searchParams.get("date") || undefined;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { details, detailsLoading, detailsError, pdfLoading, payoutLoading } =
    useSelector((state) => state.invoice);

  useEffect(() => {
    dispatch(fetchInvoiceDetails({ partnerId: id, date: invoiceDate }));
    return () => {
      dispatch(clearInvoiceDetails());
    };
  }, [dispatch, id, invoiceDate]);

  const handleDownloadPDF = async () => {
    const toastId = toast.loading("Generating invoice PDF...");
    try {
      const blob = await dispatch(
        downloadInvoicePDF({
          partnerId: id,
          date: details?.date || invoiceDate,
        })
      ).unwrap();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${details?.partner?.name || id}_${details?.date || ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Invoice PDF downloaded", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to download invoice PDF", { id: toastId });
    }
  };

  const handleTogglePayout = async () => {
    const isPaid = details?.payout_status === "completed";
    const toastId = toast.loading(
      isPaid ? "Reverting payout..." : "Marking as paid..."
    );
    try {
      const action = isPaid ? undoInvoicePayout : markInvoicePayout;
      await dispatch(
        action({ partnerId: id, date: details?.date || invoiceDate })
      ).unwrap();
      toast.success(isPaid ? "Marked as pending" : "Payout marked complete", {
        id: toastId,
      });
    } catch (err) {
      console.error(err);
      toast.error(isPaid ? "Failed to undo payout" : "Failed to mark payout", {
        id: toastId,
      });
    }
  };

  if (detailsLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-purple-500 mr-2" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Loading Invoice...
      </div>
    );
  }

  if (detailsError) {
    return <div className="p-6 text-red-600">{detailsError}</div>;
  }

  if (!details) return null;

  const {
    partner,
    date,
    items = [],
    total_amount,
    total_bookings,
    payout_status,
    payout_paid_at,
  } = details;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-black cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="text-xl font-semibold">{partner?.name}</h2>
        {payout_status === "completed" ? (
          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            Paid
            {payout_paid_at
              ? ` · ${new Date(payout_paid_at).toLocaleString("en-IN")}`
              : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
            Pending
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div>
            <div className="text-gray-500 mb-1">Invoice Date</div>
            <div className="font-medium text-gray-800">{date}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Contact</div>
            <div className="font-medium text-gray-800">{partner?.phone || "—"}</div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Total Bookings</div>
            <div className="font-medium text-gray-800">{total_bookings}</div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Service</th>
                <th className="px-4 py-3 text-left">Booking Time</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No bookings for today.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.appointment_id}-${index}`}>
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{item.service_name}</div>
                      {item.important && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Important
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.booking_time
                        ? new Date(item.booking_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₹{Number(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="bg-gray-900 text-white px-4 py-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>₹{Number(total_amount || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={handleTogglePayout}
            disabled={payoutLoading}
            className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${
              payoutLoading
                ? "bg-gray-400 cursor-not-allowed"
                : payout_status === "completed"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {payout_status === "completed" ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {payoutLoading
              ? "Processing..."
              : payout_status === "completed"
                ? "Undo / Mark Incomplete"
                : "Mark as Paid (Payout)"}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${
              pdfLoading ? "bg-gray-400 cursor-not-allowed" : "bg-black hover:bg-neutral-800"
            }`}
          >
            <Download className="w-4 h-4" />
            {pdfLoading ? "Generating..." : "Download Invoice PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
