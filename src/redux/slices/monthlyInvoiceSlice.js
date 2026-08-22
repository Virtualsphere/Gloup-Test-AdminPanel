import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Partners with at least one appointment booking_date in the invoice month (IST), plus totals.
export const fetchMonthlyInvoicePartners = createAsyncThunk(
  "monthlyInvoice/fetchMonthlyInvoicePartners",
  async (params = {}, { rejectWithValue }) => {
    try {
      const body = params && params.month ? { month: params.month } : {};
      const response = await api.post(
        "/admin/app/getinvoicepartnersmonthly",
        body,
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch monthly invoice partners"
      );
    }
  }
);

// Line-item booking breakdown for one partner across the invoice month (booking_date).
export const fetchMonthlyInvoiceDetails = createAsyncThunk(
  "monthlyInvoice/fetchMonthlyInvoiceDetails",
  async ({ partnerId, month }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getmonthlyinvoicedetails",
        {
          partner_id: partnerId,
          ...(month ? { month } : {}),
        },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch monthly invoice details"
      );
    }
  }
);

export const downloadMonthlyInvoicePDF = createAsyncThunk(
  "monthlyInvoice/downloadMonthlyInvoicePDF",
  async ({ partnerId, month }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `/admin/app/downloadmonthlyinvoicepdf/${partnerId}`,
        month ? { month } : {},
        { responseType: "blob" }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to download monthly invoice PDF"
      );
    }
  }
);

const monthlyInvoiceSlice = createSlice({
  name: "monthlyInvoice",
  initialState: {
    partners: [],
    totalBookings: 0,
    totalPartners: 0,
    month: null,
    fromDate: null,
    toDate: null,
    partnersLoading: false,
    partnersError: null,

    details: null,
    detailsLoading: false,
    detailsError: null,

    pdfLoading: false,
  },
  reducers: {
    clearMonthlyInvoiceDetails: (state) => {
      state.details = null;
      state.detailsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonthlyInvoicePartners.pending, (state) => {
        state.partnersLoading = true;
        state.partnersError = null;
      })
      .addCase(fetchMonthlyInvoicePartners.fulfilled, (state, action) => {
        state.partnersLoading = false;
        state.partners = action.payload?.partners || [];
        state.totalBookings = action.payload?.total_bookings || 0;
        state.totalPartners = action.payload?.total_partners || 0;
        state.month = action.payload?.month || null;
        state.fromDate = action.payload?.from_date || null;
        state.toDate = action.payload?.to_date || null;
      })
      .addCase(fetchMonthlyInvoicePartners.rejected, (state, action) => {
        state.partnersLoading = false;
        state.partnersError = action.payload;
      })

      .addCase(fetchMonthlyInvoiceDetails.pending, (state) => {
        state.detailsLoading = true;
        state.detailsError = null;
      })
      .addCase(fetchMonthlyInvoiceDetails.fulfilled, (state, action) => {
        state.detailsLoading = false;
        state.details = action.payload;
      })
      .addCase(fetchMonthlyInvoiceDetails.rejected, (state, action) => {
        state.detailsLoading = false;
        state.detailsError = action.payload;
      })

      .addCase(downloadMonthlyInvoicePDF.pending, (state) => {
        state.pdfLoading = true;
      })
      .addCase(downloadMonthlyInvoicePDF.fulfilled, (state) => {
        state.pdfLoading = false;
      })
      .addCase(downloadMonthlyInvoicePDF.rejected, (state) => {
        state.pdfLoading = false;
      });
  },
});

export const { clearMonthlyInvoiceDetails } = monthlyInvoiceSlice.actions;
export default monthlyInvoiceSlice.reducer;
