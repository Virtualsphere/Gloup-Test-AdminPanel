import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  fetchPartnersNeedingSubscription,
  fetchAllSubscriptions,
  assignSubscription,
  updateSubscription,
  deactivateSubscription,
} from "../../redux/slices/partnerManualSubscriptionSlice";

const PartnerManualSubscriptions = ({ title }) => {
  const dispatch = useDispatch();
  const {
    needingSubscription,
    needingLoading,
    subscriptions,
    subscriptionsLoading,
    actionLoading,
  } = useSelector((state) => state.partnerManualSubscription);

  const [modalPartner, setModalPartner] = useState(null);
  const [planAmountInput, setPlanAmountInput] = useState("");

  const loadAll = () => {
    dispatch(fetchPartnersNeedingSubscription());
    dispatch(fetchAllSubscriptions());
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const openAssignModal = (partner) => {
    setModalPartner({
      store_id: partner.partner_id,
      partner_name: partner.partner_name,
      mode: "assign",
    });
    setPlanAmountInput("");
  };

  const openEditModal = (sub) => {
    setModalPartner({
      store_id: sub.store_id,
      partner_name: sub.partner_name,
      mode: "edit",
    });
    setPlanAmountInput(String(sub.plan_amount));
  };

  const closeModal = () => {
    setModalPartner(null);
    setPlanAmountInput("");
  };

  const handleSubmitModal = async () => {
    const amount = Number(planAmountInput);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid plan amount");
      return;
    }
    try {
      if (modalPartner.mode === "assign") {
        await dispatch(
          assignSubscription({ storeId: modalPartner.store_id, planAmount: amount })
        ).unwrap();
        toast.success("Subscription assigned");
      } else {
        await dispatch(
          updateSubscription({ storeId: modalPartner.store_id, planAmount: amount })
        ).unwrap();
        toast.success("Subscription updated");
      }
      closeModal();
      loadAll();
    } catch (err) {
      toast.error(err || "Failed to save subscription");
    }
  };

  const handleDeactivate = async (storeId) => {
    if (
      !window.confirm(
        "Deactivate this partner's subscription? Deductions will stop until reassigned."
      )
    )
      return;
    try {
      await dispatch(deactivateSubscription({ storeId })).unwrap();
      toast.success("Subscription deactivated");
      loadAll();
    } catch (err) {
      toast.error(err || "Failed to deactivate subscription");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">
          Partners past their free 15 bookings get a monthly plan assigned here — the
          fee (+18% GST) is deducted from their daily invoice payout until settled.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Needs Subscription</h3>
        {needingLoading ? (
          <div className="text-gray-500 text-sm py-4">Loading...</div>
        ) : needingSubscription.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">
            No partners currently need a subscription.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Partner</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-right">Total Bookings</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {needingSubscription.map((p) => (
                  <tr key={p.partner_id}>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {p.partner_name}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.partner_phone || "—"}</td>
                    <td className="px-4 py-2 text-right">{p.total_booking_count}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => openAssignModal(p)}
                        className="px-3 py-1.5 rounded-md bg-black text-white text-xs hover:bg-neutral-800"
                      >
                        Assign Subscription
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Subscriptions</h3>
        {subscriptionsLoading ? (
          <div className="text-gray-500 text-sm py-4">Loading...</div>
        ) : subscriptions.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">No subscriptions assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Partner</th>
                  <th className="px-4 py-2 text-right">Plan (+18% GST)</th>
                  <th className="px-4 py-2 text-right">Outstanding Due</th>
                  <th className="px-4 py-2 text-left">Next Due Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {s.partner_name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div>₹{(Number(s.plan_amount) * 1.18).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        ₹{Number(s.plan_amount).toFixed(2)} + GST
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {Number(s.outstanding_due) > 0 ? (
                        <span className="text-amber-700 font-medium">
                          ₹{Number(s.outstanding_due).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-green-700">Settled</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {s.next_due_date ? String(s.next_due_date).slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          s.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      {s.status === "active" && (
                        <button
                          onClick={() => handleDeactivate(s.store_id)}
                          className="px-3 py-1.5 rounded-md border border-red-300 text-red-600 text-xs hover:bg-red-50"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalPartner && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4 overflow-y-auto">
          <div className="bg-white w-[380px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold">
              {modalPartner.mode === "assign" ? "Assign Subscription" : "Edit Subscription"}
              {" — "}
              {modalPartner.partner_name}
            </h3>
            <div>
              <label className="text-sm text-gray-600">
                Plan Amount (₹, before 18% GST)
              </label>
              <input
                type="number"
                value={planAmountInput}
                onChange={(e) => setPlanAmountInput(e.target.value)}
                placeholder="e.g. 699 or 999"
                className="w-full border border-gray-300 focus:border-black focus:ring-1 focus:ring-black px-4 py-2.5 rounded-lg mt-1"
              />
              {Number(planAmountInput) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Deducted per cycle: ₹{(Number(planAmountInput) * 1.18).toFixed(2)}{" "}
                  (₹{Number(planAmountInput).toFixed(2)} + 18% GST)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitModal}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-md text-white text-sm ${
                  actionLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-black hover:bg-neutral-800"
                }`}
              >
                {actionLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerManualSubscriptions;
