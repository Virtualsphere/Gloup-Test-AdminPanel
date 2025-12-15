import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api"; // axios instance


export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/auth/login", credentials, {
        headers: {
          "Content-Type": "application/json",
        },
        // Remove withCredentials if the server does not use cookies
        withCredentials: false,
      });
      // Store token directly to localStorage here
      if (response.data.data.token) {
        localStorage.setItem("token", response.data.data.token);
        }
      return true; // just return success flag, no token in state
    } catch (error) {
      const message =
        error.response?.data?.error?.message || error.message || "Login failed";
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    error: null,
    isAuthenticated: localStorage.getItem("token"), // derive auth from localStorage
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = localStorage.getItem("token"); // logged in now
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
