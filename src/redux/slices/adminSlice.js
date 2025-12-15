import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// Add admin
export const addAdmin = createAsyncThunk(
  "admin/addAdmin",
  async (adminData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/school/addAdmin", adminData, {
        // headers: { "Content-Type": "application/json" },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response.data.error.message ||
        error.message ||
        "Add admin failed";
      return rejectWithValue(message);
    }
  }
);

// get admin
export const getAdmin = createAsyncThunk(
  "admin/getAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/school/listAdmin", {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch admin";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  adminData: null,
  adminList: [],
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    resetAdminState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.adminList = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Add admin
      .addCase(addAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(addAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.adminData = action.payload;
        state.success = true;
      })
      .addCase(addAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Add admin failed";
        state.success = false;
      })
      // Get admin list
      .addCase(getAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.adminList = action.payload;
      })
      .addCase(getAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch admin";
      });
  },
});

export const { resetAdminState } = adminSlice.actions;
export default adminSlice.reducer;
