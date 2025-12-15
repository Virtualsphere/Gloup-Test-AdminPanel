import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AllUsers from "../components/data/AllUsers";

// Lazy-loaded components
const DashboardPage = lazy(() =>
  import("../components/dashboard/DashboardPage")
);
const Admin = lazy(() => import("../components/data/Admin"));
const Auth = lazy(() => import("../components/auth/AuthPages"));
const UserDetails = lazy(() => import("../components/details/UserDetails"));
const Partner = lazy(() => import("../components/data/partner"));
const PartnerDetails = lazy(() => import("../components/details/PartnerDetails"));
const CreatePartner = lazy(() => import("../components/create/CreatePartner"));
const Appointments = lazy(() => import("../components/create/Appointments"));
const Services = lazy(() => import("../components/create/Services"));
const StoreServices = lazy(() => import("../components/details/StoreServices"));
const Category = lazy(() => import("../components/data/Category"));
const Notification = lazy(() => import("../components/data/Notification"));
const Banner = lazy(() => import("../components/data/Banner"));
const Coupon = lazy(() => import("../components/data/Coupon"));
const Refund = lazy(() => import("../components/data/Refund"));
const Subscription = lazy(() => import("../components/data/Subscription"));
const Review = lazy(() => import("../components/data/Review"));
const AppRoutes = () => {
  return (
    <Suspense
      fallback={
        <div className="text-center p-4 min-h-screen flex justify-center items-center">
          Loading...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<DashboardPage title="DashboardPage" />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin title="Admin" />} />
        <Route path="/allusers" element={<AllUsers title="Users"/>} />
        <Route path="/userdetails/:id" element={<UserDetails title="UserDetails"/>} />
        <Route path="/partner" element={<Partner title="Partner"/>} />
        <Route path="/partnerdetails/:id" element={<PartnerDetails title="PartnerDetails"/>} />
        <Route path="/createPartner" element={<CreatePartner title="CreatePartner"/>} />
        <Route path="/appointments" element={<Appointments title="Appointments"/>} />
        <Route path="/services" element={<Services title="Services"/>} />
        <Route path="/storeservices/:id" element={<StoreServices title="StoreServices"/>} />
        <Route path="/category" element={<Category title="Category"/>} />
        <Route path="/notification" element={<Notification title="Notification"/>} />
        <Route path="/banner" element={<Banner title="Banner"/>} />
        <Route path="/coupon" element={<Coupon title="Coupon"/>} />
        <Route path="/refund" element={<Refund title="Refunds"/>} />
        <Route path="/subscription" element={<Subscription title="Subscription"/>} />
        <Route path="/review" element={<Review title="Review"/>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
