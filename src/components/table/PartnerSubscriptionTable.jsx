import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  deletePlan,
  getAllPlans,
} from "../../redux/slices/partnersubscriptionSlice";

const PartnerSubscriptionTable = ({ data = [], title }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState("table"); // table | card

  const handleDelete = (id) => {
  if (window.confirm("Are you sure you want to delete this plan?")) {
    dispatch(deletePlan(id)).then(() => {
      toast.success("Plan deleted 🗑️");
      dispatch(getAllPlans());
    });
   }
 };

 const handleEdit = (plan) => {
   navigate(`/partnersubscription/edit/${plan.plan_id}`);
 };

  return (
    <div className="p-4">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {title || "Subscription Plans"}
        </h2>

        <div className="flex gap-3 items-center">
          {/* Toggle View */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1 text-sm rounded ${
                view === "table"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600"
              }`}
            >
              Table
            </button>

            <button
              onClick={() => setView("card")}
              className={`px-3 py-1 text-sm rounded ${
                view === "card"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600"
              }`}
            >
              Cards
            </button>
          </div>

          {/* Add Button */}
          <button 
           onClick={() => navigate("/partnersubscription/add")}
           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow">
            + Add Plan
          </button>
        </div>
      </div>

      {/* ================= CARD VIEW ================= */}
      {view === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((plan) => (
            <div
              key={plan.plan_id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-300"
            >
              {/* Plan Name */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {plan.plan_name}
                </h2>

                {plan.plan_name === "Growth" && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">
                    Popular
                  </span>
                )}
              </div>

              {/* Price */}
              <p className="text-2xl font-bold mt-2 text-blue-600">
                ₹{plan.price}
              </p>

              {/* Duration */}
              <p className="text-sm text-gray-500">
                {plan.duration_months} Month
              </p>

              {/* Booking */}
              <p className="mt-2">
                {plan.is_unlimited
                  ? "Unlimited Bookings"
                  : `${plan.booking_limit} Bookings`}
              </p>

              {/* Features */}
              <ul className="mt-3 text-sm space-y-1">
                {plan.featuresMapping?.length > 0 ? (
                    plan.featuresMapping.map((f, i) => (
                    <li key={i}>
                        ✔ {f.featureDetails?.feature_name || "Feature"}
                    </li>
                    ))
                ) : (
                    <li className="text-gray-400">No Features</li>
                )}
                </ul>

              {/* Status */}
              <div className="mt-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    plan.is_active
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(plan)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(plan.plan_id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TABLE VIEW ================= */}
      {view === "table" && (
        <div className="overflow-x-auto">
          <table className="w-full border rounded-lg overflow-hidden">
            {/* Head */}
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Duration</th>
                <th className="p-3 text-left">Booking</th>
                <th className="p-3 text-left">Features</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="text-sm">
              {data.length > 0 ? (
                data.map((plan) => (
                  <tr
                    key={plan.plan_id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    {/* Plan */}
                    <td className="p-3 font-medium">
                      {plan.plan_name}
                    </td>

                    {/* Price */}
                    <td className="p-3 font-semibold">
                      ₹{plan.price}
                    </td>

                    {/* Duration */}
                    <td className="p-3">
                      {plan.duration_months} Month
                    </td>

                    {/* Booking */}
                    <td className="p-3">
                      {plan.is_unlimited
                        ? "Unlimited"
                        : plan.booking_limit}
                    </td>

                    {/* Features */}
                    <td className="p-3">
                      {plan.featuresMapping?.length > 0 ? (
                        <ul className="text-xs space-y-1">
                          {plan.featuresMapping.map((f, i) => (
                            <li key={i}>
                              • {f.featureDetails?.feature_name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No Features
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          plan.is_active
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {plan.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(plan.plan_id)
                        }
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center p-6 text-gray-500"
                  >
                    No subscription plans found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PartnerSubscriptionTable;