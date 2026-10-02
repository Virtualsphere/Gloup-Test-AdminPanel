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

// ---- V2 (MonthlyReportV2 page) ----

const v2Error = (error, fallback) =>
  error.response?.data?.error?.message || error.message || fallback;

const postV2 = async (url, body, fallback, rejectWithValue) => {
  try {
    const response = await api.post(url, body, { withCredentials: false });
    return response.data.data ?? null;
  } catch (error) {
    return rejectWithValue(v2Error(error, fallback));
  }
};

// The month's totals next to the previous month's, plus the platform fee
// used and the cities with bookings.
export const fetchMonthlyReportSummaryV2 = createAsyncThunk(
  "monthlyInvoice/fetchMonthlyReportSummaryV2",
  async ({ month }, { rejectWithValue }) =>
    postV2("/admin/app/getMonthlyReportSummaryV2", { month }, "Failed to fetch monthly summary", rejectWithValue)
);

// One page of salons. `params`: month, page, limit, search, city, sort.
export const fetchMonthlyReportSalonsV2 = createAsyncThunk(
  "monthlyInvoice/fetchMonthlyReportSalonsV2",
  async (params, { rejectWithValue }) =>
    postV2("/admin/app/getMonthlyReportSalonsV2", params, "Failed to fetch monthly report", rejectWithValue)
);

// Same query, every row, not stored - downloads.
export const queryMonthlyReportSalonsV2 = createAsyncThunk(
  "monthlyInvoice/queryMonthlyReportSalonsV2",
  async (params, { rejectWithValue }) =>
    postV2("/admin/app/getMonthlyReportSalonsV2", params, "Failed to fetch monthly report", rejectWithValue)
);

// Per-booking platform fee (admin setting) the report multiplies by bookings.
export const fetchPlatformFee = createAsyncThunk(
  "monthlyInvoice/fetchPlatformFee",
  async (_, { rejectWithValue }) => {
    const data = await postV2("/admin/app/getplatformfee", {}, "Failed to fetch platform fee", rejectWithValue);
    return data?.platform_fee ?? data;
  }
);

export const updatePlatformFee = createAsyncThunk(
  "monthlyInvoice/updatePlatformFee",
  async ({ fee }, { rejectWithValue }) => {
    const data = await postV2(
      "/admin/app/updateplatformfee",
      { platform_fee: fee },
      "Failed to update platform fee",
      rejectWithValue
    );
    return data?.platform_fee ?? data;
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

    // V2
    summaryV2: null,
    summaryV2Loading: false,
    summaryV2Error: null,
    salonsV2: { rows: [], total: 0 },
    salonsV2Loading: false,
    salonsV2Error: null,
    platformFee: null,
    platformFeeSaving: false,
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
      })

      .addCase(fetchMonthlyReportSummaryV2.pending, (state) => {
        state.summaryV2Loading = true;
        state.summaryV2Error = null;
      })
      .addCase(fetchMonthlyReportSummaryV2.fulfilled, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2 = action.payload;
      })
      .addCase(fetchMonthlyReportSummaryV2.rejected, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2Error = action.payload;
      })

      .addCase(fetchMonthlyReportSalonsV2.pending, (state) => {
        state.salonsV2Loading = true;
        state.salonsV2Error = null;
      })
      .addCase(fetchMonthlyReportSalonsV2.fulfilled, (state, action) => {
        state.salonsV2Loading = false;
        state.salonsV2 = {
          rows: Array.isArray(action.payload?.rows) ? action.payload.rows : [],
          total: Number(action.payload?.total) || 0,
        };
      })
      .addCase(fetchMonthlyReportSalonsV2.rejected, (state, action) => {
        state.salonsV2Loading = false;
        state.salonsV2Error = action.payload;
      })

      .addCase(fetchPlatformFee.fulfilled, (state, action) => {
        state.platformFee = action.payload;
      })
      .addCase(updatePlatformFee.pending, (state) => {
        state.platformFeeSaving = true;
      })
      .addCase(updatePlatformFee.fulfilled, (state, action) => {
        state.platformFeeSaving = false;
        state.platformFee = action.payload;
      })
      .addCase(updatePlatformFee.rejected, (state) => {
        state.platformFeeSaving = false;
      });
  },
});

export const { clearMonthlyInvoiceDetails } = monthlyInvoiceSlice.actions;
export default monthlyInvoiceSlice.reducer;
