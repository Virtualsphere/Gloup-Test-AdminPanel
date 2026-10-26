import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Partners with at least one appointment booking_date = today (IST), plus totals.
export const fetchInvoicePartners = createAsyncThunk(
  "invoice/fetchInvoicePartners",
  async (params = {}, { rejectWithValue }) => {
    try {
      const body = {};
      if (params?.date) body.date = params.date;
      if (params?.status) body.status = params.status;
      const response = await api.post(
        "/admin/app/getinvoicepartnerstoday",
        body,
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

// Line-item booking breakdown for one partner on the invoice day (booking_date).
export const fetchInvoiceDetails = createAsyncThunk(
  "invoice/fetchInvoiceDetails",
  async ({ partnerId, date }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getinvoicedetails",
        {
          partner_id: partnerId,
          ...(date ? { date } : {}),
        },
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
  async ({ partnerId, date }, { rejectWithValue }) => {
    try {
      const res = await api.post(
        `/admin/app/downloadinvoicepdf/${partnerId}`,
        date ? { date } : {},
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

export const markInvoicePayout = createAsyncThunk(
  "invoice/markInvoicePayout",
  async ({ partnerId, date }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/markinvoicepayout",
        {
          partner_id: partnerId,
          ...(date ? { date } : {}),
        },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to mark invoice as paid"
      );
    }
  }
);

export const undoInvoicePayout = createAsyncThunk(
  "invoice/undoInvoicePayout",
  async ({ partnerId, date }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/undoinvoicepayout",
        {
          partner_id: partnerId,
          ...(date ? { date } : {}),
        },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to undo invoice payout"
      );
    }
  }
);

// ---- V2 (InvoicePayoutsV2 page) ----

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

// Invoice KPIs per named range ({ key, from, to }), unpaid / overdue totals,
// per-frequency buckets, all-time paid out.
export const fetchInvoicePayoutsSummaryV2 = createAsyncThunk(
  "invoice/fetchInvoicePayoutsSummaryV2",
  async ({ ranges }, { rejectWithValue }) =>
    postV2("/admin/app/getInvoicePayoutsSummaryV2", { ranges }, "Failed to fetch invoices summary", rejectWithValue)
);

// The main payout-partners table. `params`: page, limit, search, frequency,
// status (scheduled|due|overdue|paid), from / to, sort.
export const fetchPayoutPartnersV2 = createAsyncThunk(
  "invoice/fetchPayoutPartnersV2",
  async (params = {}, { rejectWithValue }) =>
    postV2("/admin/app/getInvoicePayoutPartnersV2", params, "Failed to fetch payout partners", rejectWithValue)
);

// Same query, returned to the caller and not stored - side panels, export.
export const queryPayoutPartnersV2 = createAsyncThunk(
  "invoice/queryPayoutPartnersV2",
  async (params = {}, { rejectWithValue }) =>
    postV2("/admin/app/getInvoicePayoutPartnersV2", params, "Failed to fetch payout partners", rejectWithValue)
);

// One salon's invoice days with payout status - not stored.
export const fetchPartnerInvoiceDaysV2 = createAsyncThunk(
  "invoice/fetchPartnerInvoiceDaysV2",
  async ({ storeId, from, to }, { rejectWithValue }) =>
    postV2(
      "/admin/app/getPartnerInvoiceDaysV2",
      { store_id: storeId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      "Failed to fetch partner invoices",
      rejectWithValue
    )
);

export const setPartnerPayoutFrequencyV2 = createAsyncThunk(
  "invoice/setPartnerPayoutFrequencyV2",
  async ({ storeIds, frequency }, { rejectWithValue }) =>
    postV2(
      "/admin/app/setPartnerPayoutFrequencyV2",
      { store_ids: storeIds, frequency },
      "Failed to update payout frequency",
      rejectWithValue
    )
);

// Marks a salon's due invoice days paid, oldest first (markinvoicepayout per day).
export const payPartnerInvoicesV2 = createAsyncThunk(
  "invoice/payPartnerInvoicesV2",
  async ({ storeId, onlyDue = true }, { rejectWithValue }) =>
    postV2(
      "/admin/app/payPartnerInvoicesV2",
      { store_id: storeId, only_due: onlyDue },
      "Failed to pay partner invoices",
      rejectWithValue
    )
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

    payoutLoading: false,

    // V2
    summaryV2: null,
    summaryV2Loading: false,
    summaryV2Error: null,
    partnersV2: { rows: [], total: 0 },
    partnersV2Loading: false,
    partnersV2Error: null,
    actionV2Loading: false,
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
      })

      .addCase(markInvoicePayout.pending, (state) => {
        state.payoutLoading = true;
      })
      .addCase(markInvoicePayout.fulfilled, (state, action) => {
        state.payoutLoading = false;
        state.details = action.payload;
      })
      .addCase(markInvoicePayout.rejected, (state) => {
        state.payoutLoading = false;
      })

      .addCase(undoInvoicePayout.pending, (state) => {
        state.payoutLoading = true;
      })
      .addCase(undoInvoicePayout.fulfilled, (state, action) => {
        state.payoutLoading = false;
        state.details = action.payload;
      })
      .addCase(undoInvoicePayout.rejected, (state) => {
        state.payoutLoading = false;
      })

      .addCase(fetchInvoicePayoutsSummaryV2.pending, (state) => {
        state.summaryV2Loading = true;
        state.summaryV2Error = null;
      })
      .addCase(fetchInvoicePayoutsSummaryV2.fulfilled, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2 = action.payload;
      })
      .addCase(fetchInvoicePayoutsSummaryV2.rejected, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2Error = action.payload;
      })

      .addCase(fetchPayoutPartnersV2.pending, (state) => {
        state.partnersV2Loading = true;
        state.partnersV2Error = null;
      })
      .addCase(fetchPayoutPartnersV2.fulfilled, (state, action) => {
        state.partnersV2Loading = false;
        state.partnersV2 = {
          rows: Array.isArray(action.payload?.rows) ? action.payload.rows : [],
          total: Number(action.payload?.total) || 0,
          trackingStart: action.payload?.tracking_start || null,
        };
      })
      .addCase(fetchPayoutPartnersV2.rejected, (state, action) => {
        state.partnersV2Loading = false;
        state.partnersV2Error = action.payload;
      });

    // Frequency change and pay-now share one busy flag.
    for (const thunk of [setPartnerPayoutFrequencyV2, payPartnerInvoicesV2]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.actionV2Loading = true;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.actionV2Loading = false;
        })
        .addCase(thunk.rejected, (state) => {
          state.actionV2Loading = false;
        });
    }
  },
});

export const { clearInvoiceDetails } = invoiceSlice.actions;
export default invoiceSlice.reducer;
