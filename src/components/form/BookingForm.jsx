import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getBookingById, bookingpdfDownload, updateBookingStatus, refundBooking } from "../../redux/slices/bookingSlice";
import { Toaster, toast } from "react-hot-toast";

const STATUS_COLOR = {
  booked: "bg-orange-400",
  accepted: "bg-blue-400",
  completed: "bg-green-600",
  cancelled: "bg-red-500",
  declined: "bg-gray-500",
};

const STATUS_LABEL = {
  booked: "Booked",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};


const BookingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showCancel, setShowCancel] = useState(false);
  const [showRefund, setShowRefund] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const { bookingView, loading, error } = useSelector(
    (state) => state.allBookings
  );


  // Initial load 
  useEffect(() => {
    dispatch(getBookingById(id));
  }, [id, dispatch]);

  // Auto refresh every 5 minutes
  useEffect(() => {
  const interval = setInterval(() => {
    dispatch(getBookingById(id));
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, [id, dispatch]);

  const { pdfBlob, pdfLoading } = useSelector(
    (state) => state.allBookings
  );

const downloadPDF = async () => {
  const toastId = toast.loading("Generating PDF...");

  try {

    const blob = await dispatch(
      bookingpdfDownload(bookingView.id)
    ).unwrap();

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Booking_${bookingView.id}.pdf`;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(url);

    toast.success("PDF Generated Successfully", { id: toastId });

  } catch (err) {
    console.error(err);
    toast.error("Failed to download PDF", { id: toastId });
  }
};

  if (loading) return <div className="flex items-center justify-center py-10 text-gray-500">
    <svg
      className="animate-spin h-5 w-5 text-purple-500 mr-2"
      viewBox="0 0 24 24"
    >
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
    Loading Bookings Details...
  </div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!bookingView) return null;

  const [datePart] = bookingView.booking_datetime.split(' ');

  const date = new Date(datePart + 'T00:00:00')
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const parseTime = (time) => {
    const [h, m, s] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, s || 0);
    return d;
  };

  const to12Hour = (date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  // Date (mandatory)

  const [fromTime, toTime] = bookingView.slot_timing.split('-');

  const fromDate = parseTime(fromTime);
  const toDate = parseTime(toTime);

  const slotTiming = `${to12Hour(fromDate)} – ${to12Hour(toDate)}`;

  const durationMinutes = Math.round(
    (toDate - fromDate) / (1000 * 60)
  );


  // Total service amount calculation
  const totalServiceAmount = Number(
    bookingView.total_amount || 0
  );

  // GST amount
  const gstAmount = Number(bookingView.gst_amount || 0);
  // Subtotal amount
  const subTotalAmount = Number(
    bookingView.payable_amount || 0
  );

  const updateStatus = (status) => {
    dispatch(updateBookingStatus({
      id: bookingView.id,
      status,
    }))
      .unwrap()
      .then(() => {
        toast.success(`Booking ${status} successfully`);
      })
      .catch(() => {
        toast.error("Failed to update booking status");
      });
  };

  const handleCancel = () => {
    dispatch(updateBookingStatus({ id: bookingView.id, status: "cancelled" }))
      .unwrap()
      .then(() => {
        toast.success("Booking cancelled successfully");
        setShowCancel(false);
      })
      .catch(() => toast.error("Cancel failed"));
  };

  const handleRefund = () => {
    dispatch(refundBooking({ id: bookingView.id }))
      .unwrap()
      .then(() => {
        toast.success("Refund processed successfully");
        setShowRefund(false);
      })
      .catch(() => toast.error("Refund failed"));
  };



  if (loading) return <div className="flex items-center justify-center py-10 text-gray-500">
    <svg
      className="animate-spin h-5 w-5 text-purple-500 mr-2"
      viewBox="0 0 24 24"
    >
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
    Loading Bookings Details...
  </div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!bookingView) return null;

  return (
    <div className="p-6 max-w-10xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-black cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h2 className="text-xl font-semibold">
          {bookingView.id}
        </h2>

        <span
          className={`text-white px-3 py-1 rounded-full text-sm ${STATUS_COLOR[bookingView.status]
            }`}
        >
          {STATUS_LABEL[bookingView.status]}
        </span>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT CARD */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <Section title="Salon">
            <div className="font-semibold">{bookingView.salon_name}</div>
            <div className="text-sm text-gray-500">{bookingView.salon_phone}</div>
            <div className="text-sm text-gray-500">{bookingView.salon_mail}</div>
            <div className="text-sm font-bold text-gray-500">{bookingView.salon_address}</div>
          </Section>

          <Section title="User">
            <div className="font-semibold">{bookingView.user_name}</div>
            <div className="text-sm text-gray-500">{bookingView.contact_number}</div>
            <div className="text-sm text-gray-500">{bookingView.email}</div>
          </Section>
          <Section title="Staff">
            <div className="font-semibold">{bookingView.staff_name}</div>
            <div className="text-sm text-gray-500">
              {bookingView.staff_phone}
            </div>
          </Section>

          <Section title="Feedback">
            ⭐⭐⭐⭐⭐
            <div className="text-sm text-gray-500">Thank you 🙌</div>
          </Section>
        </div>

        {/* RIGHT CARD */}
        <div className="bg-white rounded-lg shadow p-4 lg:col-span-2">
          <div className="flex justify-between mb-4">
            <h3 className="font-semibold text-lg">Details</h3>

            <div className="flex gap-2">
              {/* CONFIRM */}
              {bookingView.status === "booked" && (
                <button
                  onClick={() => updateStatus("confirmed")}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Confirm
                </button>
              )}
              {/* COMPLETE */}
              {bookingView.status === "confirmed" && (
                <button
                  onClick={() => updateStatus("completed")}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Mark Completed
                </button>
              )}

              {/* CANCEL */}
              {["booked", "confirmed"].includes(bookingView.status) && (
                <button
                  onClick={() => openCancelModal()}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Cancel
                </button>
              )}

              {/* REFUND */}
              {bookingView.status === "completed" &&
                bookingView.payment_status === "success" && (
                  <button
                    onClick={() => openRefundModal()}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Refund
                  </button>
                )}
              {/* PDF */}
              <button
                onClick={downloadPDF}
                disabled={pdfLoading}
                className={`px-3 py-1 rounded text-white ${pdfLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-orange-400 hover:bg-orange-500"
                  }`}
              >
                {pdfLoading ? "Generating PDF..." : "Save PDF"}
              </button>
            </div>



          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Info label="Booking Number" value={bookingView.id} />
            <Info label="Booking Date" value={bookingView.order_date} />
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">
                Appointment Schedule
              </div>

              <div className="flex items-start gap-4">
                <div>
                  <div className="font-semibold text-gray-900">
                    {date}
                  </div>
                  <div className="text-sm text-gray-600">
                    {slotTiming}
                    <span className="ml-2 text-gray-400">
                      ({durationMinutes} mins)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Info label="Salon" value={bookingView.salon_name} />
            <Info label="Customer" value={bookingView.user_name} />
            <Info
              label="Payment Type"
              value={
                <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                  {bookingView.payment_status === "success" ? "Paid" : "Unpaid"}
                </span>
              }
            />
          </div>

          {/* BILL */}
          <div className="border rounded-lg overflow-hidden bg-white">

            {/* Header */}
            <div className="bg-gray-100 px-4 py-2 font-semibold">
              Billing Summary
            </div>

            {/* Services */}
            <div className="divide-y">
              {bookingView.appointment_items?.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="px-4 py-2 flex justify-between items-center"
                  >
                    <span className="text-gray-700">
                      {item.service_name}
                    </span>

                    <div className="text-right text-sm font-medium text-gray-900">
                      ₹{item.service_amount}
                      <span className="mx-1 text-red-500">− ₹{item.service_subtotal}</span>
                      <span className="mx-1 text-gray-400">=</span>
                      ₹{item.service_discount_amount}
                    </div>

                  </div>
                );
              })}
            </div>


            {/* Summary */}

            <div className="border-t mt-1">
              <div className="px-4 py-2 flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span>₹{totalServiceAmount}</span>
              </div>

              <div className="px-4 py-2 flex justify-between text-sm">
                <span className="text-gray-600">GST ({bookingView.gst_rate}%)</span>
                <span>₹{bookingView.gst_amount}</span>
              </div>
              <div className="px-4 py-2 flex justify-between text-sm">
                <span className="text-gray-600">Sub Total</span>
                <span>₹{bookingView.payable_amount}</span>
              </div>
              <div className="px-4 py-2 flex justify-between text-sm">
                <span className="text-gray-500">Coupon Used</span>
                <span className="text-red-500">
                  − ₹0
                </span>
              </div>

            </div>

            {/* Total */}
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between font-semibold">
              <span>Payable Amount</span>
              <span>₹{bookingView.subtotal_amount}</span>
            </div>

          </div>


        </div>
      </div>

      {showCancel && (
        <ConfirmModal
          title="Cancel Booking"
          message="Are you sure you want to cancel this booking?"
          onClose={() => setShowCancel(false)}
          onConfirm={() => handleCancel()}
        />
      )}

      {showRefund && (
        <ConfirmModal
          title="Refund Payment"
          message="This will refund the full amount to the customer."
          onClose={() => setShowRefund(false)}
          onConfirm={() => handleRefund()}
        />
      )}

    </div>
  );
};

/* ---------- Helpers ---------- */

const Section = ({ title, children }) => (
  <div>
    <div className="text-sm text-gray-500 mb-1">{title}</div>
    {children}
  </div>
);

const Info = ({ label, value }) => (
  <div className="bg-gray-50 p-3 rounded">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

const Row = ({ label, value, dark }) => (
  <div
    className={`flex justify-between px-4 py-2 ${dark ? "bg-gray-800 text-white font-semibold" : "border-b"
      }`}
  >
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const ConfirmModal = ({ title, message, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-96">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1 rounded bg-red-500 text-white"
        >
          Yes, Proceed
        </button>
      </div>
    </div>
  </div>
);


export default BookingForm;
