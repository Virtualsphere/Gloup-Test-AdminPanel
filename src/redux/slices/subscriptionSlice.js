
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllSubscriptions
export const getAllSubscriptionsList = createAsyncThunk(
  "allSubscriptions/getAllSubscriptionsList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getallsubscriptions", {},{
        headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch allSubscriptions";
      return rejectWithValue(message);
    }
  }
);

// add subscription
export const addSubscription = createAsyncThunk(
  "allSubscriptions/addSubscription",
  async (subscriptionData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/addsubscription", subscriptionData, {
        headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to add subscription";
      return rejectWithValue(message);
    }
  }
);

// update subscription Status
export const updateSubscriptionStatus = createAsyncThunk(
  "allSubscriptions/updateSubscriptionStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/updatesubscription", { id, status }, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to update Subscription Status";
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  loading: false,
  error: null,
  success: false,
  allSubscriptionsList: [],
};

const allSubscriptionsSlice = createSlice({
  name: "allSubscriptions",
  initialState,
  reducers: {
    resetAllSubscriptionsState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allSubscriptionsList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allSubscriptions list
      .addCase(getAllSubscriptionsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllSubscriptionsList.fulfilled, (state, action) => {
        state.loading = false;
        state.allSubscriptionsList = action.payload;
      })
      .addCase(getAllSubscriptionsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allSubscriptions";
      })

      // add subscription
      .addCase(addSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSubscription.fulfilled, (state) => {
        state.loading = false;
               
      })
      .addCase(addSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add Subscription";
      })

      // update subscription Status
      .addCase(updateSubscriptionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubscriptionStatus.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateSubscriptionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update Subscription Status";
      });
              
  },
});

export const { resetAllSubscriptionsState } = allSubscriptionsSlice.actions;
export default allSubscriptionsSlice.reducer;
