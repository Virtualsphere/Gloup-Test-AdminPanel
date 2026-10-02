import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Partners past the free-15-bookings threshold with no active manual
// subscription yet. Entirely separate from the Razorpay-driven
// PartnerSubscriptions system (partnersubscriptionSlice.js).
export const fetchPartnersNeedingSubscription = createAsyncThunk(
  "partnerManualSubscription/fetchPartnersNeedingSubscription",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getpartnersneedingmanualsubscription",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch partners needing subscription"
      );
    }
  }
);

export const fetchAllSubscriptions = createAsyncThunk(
  "partnerManualSubscription/fetchAllSubscriptions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getallmanualpartnersubscriptions",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch partner subscriptions"
      );
    }
  }
);

export const assignSubscription = createAsyncThunk(
  "partnerManualSubscription/assignSubscription",
  async ({ storeId, planAmount }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/assignmanualpartnersubscription",
        { store_id: storeId, plan_amount: planAmount },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to assign subscription"
      );
    }
  }
);

export const updateSubscription = createAsyncThunk(
  "partnerManualSubscription/updateSubscription",
  async ({ storeId, planAmount }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updatemanualpartnersubscription",
        { store_id: storeId, plan_amount: planAmount },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to update subscription"
      );
    }
  }
);

export const deactivateSubscription = createAsyncThunk(
  "partnerManualSubscription/deactivateSubscription",
  async ({ storeId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/deactivatemanualpartnersubscription",
        { store_id: storeId },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to deactivate subscription"
      );
    }
  }
);

// Free paid bookings a partner gets before they need a subscription
// (AdminSettings.free_booking_limit, default 15).
export const fetchFreeBookingLimit = createAsyncThunk(
  "partnerManualSubscription/fetchFreeBookingLimit",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getfreebookinglimit",
        {},
        { withCredentials: false }
      );
      return response.data.data?.free_booking_limit ?? null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch free booking limit"
      );
    }
  }
);

export const updateFreeBookingLimit = createAsyncThunk(
  "partnerManualSubscription/updateFreeBookingLimit",
  async ({ limit }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updatefreebookinglimit",
        { free_booking_limit: limit },
        { withCredentials: false }
      );
      return response.data.data?.free_booking_limit ?? null;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to update free booking limit"
      );
    }
  }
);

// ---- V2 (PartnerSubscriptionsV2 page) ----

const v2Error = (error, fallback) =>
  error.response?.data?.error?.message || error.message || fallback;

// One page of subscriptions + pending salons. `params`: page, limit, search,
// status (active|due|inactive|pending), plan_amount, city, due_within, sort.
export const fetchSubscriptionsListV2 = createAsyncThunk(
  "partnerManualSubscription/fetchSubscriptionsListV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getManualSubscriptionsListV2", params, {
        withCredentials: false,
      });
      const payload = response.data.data ?? {};
      return {
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        total: Number(payload.total) || 0,
      };
    } catch (error) {
      return rejectWithValue(v2Error(error, "Failed to fetch partner subscriptions"));
    }
  }
);

// Same query, every matching row, nothing stored - for CSV export.
export const exportSubscriptionsV2 = createAsyncThunk(
  "partnerManualSubscription/exportSubscriptionsV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getManualSubscriptionsListV2",
        { ...params, page: 1, limit: 10000 },
        { withCredentials: false }
      );
      const rows = response.data.data?.rows;
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return rejectWithValue(v2Error(error, "Failed to export partner subscriptions"));
    }
  }
);

// Collected per named range ({ key, from, to }), status counts, owed now,
// plan mix, top partners for `focus`, filter options.
export const fetchSubscriptionsSummaryV2 = createAsyncThunk(
  "partnerManualSubscription/fetchSubscriptionsSummaryV2",
  async ({ ranges, focus }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getManualSubscriptionsSummaryV2",
        { ranges, focus },
        { withCredentials: false }
      );
      return response.data.data ?? null;
    } catch (error) {
      return rejectWithValue(v2Error(error, "Failed to fetch subscriptions summary"));
    }
  }
);

// One salon's fee deductions - returned to the caller, not stored.
export const fetchSubscriptionHistoryV2 = createAsyncThunk(
  "partnerManualSubscription/fetchSubscriptionHistoryV2",
  async ({ storeId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getManualSubscriptionHistoryV2",
        { store_id: storeId, page, limit },
        { withCredentials: false }
      );
      return response.data.data ?? null;
    } catch (error) {
      return rejectWithValue(v2Error(error, "Failed to fetch subscription history"));
    }
  }
);

const partnerManualSubscriptionSlice = createSlice({
  name: "partnerManualSubscription",
  initialState: {
    freeBookingLimit: null,

    needingSubscription: [],
    needingLoading: false,
    needingError: null,

    subscriptions: [],
    subscriptionsLoading: false,
    subscriptionsError: null,

    actionLoading: false,

    // V2
    listV2: { rows: [], total: 0 },
    listV2Loading: false,
    listV2Error: null,
    summaryV2: null,
    summaryV2Loading: false,
    summaryV2Error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPartnersNeedingSubscription.pending, (state) => {
        state.needingLoading = true;
        state.needingError = null;
      })
      .addCase(fetchPartnersNeedingSubscription.fulfilled, (state, action) => {
        state.needingLoading = false;
        state.needingSubscription = action.payload || [];
      })
      .addCase(fetchPartnersNeedingSubscription.rejected, (state, action) => {
        state.needingLoading = false;
        state.needingError = action.payload;
      })

      .addCase(fetchAllSubscriptions.pending, (state) => {
        state.subscriptionsLoading = true;
        state.subscriptionsError = null;
      })
      .addCase(fetchAllSubscriptions.fulfilled, (state, action) => {
        state.subscriptionsLoading = false;
        state.subscriptions = action.payload || [];
      })
      .addCase(fetchAllSubscriptions.rejected, (state, action) => {
        state.subscriptionsLoading = false;
        state.subscriptionsError = action.payload;
      })

      .addCase(assignSubscription.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(assignSubscription.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(assignSubscription.rejected, (state) => {
        state.actionLoading = false;
      })

      .addCase(updateSubscription.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateSubscription.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(updateSubscription.rejected, (state) => {
        state.actionLoading = false;
      })

      .addCase(deactivateSubscription.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deactivateSubscription.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(deactivateSubscription.rejected, (state) => {
        state.actionLoading = false;
      })

      .addCase(fetchFreeBookingLimit.fulfilled, (state, action) => {
        state.freeBookingLimit = action.payload;
      })
      .addCase(updateFreeBookingLimit.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateFreeBookingLimit.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.freeBookingLimit = action.payload;
      })
      .addCase(updateFreeBookingLimit.rejected, (state) => {
        state.actionLoading = false;
      })

      .addCase(fetchSubscriptionsListV2.pending, (state) => {
        state.listV2Loading = true;
        state.listV2Error = null;
      })
      .addCase(fetchSubscriptionsListV2.fulfilled, (state, action) => {
        state.listV2Loading = false;
        state.listV2 = action.payload;
      })
      .addCase(fetchSubscriptionsListV2.rejected, (state, action) => {
        state.listV2Loading = false;
        state.listV2Error = action.payload;
      })

      .addCase(fetchSubscriptionsSummaryV2.pending, (state) => {
        state.summaryV2Loading = true;
        state.summaryV2Error = null;
      })
      .addCase(fetchSubscriptionsSummaryV2.fulfilled, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2 = action.payload;
      })
      .addCase(fetchSubscriptionsSummaryV2.rejected, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2Error = action.payload;
      });
  },
});

export default partnerManualSubscriptionSlice.reducer;
