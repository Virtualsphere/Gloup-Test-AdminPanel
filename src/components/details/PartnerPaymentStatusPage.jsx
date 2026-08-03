import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "lucide-react";
import Select from "react-select";
import { getPartnerPaymentStatus } from "../../redux/slices/partnerPaymentSlice";

const statusOptions = [
  { value: "", label: "All Partners" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

const PartnerPaymentStatusPage = () => {
  const dispatch = useDispatch();
  const { partners, total, summary, loading, error } = useSelector((state) => state.partnerPayments);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(getPartnerPaymentStatus({ page, limit, status, search }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [dispatch, page, limit, status, search]);

  const totalPages = Math.ceil(total / limit);
  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Partners</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Paid</p>
          <p className="text-2xl font-bold text-green-700">{summary.paid}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">Unpaid</p>
          <p className="text-2xl font-bold text-red-700">{summary.unpaid}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 border-b border-gray-200 items-end">
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-48">
          <Select
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === status)}
            onChange={(opt) => { setPage(1); setStatus(opt?.value || ""); }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={{
              control: (base) => ({ ...base, minHeight: "36px", borderRadius: "6px" }),
              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            }}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 border border-red-200 p-4 m-4 rounded-md">⚠️ {error}</div>
      )}

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">Salon</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Plan</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Last Payment</th>
              <th className="px-3 py-2 text-left">Plan Period</th>
              <th className="px-3 py-2 text-left">Next Charge</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan="8" className="text-center py-6 text-gray-500">Loading...</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-6 text-gray-500">No partners found</td></tr>
            ) : (
              partners.map((p) => (
                <tr key={p.store_id}>
                  <td className="px-3 py-2 font-medium">{p.salon_name}</td>
                  <td className="px-3 py-2">
                    <div>{p.email}</div>
                    <div className="text-gray-500">{p.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    {p.plan_name || "No Plan"}{p.price_tag ? ` (${p.price_tag})` : ""}
                  </td>
                  <td className="px-3 py-2 text-right">₹{p.amount_paid ?? p.last_payment_amount ?? 0}</td>
                  <td className="px-3 py-2">
                    <span className={`text-white px-3 py-1 rounded-full text-xs ${p.paid_status === "paid" ? "bg-green-600" : "bg-red-500"}`}>
                      {p.paid_status === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div>{formatDate(p.last_payment_date)}</div>
                    <div className="text-gray-500">{p.last_payment_method || "—"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(p.current_start || p.start_date)} - {formatDate(p.current_end || p.end_date)}
                  </td>
                  <td className="px-3 py-2">{formatDate(p.charge_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-gray-700">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-50">&lt;</button>
          <span className="px-3 py-1">{page} / {totalPages || 1}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border rounded disabled:opacity-50">&gt;</button>
        </div>
      </div>
    </div>
  );
};

export default PartnerPaymentStatusPage;