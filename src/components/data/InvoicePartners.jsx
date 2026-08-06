import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FileText, Phone, Mail, ChevronRight } from "lucide-react";
import { fetchInvoicePartners } from "../../redux/slices/invoiceSlice";

const InvoicePartners = ({ title }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    partners,
    totalBookings,
    totalPartners,
    date,
    partnersLoading,
    partnersError,
  } = useSelector((state) => state.invoice);

  useEffect(() => {
    dispatch(fetchInvoicePartners());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">
            Booking summary by salon for {date || "today"}
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{totalBookings}</div>
            <div className="text-xs text-gray-500">Total Bookings</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 text-center">
            <div className="text-2xl font-bold text-gray-800">{totalPartners}</div>
            <div className="text-xs text-gray-500">Partners</div>
          </div>
        </div>
      </div>

      {partnersError ? (
        <div className="text-red-600 bg-red-50 border p-4 rounded">
          Failed to load invoice partners: {partnersError}
        </div>
      ) : partnersLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
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
          Loading Invoices...
        </div>
      ) : partners.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
          No bookings have come in today yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => (
            <button
              key={partner.partner_id}
              onClick={() => navigate(`/invoice/${partner.partner_id}`)}
              className="text-left bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-blue-300 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition" />
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{partner.partner_name}</h3>

              <div className="space-y-1 mb-3">
                {partner.partner_phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="w-3 h-3" /> {partner.partner_phone}
                  </div>
                )}
                {partner.partner_email && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Mail className="w-3 h-3" /> {partner.partner_email}
                  </div>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {partner.booking_count} {partner.booking_count === 1 ? "Booking" : "Bookings"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoicePartners;
