import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X } from 'lucide-react';
import { toast } from "react-hot-toast";
import { addPayout, getAllPayoutLogs, getPartnerDetail } from "../../redux/slices/partnersSlice";
import moment from "moment";

export default function PayoutModal({ isOpen, onClose, id }) {
  const [amount, setAmount] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const toastId = "payout-toast";
        try {
          const resultAction = await dispatch(addPayout({ store_id:id, amount: parseFloat(amount) }));

          if (addPayout.fulfilled.match(resultAction)) {
            toast.dismiss(toastId);
            toast.success("Payout added!", { id: toastId });
            dispatch(getAllPayoutLogs());
            dispatch(getPartnerDetail({id:id}))
            setAmount('');
            onClose();
          
          } else {
            toast.dismiss(toastId);
            toast.error("Failed to add payout.", { id: toastId });
          }
        } catch (error) {
          toast.dismiss(toastId);
          toast.error("Something went wrong.", { id: toastId });
          console.error("Failed to add data", error);
        }
    
   };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 overflow-y-auto">
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 mt-10 mb-10">
        {/* Top-right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-red-500"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4 text-center">Add Payout Amount</h2>

        <form onSubmit={handleSubmit}>
          {/* <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label> */}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Enter amount"
            required
                 
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-900 transition"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
