import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    addPlan,
    updatePlan,
    getAllPlans,
    getAllPlansFeatures,
    getPlanById,
    clearSelectedPlan 
} from "../../redux/slices/partnersubscriptionSlice";
import { useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

const PartnerSubscriptionForm = ({ editData }) => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        plan_name: "",
        price: "",
        duration_months: 1,
        booking_limit: "",
        is_unlimited: false,
        features: [],
    });

    /* ================= FETCH FEATURES ================= */
    useEffect(() => {
        dispatch(getAllPlansFeatures());
    }, [dispatch]);

    useEffect(() => {
    if (id) {
        dispatch(getPlanById(id));
    }
    }, [id, dispatch]);

    const { featuresList = [], selectedPlan } = useSelector((state) => state.allpartnerSubscription);

    /* ================= EDIT MODE ================= */
    useEffect(() => {
    if (id && selectedPlan) {
        setForm({
        plan_name: selectedPlan.plan_name || "",
        price: selectedPlan.price || "",
        duration_months: selectedPlan.duration_months || 1,
        booking_limit: selectedPlan.booking_limit || "",
        is_unlimited: selectedPlan.is_unlimited || false,
        features:
            selectedPlan.featuresMapping?.map((f) => f.feature_id) || [],
        });
    }
    }, [selectedPlan]);

    useEffect(() => {
        if (!id) {
            dispatch(clearSelectedPlan()); 
        }
        }, [id, dispatch]);

    /* ================= HANDLERS ================= */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const toggleFeature = (id) => {
        setForm((prev) => ({
            ...prev,
            features: prev.features.includes(id)
                ? prev.features.filter((f) => f !== id)
                : [...prev.features, id],
        }));
    };

    /* ================= SUBMIT ================= */
   const handleSubmit = async () => {
    if (!form.plan_name || !form.price) {
        alert("Please fill required fields");
        return;
    }

    setLoading(true);

    try {
         if (id) {
            await dispatch(updatePlan({ id, data: form })).unwrap();
            toast.success("Plan updated successfully 🎉");
        } else {
            await dispatch(addPlan(form)).unwrap();
            toast.success("Plan created successfully 🚀");
        }

        dispatch(getAllPlans());
       setTimeout(() => {
        navigate("/partnersubscriptionplans");
        }, 800);

    } catch (err) {
        console.error(err);
        toast.error("Something went wrong ❌");
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="p-6 max-w-9xl mx-auto">

            {/* HEADER */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">
                    {id ? "Edit Subscription Plan" : "Create Subscription Plan"}
                </h2>
                <p className="text-gray-500 text-sm">
                    Configure pricing, limits, and features
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 space-y-6">

                {/* ================= BASIC INFO ================= */}
                <div>
                    <h3 className="font-semibold mb-4 text-gray-700">Basic Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        <input
                            name="plan_name"
                            placeholder="Plan Name"
                            value={form.plan_name}
                            onChange={handleChange}
                            className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />

                        <input
                            name="price"
                            type="number"
                            placeholder="Price"
                            value={form.price}
                            onChange={handleChange}
                            className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />

                        <input
                            name="duration_months"
                            type="number"
                            placeholder="Duration (Months)"
                            value={form.duration_months}
                            onChange={handleChange}
                            className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />

                    </div>
                </div>

                {/* ================= BOOKING ================= */}
                <div>
                    <h3 className="font-semibold mb-4 text-gray-700">Booking Settings</h3>

                    <div className="flex items-center gap-3 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_unlimited"
                                checked={form.is_unlimited}
                                onChange={handleChange}
                                className="accent-blue-600"
                            />
                            <span className="text-sm font-medium">
                                Unlimited Booking
                            </span>
                        </label>
                    </div>

                    {!form.is_unlimited && (
                        <input
                            name="booking_limit"
                            type="number"
                            placeholder="Booking Limit"
                            value={form.booking_limit}
                            onChange={handleChange}
                            className="border border-gray-300 p-3 rounded-lg w-full md:w-1/3"
                        />
                    )}
                </div>

                {/* ================= FEATURES ================= */}
                <div>
                    <h3 className="font-semibold mb-4 text-gray-700">
                        Features
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {!featuresList?.length ? (

                            // Skeleton
                            Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-12 rounded-lg bg-gray-200 animate-pulse"
                                ></div>
                            ))

                        ) : (

                            featuresList.map((f) => {
                                const selected = form.features.includes(f.feature_id);

                                return (
                                    <div
                                        key={f.feature_id}
                                        onClick={() => toggleFeature(f.feature_id)}
                                        className={`cursor-pointer border border-gray-300 rounded-lg p-3 flex items-center justify-between transition
                  ${selected
                                                ? "border-blue-500 bg-blue-50"
                                                : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <span className="text-sm">{f.feature_name}</span>

                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            readOnly
                                        />
                                    </div>
                                );
                            })

                        )}

                    </div>
                </div>

                {/* ================= ACTIONS ================= */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-300">

                    <button
                        onClick={() => navigate("/partnersubscriptionplans")}
                        className="px-5 py-2 border rounded-lg hover:bg-gray-100"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 rounded-lg shadow flex items-center gap-2
                        ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                    >
                        {loading && (
                            <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="white"
                                    strokeWidth="3"
                                    fill="none"
                                    opacity="0.3"
                                />
                                <path
                                    d="M4 12a8 8 0 018-8"
                                    stroke="white"
                                    strokeWidth="3"
                                    fill="none"
                                />
                            </svg>
                        )}

                        {id ? "Update Plan" : "Save Plan"}
                    </button>

                </div>

            </div>
        </div>
    );
};

export default PartnerSubscriptionForm;