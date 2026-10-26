
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const getAllDeleteReviewRequest = createAsyncThunk(
  "allReview/getAllDeleteReviewRequest",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getreviewrequest",
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      const payload = response.data?.data;
      return Array.isArray(payload) ? payload : [];
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch review delete requests";
      return rejectWithValue(message);
    }
  }
);

export const getAllSalonReviews = createAsyncThunk(
  "allReview/getAllSalonReviews",
  async ({ status = "all", store_id } = {}, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getallreviews",
        { status, store_id },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      const payload = response.data?.data ?? {};
      return {
        reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
        salonSummaries: Array.isArray(payload.salonSummaries)
          ? payload.salonSummaries
          : [],
      };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch salon reviews";
      return rejectWithValue(message);
    }
  }
);

export const updateReviewRequest = createAsyncThunk(
  "allReview/updatereviewrequest",
  async ({ id, review_id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updatereviewrequest",
        { id, review_id, status },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return response.data?.data ?? response.data?.message ?? "Updated";
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to update review request";
      return rejectWithValue(message);
    }
  }
);

// ---- Reviews V2 (ReviewsRatingsV2 page) ----

const errorMessage = (error, fallback) =>
  error.response?.data?.error?.message || error.message || fallback;

const postV2 = (url, body) =>
  api.post(url, body, {
    headers: { "Content-Type": "application/json" },
    withCredentials: false,
  });

// One page of reviews. `params`: page, limit, search, store_id, rating,
// status (active|reported|hidden), response (responded|pending),
// customer_tag (new|repeat|vip), from / to (YYYY-MM-DD), sort.
export const getReviewsListV2 = createAsyncThunk(
  "allReview/getReviewsListV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/getReviewsListV2", params);
      const payload = response.data?.data ?? {};
      return {
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        total: Number(payload.total) || 0,
      };
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to fetch reviews"));
    }
  }
);

// Same query as getReviewsListV2 but nothing is stored - used for CSV export.
export const exportReviewsV2 = createAsyncThunk(
  "allReview/exportReviewsV2",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/getReviewsListV2", {
        ...params,
        page: 1,
        limit: 10000,
      });
      const rows = response.data?.data?.rows;
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to export reviews"));
    }
  }
);

// KPIs per named range ({ key, from, to }), top salons for `focus`, queue
// sizes and the salons that have reviews.
export const getReviewsSummaryV2 = createAsyncThunk(
  "allReview/getReviewsSummaryV2",
  async ({ ranges, focus }, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/getReviewsSummaryV2", { ranges, focus });
      return response.data?.data ?? null;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to fetch reviews summary"));
    }
  }
);

// Hide (inactive) / restore (active) one or many reviews.
export const updateReviewStatusV2 = createAsyncThunk(
  "allReview/updateReviewStatusV2",
  async ({ review_ids, status }, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/updateReviewStatusV2", { review_ids, status });
      return response.data?.data ?? null;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to update reviews"));
    }
  }
);

export const replyReviewV2 = createAsyncThunk(
  "allReview/replyReviewV2",
  async ({ review_id, reply }, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/replyReviewV2", { review_id, reply });
      return response.data?.data ?? null;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to save reply"));
    }
  }
);

export const deleteReviewReplyV2 = createAsyncThunk(
  "allReview/deleteReviewReplyV2",
  async ({ review_id }, { rejectWithValue }) => {
    try {
      const response = await postV2("/admin/app/deleteReviewReplyV2", { review_id });
      return response.data?.data ?? null;
    } catch (error) {
      return rejectWithValue(errorMessage(error, "Failed to delete reply"));
    }
  }
);

const initialState = {
  fetchLoading: false,
  updateLoading: false,
  salonReviewsLoading: false,
  error: null,
  salonReviewsError: null,
  success: false,
  allDeleteReviewRequest: [],
  salonReviews: [],
  salonSummaries: [],
  // V2
  listV2: { rows: [], total: 0 },
  listV2Loading: false,
  listV2Error: null,
  summaryV2: null,
  summaryV2Loading: false,
  summaryV2Error: null,
  actionV2Loading: false,
};

const allReviewSlice = createSlice({
  name: "AllReview",
  initialState,
  reducers: {
    resetAllReviewState(state) {
      state.fetchLoading = false;
      state.updateLoading = false;
      state.salonReviewsLoading = false;
      state.error = null;
      state.salonReviewsError = null;
      state.success = false;
      state.allDeleteReviewRequest = [];
      state.salonReviews = [];
      state.salonSummaries = [];
      state.listV2 = { rows: [], total: 0 };
      state.listV2Loading = false;
      state.listV2Error = null;
      state.summaryV2 = null;
      state.summaryV2Loading = false;
      state.summaryV2Error = null;
      state.actionV2Loading = false;
    },
    clearReviewError(state) {
      state.error = null;
      state.salonReviewsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllDeleteReviewRequest.pending, (state) => {
        state.fetchLoading = true;
        state.error = null;
      })
      .addCase(getAllDeleteReviewRequest.fulfilled, (state, action) => {
        state.fetchLoading = false;
        state.allDeleteReviewRequest = action.payload;
      })
      .addCase(getAllDeleteReviewRequest.rejected, (state, action) => {
        state.fetchLoading = false;
        state.error =
          action.payload || "Failed to fetch review delete requests";
      })
      .addCase(updateReviewRequest.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(updateReviewRequest.fulfilled, (state) => {
        state.updateLoading = false;
        state.success = true;
      })
      .addCase(updateReviewRequest.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload || "Failed to update review request";
      })
      .addCase(getAllSalonReviews.pending, (state) => {
        state.salonReviewsLoading = true;
        state.salonReviewsError = null;
      })
      .addCase(getAllSalonReviews.fulfilled, (state, action) => {
        state.salonReviewsLoading = false;
        state.salonReviews = action.payload.reviews;
        state.salonSummaries = action.payload.salonSummaries;
      })
      .addCase(getAllSalonReviews.rejected, (state, action) => {
        state.salonReviewsLoading = false;
        state.salonReviewsError =
          action.payload || "Failed to fetch salon reviews";
      })
      .addCase(getReviewsListV2.pending, (state) => {
        state.listV2Loading = true;
        state.listV2Error = null;
      })
      .addCase(getReviewsListV2.fulfilled, (state, action) => {
        state.listV2Loading = false;
        state.listV2 = action.payload;
      })
      .addCase(getReviewsListV2.rejected, (state, action) => {
        state.listV2Loading = false;
        state.listV2Error = action.payload || "Failed to fetch reviews";
      })
      .addCase(getReviewsSummaryV2.pending, (state) => {
        state.summaryV2Loading = true;
        state.summaryV2Error = null;
      })
      .addCase(getReviewsSummaryV2.fulfilled, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2 = action.payload;
      })
      .addCase(getReviewsSummaryV2.rejected, (state, action) => {
        state.summaryV2Loading = false;
        state.summaryV2Error = action.payload || "Failed to fetch reviews summary";
      });

    // Hide / restore / reply / delete reply share one busy flag.
    for (const thunk of [updateReviewStatusV2, replyReviewV2, deleteReviewReplyV2]) {
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

export const { resetAllReviewState, clearReviewError } = allReviewSlice.actions;
export default allReviewSlice.reducer;
