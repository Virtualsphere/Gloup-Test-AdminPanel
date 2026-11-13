import { Scissors } from "lucide-react";

// The card around the forgot / reset password pages, matching the login page.
const AuthCard = ({ subtitle, children }) => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 min-h-screen flex items-center justify-center p-4">
    <div className="bg-white shadow-xl rounded-lg w-full max-w-md border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-black to-black p-6 text-white">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Scissors size={32} className="text-black" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center">GloUp Admin Portal</h1>
        <p className="text-center text-white mt-1">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default AuthCard;
