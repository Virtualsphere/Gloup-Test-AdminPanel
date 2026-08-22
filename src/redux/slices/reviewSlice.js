
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
      });
  },
});

export const { resetAllReviewState, clearReviewError } = allReviewSlice.actions;
export default allReviewSlice.reducer;
