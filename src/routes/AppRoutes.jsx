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
const Partner = lazy(() => import("../components/data/Partner"));
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
const VerifyPartner = lazy(() => import("../components/data/VerifyPartner"));
const Bookings = lazy(() => import("../components/data/Bookings"));
const BookingsByOrderDate = lazy(() => import("../components/data/BookingsByOrderDate"));
const MonthlyReportPartners = lazy(() => import("../components/data/MonthlyReportPartners"));
const MonthlyReportDetails = lazy(() => import("../components/details/MonthlyReportDetails"));
const Holidays = lazy(() => import("../components/data/Holidays"));
const BookingForm = lazy(() => import("../components/form/BookingForm"));
const PartnerSubscription = lazy(() => import("../components/data/PartnerSubscription"));
const PartnerSubscriptionForm = lazy(() => import("../components/form/PartnerSubscriptionForm"));
const Marketing = lazy(() => import("../components/create/Marketing"));
const PartnerPaymentStatusPage = lazy(() => import("../components/details/PartnerPaymentStatusPage"));
const InvoicePartners = lazy(() => import("../components/data/InvoicePartners"));
const InvoiceDetails = lazy(() => import("../components/details/InvoiceDetails"));
const PartnerManualSubscriptions = lazy(() => import("../components/data/PartnerManualSubscriptions"));
const GenderProbability = lazy(() => import("../components/data/GenderProbability"));
const CategoryDiscount = lazy(() => import("../components/data/CategoryDiscount"));
const AnalyticsIntelligence = lazy(() => import("../components/analytics/AnalyticsIntelligence"));
const AnalyticsIntelligenceV2 = lazy(() => import("../components/analytics/AnalyticsIntelligenceV2"));
const DashboardV2 = lazy(() => import("../components/dashboard/DashboardV2"));
const BookingsByOrderDateV2 = lazy(() => import("../components/data/BookingsByOrderDateV2"));
const InvoicePayoutsV2 = lazy(() => import("../components/data/InvoicePayoutsV2"));
const MonthlyReportV2 = lazy(() => import("../components/data/MonthlyReportV2"));
const PartnerSubscriptionsV2 = lazy(() => import("../components/data/PartnerSubscriptionsV2"));
const ReviewsRatingsV2 = lazy(() => import("../components/data/ReviewsRatingsV2"));

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
        <Route path="/analytics-intelligence" element={<AnalyticsIntelligence title="Analytics Intelligence" />} />
        <Route path="/analytics-intelligence-v2" element={<AnalyticsIntelligenceV2 title="Analytics Intelligence V2" />} />
        <Route path="/dashboard-v2" element={<DashboardV2 title="Dashboard" />} />
        <Route path="/bookings-by-order-date-v2" element={<BookingsByOrderDateV2 title="Bookings by Order Date" />} />
        <Route path="/invoice-payouts-v2" element={<InvoicePayoutsV2 title="Invoices & Payouts" />} />
        <Route path="/monthly-report-v2" element={<MonthlyReportV2 title="Monthly Report" />} />
        <Route path="/partner-subscriptions-v2" element={<PartnerSubscriptionsV2 title="Partner Subscriptions" />} />
        <Route path="/reviews-ratings-v2" element={<ReviewsRatingsV2 title="Reviews & Ratings" />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin title="Admin" />} />
        <Route path="/allusers" element={<AllUsers title="Users"/>} />
        <Route path="/gender-probability" element={<GenderProbability title="Gender Probability"/>} />
        <Route path="/category-discount" element={<CategoryDiscount title="Category Discount"/>} />
        <Route path="/userdetails/:id" element={<UserDetails title="User Details"/>} />
        <Route path="/partner" element={<Partner title="Partner"/>} />
        <Route path="/bookings" element={<Bookings title="Bookings"/>} />
        <Route path="/bookings-by-order-date" element={<BookingsByOrderDate title="Bookings by Order Date"/>} />
        <Route path="/monthly-report" element={<MonthlyReportPartners title="Monthly Report"/>} />
        <Route path="/monthly-report/:id" element={<MonthlyReportDetails />} />
        <Route path="/holidays" element={<Holidays title="Holidays"/>} />
        <Route path="/bookings/:id" element={<BookingForm />} />
        <Route path="/partnersubscriptionplans" element={<PartnerSubscription title="Partner Subscription" />} />
        <Route path="/partnersubscription/add" element={<PartnerSubscriptionForm />} />
        <Route path="/partnersubscription/edit/:id" element={<PartnerSubscriptionForm />} />
        <Route path="/partnerdetails/:id" element={<PartnerDetails title="Partner Details"/>} />
        <Route path="/createPartner" element={<CreatePartner title="CreatePartner"/>} />
        <Route path="/verifypartner" element={<VerifyPartner title="Verify Partner"/>} />
        <Route path="/appointments" element={<Appointments title="Appointments"/>} />
        <Route path="/services" element={<Services title="Services"/>} />
        <Route path="/storeservices/:id" element={<StoreServices title="Store Services"/>} />
        <Route path="/category" element={<Category title="Category"/>} />
        <Route path="/notification" element={<Notification title="Notification"/>} />
        <Route path="/banner" element={<Banner title="Banner"/>} />
        <Route path="/marketing" element={<Marketing title="Marketing"/>} />
        <Route path="/coupon" element={<Coupon title="Coupon"/>} />
        <Route path="/refund" element={<Refund title="Refunds"/>} />
        <Route path="/subscription" element={<Subscription title="Subscription"/>} />
        <Route path="/review" element={<Review title="Review"/>} />
        <Route path="/partnersubscriptionstatus" element={<PartnerPaymentStatusPage title="Partner Subscription Status"/>} />
        <Route path="/invoice" element={<InvoicePartners title="Invoices"/>} />
        <Route path="/invoice/:id" element={<InvoiceDetails />} />
        <Route path="/partner-subscriptions" element={<PartnerManualSubscriptions title="Partner Subscriptions"/>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
