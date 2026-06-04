

// store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // Uses localStorage by default

// Reducer imports

import adminReducer from "./slices/adminSlice";
import profileReducer from "./slices/profileSlice";
import dashboardReducer from "./slices/dashboardSlice";
import allUsersReducer from "./slices/allUsersSlice";
import partnerReducer from "./slices/partnersSlice";
import categoryReducer from "./slices/categorySlice";
import notificationReducer from "./slices/notificationSlice";
import bannerReducer from "./slices/bannerSlice";
import couponReducer from "./slices/couponSlice";
import refundReducer from "./slices/refundSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import reviewReducer from "./slices/reviewSlice";
import bookingReducer from "./slices/bookingSlice";
import partnerSubscriptionReducer from "./slices/partnersubscriptionSlice";

const persistConfig = {
  key: "root", // key for localStorage
  storage,
  whitelist: ["class", "student"], // only persist these slices
};

// Combine all reducers
const rootReducer = combineReducers({
  
  admin: adminReducer,
  profile: profileReducer,
  dashboard: dashboardReducer,
  allUsers: allUsersReducer,
  allPartners: partnerReducer,
  allCategory: categoryReducer,
  allNotification: notificationReducer,
  allBanners: bannerReducer,
  allCoupons: couponReducer,
  allRefunds: refundReducer,
  allSubscriptions: subscriptionReducer,
  allReviews: reviewReducer,
  allBookings: bookingReducer,
  allpartnerSubscription: partnerSubscriptionReducer,
});

// Wrap the rootReducer with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persisted reducer
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // required for redux-persist to work with non-serializable actions
    }),
});

// Export store and persistor
export const persistor = persistStore(store);
export default store;
