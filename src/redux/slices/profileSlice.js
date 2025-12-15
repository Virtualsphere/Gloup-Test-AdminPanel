import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";
// Add profile
// export const addProfile = createAsyncThunk(
//   "profile/addProfile",
//   async (profileData, { rejectWithValue }) => {
//     try {
//       const response = await api.post("/profile/school/addProfile", profileData, {
//         // headers: { "Content-Type": "application/json" },
//         withCredentials: false,
//       });
//       return response.data.data;
//     } catch (error) {
//       const message =
//         error.response.data.error.message ||
//         error.message ||
//         "Add profile failed";
//       return rejectWithValue(message);
//     }
//   }
// );
// get profile
export const getProfile = createAsyncThunk(
  "profile/getProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/app/profile", {
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
        "Failed to fetch profile";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  profileData: null,
  profileList: [],
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    resetProfileState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.profileList = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Add profile
    //   .addCase(addProfile.pending, (state) => {
    //     state.loading = true;
    //     state.error = null;
    //     state.success = false;
    //   })
    //   .addCase(addProfile.fulfilled, (state, action) => {
    //     state.loading = false;
    //     state.profileData = action.payload;
    //     state.success = true;
    //   })
    //   .addCase(addProfile.rejected, (state, action) => {
    //     state.loading = false;
    //     state.error = action.payload || "Add profile failed";
    //     state.success = false;
    //   })
      // Get profile list
      .addCase(getProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profileList = action.payload;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch profile";
      });
  },
});

export const { resetProfileState } = profileSlice.actions;
export default profileSlice.reducer;
