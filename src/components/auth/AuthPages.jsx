import { useState } from "react";
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Scissors,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "../../utils/api";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";

const AuthPages = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    debugger;
    if (!isSignUp) {
      try {
        const response = await api.post(
          "/admin/auth/login",
          {
            email: data.email,
            password: data.password,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: false,
          }
        );

        let passwordToastId = "password incorrect";
        if (response.data?.data == "password incorrect") {
          toast.dismiss(passwordToastId);
          toast.success("Password Incorrect", { id: passwordToastId });
        }

        const token = response?.data?.data?.token;
        const name = response?.data?.data?.name;
        const email = data.email;
        const toastId = "login";
        if (token) {
          toast.dismiss(toastId);
          toast.success("Login Successflly!", { id: toastId });
          localStorage.setItem("token", token);
          localStorage.setItem("name", name);
          localStorage.setItem("email", email);
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Login failed:", error || error.message, "lk");
      }
    }
    reset();
  };

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev);
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-lg w-full max-w-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-black to-black p-6 text-white">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Scissors size={32} className="text-black" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center">GloUp Admin Portal</h1>
          <p className="text-center text-white mt-1">
            {isSignUp ? "Create a new account" : "Sign in to your account"}
          </p>
        </div>

        <form className="p-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4">
            {isSignUp && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      {...register("name", { required: "Name is required" })}
                      className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={18} className="text-gray-400" />
                    </div>
                    <input
                      {...register("number", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9+\-()\s]+$/,
                          message: "Invalid phone number",
                        },
                      })}
                      className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>
                  {errors.number && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.number.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  className="w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {/* Left Icon */}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>

                {/* Input */}
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: "Password is required",
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value) || "Password must not contain spaces",
                    },
                  })}
                  className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />

                {/* Right Icon (Eye Toggle) */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute cursor-pointer inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                style={{ cursor: "pointer" }}
                type="submit"
                className="w-full bg-gradient-to-r from-black to-black text-white py-2 px-4 rounded-md hover:from-black hover:to-black transition-colors font-medium flex items-center justify-center"
              >
                {isSignUp ? "Create Account" : "Sign In"}
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          </div>

          {/* <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
              <button
              style={{cursor:"pointer"}}
                type="button"
                onClick={toggleAuthMode}
                className="ml-1 text-black hover:text-black font-medium hover:underline focus:outline-none"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div> */}
        </form>
      </div>
    </div>
  );
};

export default AuthPages;
