import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const getPartnerPaymentStatus = createAsyncThunk(
  "partnerPayments/getStatus",
  async ({ page = 1, limit = 10, status = "", search = "" } = {}, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getPartnerPaymentStatus",
        { page, limit, status, search },
        { headers: { "Content-Type": "application/json" }, withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || error.message || "Failed to fetch partner payment status"
      );
    }
  }
);

const initialState = {
  partners: [],
  total: 0,
  summary: { total: 0, paid: 0, unpaid: 0 },
  loading: false,
  error: null,
};

const partnerPaymentSlice = createSlice({
  name: "partnerPayments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getPartnerPaymentStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPartnerPaymentStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.partners = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.summary = action.payload.summary || { total: 0, paid: 0, unpaid: 0 };
      })
      .addCase(getPartnerPaymentStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default partnerPaymentSlice.reducer;