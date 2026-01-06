import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { getVerifiedPartnersList } from "../../redux/slices/partnersSlice";
import { useNavigate } from "react-router-dom";

const VerifyPartner = ({ onSuccess }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [partners, setPartners] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch partners list
  const fetchPartners = async () => {
    debugger;
    try {
      setLoading(true);
      const res = await dispatch(getVerifiedPartnersList()).unwrap();
      console.log("Fetched partners:", res);
      setPartners(res || []);
    } catch (err) {
      alert("Failed to fetch partners");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load partners on mount
  useEffect(() => {
    fetchPartners();
  }, []);

  // 🔹 Checkbox toggle
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id)
        : [...prev, id]
    );
  };

  // 🔹 Bulk verify / reject
  const handleBulkVerify = async (status) => {
    if (selectedIds.length === 0) {
      alert("Please select at least one partner");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        "/admin/partner/bulk-verify",
        {
          partnerIds: selectedIds,
          status,
          remarks,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert(`Partners ${status} successfully`);

      setSelectedIds([]);
      setRemarks("");
      fetchPartners(); // refresh list
      onSuccess?.();
    } catch (err) {
      alert(err.response?.data?.message || "Bulk verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-3">Bulk Verify Partners</h3>

      {/* Partner Table */}
      <table className="w-full border mb-3">
        <thead>
          <tr>
            <th>Select</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {partners.length === 0 ? (
            <tr>
              <td colSpan="3" className="text-center py-4">
                No partners found
              </td>
            </tr>
          ) : (
            partners.map((p) => (
              <tr key={p.id}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    disabled={p.status === "verified"}
                    checked={selectedIds.includes(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <td>{p.name}</td>
                <td>{p.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Remarks */}
      <textarea
        placeholder="Remarks (optional)"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        className="w-full border p-2 rounded mb-3"
      />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={() => handleBulkVerify("verified")}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Verify Selected
        </button>

        <button
          disabled={loading}
          onClick={() => handleBulkVerify("rejected")}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Reject Selected
        </button>
      </div>
    </div>
  );
};

export default VerifyPartner;
