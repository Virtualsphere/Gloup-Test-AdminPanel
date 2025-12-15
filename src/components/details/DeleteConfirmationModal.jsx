import React from "react";
import { XCircle } from "lucide-react";

const DeleteConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  partnerName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-xs bg-white rounded-xl shadow-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-800"
          onClick={onCancel}
          aria-label="Close delete confirmation"
        >
          <XCircle className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center space-y-3">
          <XCircle className="h-9 w-9 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Delete Partner
          </h3>
          <p className="text-sm text-gray-500 text-center">
            Are you sure you want to delete <span className="font-medium text-gray-700">{partnerName}</span>?
          </p>
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="w-1/2 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-1/2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
