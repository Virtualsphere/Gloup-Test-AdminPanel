
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllRefunds
export const getAllRefundsList = createAsyncThunk(
  "allRefunds/getAllRefundsList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getrefundrequets", {},{
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
        "Failed to fetch allRefunds";
      return rejectWithValue(message);
    }
  }
);

// update Refund request
export const updateRefundRequest = createAsyncThunk(
  "allRefunds/updaterefundrequest",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/updaterefundrequest", { id, status }, {
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
        "Failed to update refund request";
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  loading: false,
  error: null,
  success: false,
  allRefundsList: [],
};

const allRefundsSlice = createSlice({
  name: "allRefunds",
  initialState,
  reducers: {
    resetAllRefundsState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allRefundsList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allRefundslist
      .addCase(getAllRefundsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllRefundsList.fulfilled, (state, action) => {
        state.loading = false;
        state.allRefundsList = action.payload;
      })
      .addCase(getAllRefundsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allRefunds";
      })
      // update Refund Request
      .addCase(updateRefundRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRefundRequest.fulfilled, (state) => {
        state.loading = false;
        
        
      })
      .addCase(updateRefundRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update refund request";
      });

                    
  },
});

export const { resetAllRefundsState } = allRefundsSlice.actions;
export default allRefundsSlice.reducer;
