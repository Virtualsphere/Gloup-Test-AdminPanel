import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Partners with at least one booking created today, plus a running total.
export const fetchInvoicePartners = createAsyncThunk(
  "invoice/fetchInvoicePartners",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getinvoicepartnerstoday",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch invoice partners"
      );
    }
  }
);

// Line-item booking breakdown for one partner, today.
export const fetchInvoiceDetails = createAsyncThunk(
  "invoice/fetchInvoiceDetails",
  async ({ partnerId }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getinvoicedetails",
        { partner_id: partnerId },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch invoice details"
      );
    }
  }
);

export const downloadInvoicePDF = createAsyncThunk(
  "invoice/downloadInvoicePDF",
  async ({ partnerId }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `/admin/app/downloadinvoicepdf/${partnerId}`,
        {},
        { responseType: "blob" }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to download invoice PDF"
      );
    }
  }
);

const invoiceSlice = createSlice({
  name: "invoice",
  initialState: {
    partners: [],
    totalBookings: 0,
    totalPartners: 0,
    date: null,
    partnersLoading: false,
    partnersError: null,

    details: null,
    detailsLoading: false,
    detailsError: null,

    pdfLoading: false,
  },
  reducers: {
    clearInvoiceDetails: (state) => {
      state.details = null;
      state.detailsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoicePartners.pending, (state) => {
        state.partnersLoading = true;
        state.partnersError = null;
      })
      .addCase(fetchInvoicePartners.fulfilled, (state, action) => {
        state.partnersLoading = false;
        state.partners = action.payload?.partners || [];
        state.totalBookings = action.payload?.total_bookings || 0;
        state.totalPartners = action.payload?.total_partners || 0;
        state.date = action.payload?.date || null;
      })
      .addCase(fetchInvoicePartners.rejected, (state, action) => {
        state.partnersLoading = false;
        state.partnersError = action.payload;
      })

      .addCase(fetchInvoiceDetails.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchInvoiceDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.details = action.payload;
      })
      .addCase(fetchInvoiceDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload;
      })

      .addCase(downloadInvoicePDF.pending, (state) => {
        state.pdfLoading = true;
      })
      .addCase(downloadInvoicePDF.fulfilled, (state) => {
        state.pdfLoading = false;
      })
      .addCase(downloadInvoicePDF.rejected, (state) => {
        state.pdfLoading = false;
      });
  },
});

export const { clearInvoiceDetails } = invoiceSlice.actions;
export default invoiceSlice.reducer;
