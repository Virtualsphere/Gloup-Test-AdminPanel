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
