import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

/* ============================
   🔹 LIST BOOKINGS
============================ */
export const getbDetail = createAsyncThunk(
  "allBookings/getBookingsDetail",
  async (
    { fromDate = "", toDate = "", page = 1, limit = 10, status = "" } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/admin/app/getBookingsDetails", {
        fromDate,
        toDate,
        page,
        limit,
        status,
      },
      {
          headers: {
            "Content-Type": "application/json", // optional in GET, but included here per request
          },
          withCredentials: false,
        });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings"
      );
    }
  }
);

/* ============================
   🔹 LIST BOOKINGS BY ORDER DATE (appointment/booking_date)
============================ */
export const getbDetailByOrderDate = createAsyncThunk(
  "allBookings/getBookingsDetailByOrderDate",
  async (
    { fromDate = "", toDate = "", page = 1, limit = 10, status = "" } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post("/admin/app/getBookingsDetailsByOrderDate", {
        fromDate,
        toDate,
        page,
        limit,
        status,
      },
      {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings"
      );
    }
  }
);

/* ============================
   🔹 BOOKINGS BY ORDER DATE (not stored)
   Same endpoint as getbDetailByOrderDate, but the result is only returned
   to the caller - used for counts (limit: 1, read `total`) and CSV export,
   which must not overwrite the list the table is showing.
============================ */
export const fetchBookingsByOrderDate = createAsyncThunk(
  "allBookings/fetchBookingsByOrderDate",
  async (
    { fromDate = "", toDate = "", page = 1, limit = 1, status = "" } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(
        "/admin/app/getBookingsDetailsByOrderDate",
        { fromDate, toDate, page, limit, status },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return {
        rows: response.data?.data?.data || [],
        total: Number(response.data?.data?.total) || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings"
      );
    }
  }
);

/* ============================
   🔹 BOOKINGS LIST V2
   /getBookingsListV2 - the V2 bookings page's list: adds phone, salon city,
   slot time, services + categories, and SQL-side search / payment /
   service-category filters. Body: { fromDate, toDate, page, limit, status,
   payment, search, service_category_id, date_basis }.
============================ */
const postBookingsListV2 = async (params) => {
  const response = await api.post("/admin/app/getBookingsListV2", params, {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  });
  return response.data.data;
};

export const getBookingsListV2 = createAsyncThunk(
  "allBookings/getBookingsListV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await postBookingsListV2(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings"
      );
    }
  }
);

// Same list, returned to the caller only (CSV export) so the table isn't replaced.
export const fetchBookingsListV2 = createAsyncThunk(
  "allBookings/fetchBookingsListV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      return await postBookingsListV2(params);
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings"
      );
    }
  }
);

/* ============================
   🔹 TOP SALONS BY DATE RANGE (not stored)
   Salons ranked by revenue for { fromDate, toDate, limit, date_basis }.
============================ */
export const fetchTopSalonsByDateRange = createAsyncThunk(
  "allBookings/fetchTopSalonsByDateRange",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getTopSalonsByDateRange", params, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: false,
      });
      return response.data.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch top salons"
      );
    }
  }
);

/* ============================
   🔹 BOOKINGS SUMMARY V2 (not stored)
   /getBookingsSummaryV2 { fromDate, toDate, date_basis } -> revenue (invoice
   rule), invoiced_bookings, avg_order_value, today {...}, booking_hours[24].
============================ */
export const fetchBookingsSummaryV2 = createAsyncThunk(
  "allBookings/fetchBookingsSummaryV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getBookingsSummaryV2", params, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch bookings summary"
      );
    }
  }
);

/* ============================
   🔹 VIEW BOOKING BY ID
============================ */
export const getBookingById = createAsyncThunk(
  "allBookings/getBookingById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post("/admin/app/getBookingsDetailsById", {id : id}, {
         headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      console.log("Booking by ID response:", res);
      return res.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
          error.message ||
          "Failed to fetch booking"
      );
    }
  }
);

