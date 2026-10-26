import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Analytics Intelligence V2. Every call takes { from, to } (YYYY-MM-DD, IST,
// inclusive) and returns that window plus the equal-length one before it.
const post = (url, fallback) =>
  async (body = {}, { rejectWithValue }) => {
    try {
      const response = await api.post(url, body, { withCredentials: false });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message || error.message || fallback;
      return rejectWithValue(message);
    }
  };

export const fetchAnalyticsProfitabilityV2 = createAsyncThunk(
  "analytics/fetchProfitabilityV2",
  post("/admin/app/getAnalyticsProfitabilityV2", "Failed to fetch profitability")
);

export const fetchAnalyticsSwitchingV2 = createAsyncThunk(
  "analytics/fetchSwitchingV2",
  post("/admin/app/getAnalyticsSwitchingV2", "Failed to fetch switching analytics")
);

export const fetchAnalyticsGravityV2 = createAsyncThunk(
  "analytics/fetchGravityV2",
  post("/admin/app/getAnalyticsGravityV2", "Failed to fetch gravity analytics")
);

export const fetchAnalyticsUninstalledV2 = createAsyncThunk(
  "analytics/fetchUninstalledV2",
  post("/admin/app/getAnalyticsUninstalledV2", "Failed to fetch uninstalled users")
);

// User Analytics V2. Overview also takes { city, platform }; retention takes
// { mode: "signup" | "first_booking", to, weeks }.
export const fetchUserAnalyticsOverviewV2 = createAsyncThunk(
  "analytics/fetchUserOverviewV2",
  post("/admin/app/getUserAnalyticsOverviewV2", "Failed to fetch user analytics")
);

export const fetchUserRetentionV2 = createAsyncThunk(
  "analytics/fetchUserRetentionV2",
  post("/admin/app/getUserRetentionV2", "Failed to fetch user retention")
);

// Deep User Insights V2: { from, to, city }. The far-travelling users list
// behind "View All" isn't kept in state - the dialog holds it.
export const fetchDeepUserInsightsV2 = createAsyncThunk(
  "analytics/fetchDeepUserInsightsV2",
  post("/admin/app/getDeepUserInsightsV2", "Failed to fetch deep user insights")
);

export const fetchFarTravellingUsersV2 = createAsyncThunk(
  "analytics/fetchFarTravellingUsersV2",
  async (body = {}, thunkApi) =>
    post("/admin/app/getDeepUserInsightsV2", "Failed to fetch far travelling users")(
      { ...body, include_far_users: true },
      thunkApi
    )
);

// Growth Dashboard V2: { date, from, to }. The "View" dialogs fetch one list
// at a time ({ ..., include_list }) and keep it themselves.
export const fetchGrowthDashboardV2 = createAsyncThunk(
  "analytics/fetchGrowthDashboardV2",
  post("/admin/app/getGrowthDashboardV2", "Failed to fetch growth dashboard")
);

export const fetchGrowthListV2 = createAsyncThunk(
  "analytics/fetchGrowthListV2",
  post("/admin/app/getGrowthDashboardV2", "Failed to fetch the list")
);

// Push + in-app notification to many users: { user_ids, title, description }.
export const sendBulkUserPushV2 = createAsyncThunk(
  "analytics/sendBulkUserPushV2",
  post("/admin/app/sendBulkUserPushV2", "Failed to send push notifications")
);

// Service / Booking Intelligence, Salon Heatmap, Salon Category: { from, to, city, ... }.
export const fetchServiceIntelligenceV2 = createAsyncThunk(
  "analytics/fetchServiceIntelligenceV2",
  post("/admin/app/getServiceIntelligenceV2", "Failed to fetch service intelligence")
);
export const fetchBookingIntelligenceV2 = createAsyncThunk(
  "analytics/fetchBookingIntelligenceV2",
  post("/admin/app/getBookingIntelligenceV2", "Failed to fetch booking intelligence")
);
export const fetchSalonHeatmapV2 = createAsyncThunk(
  "analytics/fetchSalonHeatmapV2",
  post("/admin/app/getSalonHeatmapV2", "Failed to fetch salon heatmap")
);
export const fetchSalonCategoryV2 = createAsyncThunk(
  "analytics/fetchSalonCategoryV2",
  post("/admin/app/getSalonCategoryV2", "Failed to fetch salon category intelligence")
);

// Partner Details V2: { store_id, from, to }; the picker list isn't kept in state.
export const fetchPartnerOverviewV2 = createAsyncThunk(
  "analytics/fetchPartnerOverviewV2",
  post("/admin/app/getPartnerOverviewV2", "Failed to fetch partner overview")
);
export const fetchPartnerPickerV2 = createAsyncThunk(
  "analytics/fetchPartnerPickerV2",
  post("/admin/app/getPartnerPickerV2", "Failed to fetch salons")
);

// Push + in-app notification to one salon (existing targeted-notification
// API): { store_id, title, description }.
export const sendPartnerNotificationV2 = createAsyncThunk(
  "analytics/sendPartnerNotificationV2",
  async ({ store_id, title, description }, thunkApi) =>
    post("/admin/app/send-targeted-notification", "Failed to send message")(
      { recipient_type: "partner", recipient_id: store_id, title, description },
      thunkApi
    )
);

// User segments (Overview / 360), live feed, Behavior, Click & Interaction.
export const fetchUserSegmentsV2 = createAsyncThunk(
  "analytics/fetchUserSegmentsV2",
  post("/admin/app/getUserSegmentsV2", "Failed to fetch user segments")
);
export const fetchUserLiveFeedV2 = createAsyncThunk(
  "analytics/fetchUserLiveFeedV2",
  post("/admin/app/getUserLiveFeedV2", "Failed to fetch live activity")
);
export const fetchBehaviorAnalyticsV2 = createAsyncThunk(
  "analytics/fetchBehaviorAnalyticsV2",
  post("/admin/app/getBehaviorAnalyticsV2", "Failed to fetch behavior analytics")
);
// One opportunity's users ({ ..., include_list }) - kept by the caller.
export const fetchBehaviorListV2 = createAsyncThunk(
  "analytics/fetchBehaviorListV2",
  post("/admin/app/getBehaviorAnalyticsV2", "Failed to fetch the list")
);
export const fetchClickInteractionV2 = createAsyncThunk(
  "analytics/fetchClickInteractionV2",
  post("/admin/app/getClickInteractionV2", "Failed to fetch click & interaction analytics")
);

// The contact list behind the uninstalled card (not stored in state - the
// caller turns it straight into an Excel download).
export const exportAnalyticsUninstalledV2 = createAsyncThunk(
  "analytics/exportUninstalledV2",
  async (body = {}, thunkApi) =>
    post("/admin/app/getAnalyticsUninstalledV2", "Failed to export uninstalled users")(
      { ...body, include_users: true },
      thunkApi
    )
);

const SECTIONS = {
  profitability: fetchAnalyticsProfitabilityV2,
  switching: fetchAnalyticsSwitchingV2,
  gravity: fetchAnalyticsGravityV2,
  uninstalled: fetchAnalyticsUninstalledV2,
  userOverview: fetchUserAnalyticsOverviewV2,
  userRetention: fetchUserRetentionV2,
  deepInsights: fetchDeepUserInsightsV2,
  growth: fetchGrowthDashboardV2,
  serviceIntel: fetchServiceIntelligenceV2,
  bookingIntel: fetchBookingIntelligenceV2,
  salonHeatmap: fetchSalonHeatmapV2,
  salonCategory: fetchSalonCategoryV2,
  partnerOverview: fetchPartnerOverviewV2,
  userSegments: fetchUserSegmentsV2,
  liveFeed: fetchUserLiveFeedV2,
  behavior: fetchBehaviorAnalyticsV2,
  clickInteraction: fetchClickInteractionV2,
};

const emptySection = () => ({ data: null, loading: false, error: null });

const initialState = {
  loading: false,
  error: null,
  success: false,
  ...Object.fromEntries(Object.keys(SECTIONS).map((key) => [key, emptySection()])),
  exportLoading: false,
};

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    resetAnalyticsState: () => initialState,
  },
  extraReducers: (builder) => {
    Object.entries(SECTIONS).forEach(([key, thunk]) => {
      builder
        .addCase(thunk.pending, (state) => {
          state[key].loading = true;
          state[key].error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state[key].loading = false;
          state[key].data = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state[key].loading = false;
          state[key].error = action.payload || "Failed to load";
        });
    });
    builder
      .addCase(exportAnalyticsUninstalledV2.pending, (state) => {
        state.exportLoading = true;
      })
      .addCase(exportAnalyticsUninstalledV2.fulfilled, (state) => {
        state.exportLoading = false;
      })
      .addCase(exportAnalyticsUninstalledV2.rejected, (state, action) => {
        state.exportLoading = false;
        state.error = action.payload || "Failed to export uninstalled users";
      });
  },
});

export const { resetAnalyticsState } = analyticsSlice.actions;
export default analyticsSlice.reducer;
