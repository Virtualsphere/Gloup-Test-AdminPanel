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
