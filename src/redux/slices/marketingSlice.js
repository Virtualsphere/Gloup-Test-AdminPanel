import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Send marketing WhatsApp broadcast
export const sendMarketingWhatsapp = createAsyncThunk(
  "marketing/sendMarketingWhatsapp",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/sendmarketingwhatsapp",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to send marketing broadcast";
      return rejectWithValue(message);
    }
  }
);

// Send video marketing WhatsApp broadcast
export const sendVideoMarketingWhatsapp = createAsyncThunk(
  "marketing/sendVideoMarketingWhatsapp",
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/sendvideomarketingwhatsapp",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to send video marketing broadcast";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  result: null,

  videoLoading: false,
  videoError: null,
  videoSuccess: false,
  videoResult: null,
};

const marketingSlice = createSlice({
  name: "marketing",
  initialState,
  reducers: {
    resetMarketingState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.result = null;
    },
    resetVideoMarketingState(state) {
      state.videoLoading = false;
      state.videoError = null;
      state.videoSuccess = false;
      state.videoResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMarketingWhatsapp.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(sendMarketingWhatsapp.fulfilled, (state, action) => {
        state.loading = false;
        state.result = action.payload;
        state.success = true;
      })
      .addCase(sendMarketingWhatsapp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send marketing broadcast";
        state.success = false;
      })

      .addCase(sendVideoMarketingWhatsapp.pending, (state) => {
        state.videoLoading = true;
        state.videoError = null;
        state.videoSuccess = false;
      })
      .addCase(sendVideoMarketingWhatsapp.fulfilled, (state, action) => {
        state.videoLoading = false;
        state.videoResult = action.payload;
        state.videoSuccess = true;
      })
      .addCase(sendVideoMarketingWhatsapp.rejected, (state, action) => {
        state.videoLoading = false;
        state.videoError = action.payload || "Failed to send video marketing broadcast";
        state.videoSuccess = false;
      });
  },
});

export const { resetMarketingState, resetVideoMarketingState } = marketingSlice.actions;
export default marketingSlice.reducer;