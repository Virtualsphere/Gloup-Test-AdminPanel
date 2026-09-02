import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const getCategoryDiscounts = createAsyncThunk(
  "categoryDiscount/getCategoryDiscounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getcategorydiscounts",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch category discounts";
      return rejectWithValue(message);
    }
  }
);

export const setCategoryDiscount = createAsyncThunk(
  "categoryDiscount/setCategoryDiscount",
  async ({ category_id, discount_percent, starts_at, ends_at }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/setcategorydiscount",
        { category_id, discount_percent, starts_at, ends_at },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to set category discount";
      return rejectWithValue(message);
    }
  }
);

export const clearCategoryDiscount = createAsyncThunk(
  "categoryDiscount/clearCategoryDiscount",
  async ({ category_id }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/clearcategorydiscount",
        { category_id },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to clear category discount";
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
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getCategoryDiscounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategoryDiscounts.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload || [];
      })
      .addCase(getCategoryDiscounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch category discounts";
      });
  },
});

export default categoryDiscountSlice.reducer;
