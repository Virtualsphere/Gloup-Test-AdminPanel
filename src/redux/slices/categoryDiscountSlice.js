import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const getCategoryDiscountOverview = createAsyncThunk(
  "categoryDiscount/getCategoryDiscountOverview",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getcategorydiscountoverview",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch category discount overview";
      return rejectWithValue(message);
    }
  }
);

export const getCategoryDiscountHistory = createAsyncThunk(
  "categoryDiscount/getCategoryDiscountHistory",
  async ({ category_id }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getcategorydiscounthistory",
        { category_id },
        { withCredentials: false }
      );
      return { category_id, history: response.data.data };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch category discount history";
      return rejectWithValue(message);
    }
  }
);

export const addCategoryDiscount = createAsyncThunk(
  "categoryDiscount/addCategoryDiscount",
  async ({ category_id, discount_percent, starts_at, ends_at }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/addcategorydiscount",
        { category_id, discount_percent, starts_at, ends_at },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to add category discount";
      return rejectWithValue(message);
    }
  }
);

export const endCategoryDiscountNow = createAsyncThunk(
  "categoryDiscount/endCategoryDiscountNow",
  async ({ category_id }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/endcategorydiscountnow",
        { category_id },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to end category discount";
      return rejectWithValue(message);
    }
  }
);

export const cancelScheduledCategoryDiscount = createAsyncThunk(
  "categoryDiscount/cancelScheduledCategoryDiscount",
  async ({ id }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/cancelscheduledcategorydiscount",
        { id },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to cancel scheduled category discount";
      return rejectWithValue(message);
    }
  }
);

const categoryDiscountSlice = createSlice({
  name: "categoryDiscount",
  initialState: {
    categories: [],
    loading: false,
    error: null,
    // category_id -> array of history rows (with computed `state`)
    historyByCategory: {},
    historyLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCategoryDiscountOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategoryDiscountOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload || [];
      })
      .addCase(getCategoryDiscountOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch category discount overview";
      })

      .addCase(getCategoryDiscountHistory.pending, (state) => {
        state.historyLoading = true;
      })
      .addCase(getCategoryDiscountHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.historyByCategory[action.payload.category_id] = action.payload.history || [];
      })
      .addCase(getCategoryDiscountHistory.rejected, (state) => {
        state.historyLoading = false;
      });
  },
});

export default categoryDiscountSlice.reducer;
