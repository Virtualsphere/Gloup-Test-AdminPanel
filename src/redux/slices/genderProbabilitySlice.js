import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const getGenderProbabilityUsers = createAsyncThunk(
  "genderProbability/getGenderProbabilityUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getgenderprobabilityusers",
        {},
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch gender probability list";
      return rejectWithValue(message);
    }
  }
);

export const setUserGender = createAsyncThunk(
  "genderProbability/setUserGender",
  async ({ id, gender }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updateusergender",
        { id, gender },
        { withCredentials: false }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to update user gender";
      return rejectWithValue(message);
    }
  }
);

const genderProbabilitySlice = createSlice({
  name: "genderProbability",
  initialState: {
    users: [],
    loading: false,
    error: null,
  },
  reducers: {
    removeUserFromList(state, action) {
      state.users = state.users.filter((u) => u.user_id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getGenderProbabilityUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getGenderProbabilityUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload || [];
      })
      .addCase(getGenderProbabilityUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch gender probability list";
      });
  },
});

export const { removeUserFromList } = genderProbabilitySlice.actions;
export default genderProbabilitySlice.reducer;
