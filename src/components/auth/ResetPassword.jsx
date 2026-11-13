import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import api from "../../utils/api";
import AuthCard from "./AuthCard";

const TOAST_ID = "reset-password-toast";

const PasswordField = ({ label, error, registration }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock size={18} className="text-gray-400" />
        </div>
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          {...registration}
          className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute cursor-pointer inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
          tabIndex={-1}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [linkError, setLinkError] = useState(
    token ? null : "This reset link is invalid or has expired. Please request a new one from the login page."
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ password }) => {
    try {
      await api.post(
        "/admin/auth/reset-password",
        { token, newPassword: password },
        { withCredentials: false }
      );
      // The reset ends every session, so a token kept in this browser is dead.
      // Left in place, the route gate would bounce the login page to the dashboard.
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      toast.success("Password reset. Please sign in with your new password.", {
        id: TOAST_ID,
      });
      navigate("/auth", { replace: true });
    } catch (error) {
      const apiError = error.response?.data?.error;
      if (apiError?.code === "reset-link-not-valid") {
        setLinkError(apiError.message);
      } else {
        toast.error(
          apiError?.message || "Could not reset the password. Please try again.",
          { id: TOAST_ID }
        );
      }
    }
  };

  if (linkError) {
    return (
      <AuthCard subtitle="Reset link not valid">
        <p className="text-sm text-gray-700">{linkError}</p>
        <Link
          to="/auth"
          className="block mt-6 text-center text-sm font-medium text-black hover:underline"
        >
          Back to Sign In
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard subtitle="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <PasswordField
          label="New Password"
          error={errors.password}
          registration={register("password", {
            required: "New password is required",
            minLength: { value: 8, message: "Use at least 8 characters" },
            maxLength: { value: 72, message: "Use at most 72 characters" },
            validate: (value) =>
              !/\s/.test(value) || "Password must not contain spaces",
          })}
        />
        <PasswordField
          label="Confirm Password"
          error={errors.confirmPassword}
          registration={register("confirmPassword", {
            required: "Please confirm the new password",
            validate: (value, values) =>
              value === values.password || "Passwords do not match",
          })}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full cursor-pointer bg-black text-white py-2 px-4 rounded-md transition-colors font-medium flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Resetting..." : "Reset Password"}
          <ArrowRight size={16} className="ml-2" />
        </button>
      </form>
    </AuthCard>
  );
};

export default ResetPassword;
