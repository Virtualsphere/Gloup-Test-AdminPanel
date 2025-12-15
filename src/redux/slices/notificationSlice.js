
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllNotification
export const getAllNotificationList = createAsyncThunk(
  "allNotification/getAllNotificationList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getalnotification", {},{
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
        "Failed to fetch allNotification";
      return rejectWithValue(message);
    }
  }
);

// add notification
export const addNotification = createAsyncThunk(
  "allNotification/addNotification",
  async (notificationData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/addnotification", notificationData, {
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
        "Failed to add notification";
      return rejectWithValue(message);
    }
  }
);



const initialState = {
  loading: false,
  error: null,
  success: false,
  allNotificationList: [],
};

const allNotificationSlice = createSlice({
  name: "allNotification",
  initialState,
  reducers: {
    resetAllNotificationState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allNotificationList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allNotification list
      .addCase(getAllNotificationList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllNotificationList.fulfilled, (state, action) => {
        state.loading = false;
        state.allNotificationList = action.payload;
      })
      .addCase(getAllNotificationList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allNotification";
      })

      // add notification
      .addCase(addNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNotification.fulfilled, (state) => {
        state.loading = false;
        //state.allNotificationList = action.payload;
        
      })
      .addCase(addNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add notification";
      });
 
          
  },
});

export const { resetAllNotificationState } = allNotificationSlice.actions;
export default allNotificationSlice.reducer;
