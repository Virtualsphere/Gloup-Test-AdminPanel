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

const partnerManualSubscriptionSlice = createSlice({
  name: "partnerManualSubscription",
  initialState: {
    needingSubscription: [],
    needingLoading: false,
    needingError: null,

    subscriptions: [],
    subscriptionsLoading: false,
    subscriptionsError: null,

    actionLoading: false,
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
      });
  },
});

export default partnerManualSubscriptionSlice.reducer;
