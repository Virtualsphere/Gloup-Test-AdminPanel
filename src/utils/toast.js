import { toast } from "react-hot-toast";

/**
 * Reusable function to show a toast with a unique ID.
 *
 * @param {string} id - Unique toast ID (e.g., "announcement-toast").
 * @param {string} message - Message to display.
 * @param {'success' | 'error' | 'loading'} type - Type of toast.
 * @param {object} [options] - Additional toast options.
 */
export function showToast(id, message, type = 'success', options = {}) {
  toast.dismiss(id);

  const toastTypes = {
    success: toast.success,
    error: toast.error,
    loading: toast.loading,
  };

  const show = toastTypes[type] || toast.success;

  show(message, { id, ...options });
}
