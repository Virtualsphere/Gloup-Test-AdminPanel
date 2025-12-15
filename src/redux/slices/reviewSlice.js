
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllDeleteReviewRequest
export const getAllDeleteReviewRequest = createAsyncThunk(
  "allReview/getAllDeleteReviewRequest",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getreviewrequest", {},{
        headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch allDeleteReviewRequest";
      return rejectWithValue(message);
    }
  }
);

// update review request
export const updateReviewRequest = createAsyncThunk(
  "allReview/updatereviewrequest",
  async ({ id,review_id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/updatereviewrequest", { id, review_id,status }, {
        headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      return response.data.data;
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
  loading: false,
  error: null,
  success: false,
  allDeleteReviewRequest: [],
};

const allReviewSlice = createSlice({
  name: "AllReview",
  initialState,
  reducers: {
    resetAllReviewState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allDeleteReviewRequest = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get AllDeleteReviewRequest
      .addCase(getAllDeleteReviewRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllDeleteReviewRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.allDeleteReviewRequest = action.payload;
      })
      .addCase(getAllDeleteReviewRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch AllDeleteReviewRequest";
      })

      // update review request
      .addCase(updateReviewRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReviewRequest.fulfilled, (state) => {
        state.loading = false;
       
        
      })
      .addCase(updateReviewRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update review request";
      });
 
          
  },
});

export const {  resetAllReviewState } = allReviewSlice.actions;
export default allReviewSlice.reducer;