export const bookingpdfDownload = createAsyncThunk(
  "allBookings/bookingpdfDownload",
  async (id, { rejectWithValue }) => {
    try {
       const res = await api.post(
        `/admin/app/downloadBookingPDF/${id}`,
        {},
        {
          responseType: "blob"
        }
      );

      console.log("PDF Download response:", res);

      return res.data;

    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to download PDF"
      );
    }
  }
);
export const updateBookingStatus = createAsyncThunk(
  "allBookings/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/admin/app/updateBookingStatus/`,
        { id, status },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return res.data;
    } catch (err) {
      return rejectWithValue("Status update failed");
    }
  }
);

export const refundBooking = createAsyncThunk(
  "allBookings/refund",
  async ({ id }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/admin/app/refundbookings`,
        {id},
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        });
      return res.data;
    } catch {
      return rejectWithValue("Refund failed");
    }
  }
);



/* ============================
   🔹 SLICE
============================ */
const initialState = {
  bookingsDetail: [],     // list
  total: 0,
  bookingView: null,      // single booking
  loading: false,
  error: null,
  pdfBlob: null,
  pdfLoading: false,
  pdfError: null,
  bookingsByOrderDate: [],   // list filtered by order/appointment date
  totalByOrderDate: 0,
  loadingByOrderDate: false,
  errorByOrderDate: null,
  bookingsV2: [],   // V2 bookings page list (getBookingsListV2)
  totalV2: 0,
  loadingV2: false,
  errorV2: null,
};

const bookingSlice = createSlice({
  name: "allBookings",
  initialState,
  reducers: {
    resetBookingDetail: (state) => {
      state.bookingsDetail = [];
      state.total = 0;
    },
    resetBookingView: (state) => {
      state.bookingView = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* ===== LIST V2 ===== */
      .addCase(getBookingsListV2.pending, (state) => {
        state.loadingV2 = true;
        state.errorV2 = null;
      })
      .addCase(getBookingsListV2.fulfilled, (state, action) => {
        state.loadingV2 = false;
        state.bookingsV2 = action.payload?.rows || [];
        state.totalV2 = action.payload?.total || 0;
      })
      .addCase(getBookingsListV2.rejected, (state, action) => {
        state.loadingV2 = false;
        state.errorV2 = action.payload;
      })

      /* ===== LIST ===== */
      .addCase(getbDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getbDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingsDetail = action.payload.data || [];
        state.total = action.payload.data.total || 0;
      })
      .addCase(getbDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== LIST BY ORDER DATE ===== */
      .addCase(getbDetailByOrderDate.pending, (state) => {
        state.loadingByOrderDate = true;
        state.errorByOrderDate = null;
      })
      .addCase(getbDetailByOrderDate.fulfilled, (state, action) => {
        state.loadingByOrderDate = false;
        state.bookingsByOrderDate = action.payload.data || [];
        state.totalByOrderDate = action.payload.data.total || 0;
      })
      .addCase(getbDetailByOrderDate.rejected, (state, action) => {
        state.loadingByOrderDate = false;
        state.errorByOrderDate = action.payload;
      })

      /* ===== VIEW ===== */
      .addCase(getBookingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBookingById.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingView = action.payload;
      })
      .addCase(getBookingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* ===== DOWNLOAD PDF ===== */
      .addCase(bookingpdfDownload.pending, (state) => {
      state.pdfLoading = true;
      })
      .addCase(bookingpdfDownload.fulfilled, (state, action) => {
        state.pdfLoading = false;
        state.pdfBlob = action.payload; // store Blob
      })
      .addCase(bookingpdfDownload.rejected, (state, action) => {
        state.pdfLoading = false;
        state.pdfError = action.payload;
      });
  },
});

export const {
  resetBookingDetail,
  resetBookingView,
} = bookingSlice.actions;

export default bookingSlice.reducer;
