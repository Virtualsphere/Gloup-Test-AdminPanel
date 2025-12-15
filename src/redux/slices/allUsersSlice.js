import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllUsers
export const getAllUsersList = createAsyncThunk(
  "allUsers/getAllUsersList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getallusers", {},{
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
        "Failed to fetch allUsers";
      return rejectWithValue(message);
    }
  }
);

// get user details
export const getUserDetail = createAsyncThunk(
  "allUsers/getUserDetail",
    async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getalluserdeatils", id,{
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
        "Failed to fetch UserDetail";
      return rejectWithValue(message);
    }
  }
);

// update User Status
export const updateUserStatus = createAsyncThunk(
  "allUsers/updateUserStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/updateuser", { id, status }, {
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
        "Failed to update User Status";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  userDetail:{},
  allUsersList: [], // To store the list of allUserss
};

const allUsersSlice = createSlice({
  name: "allUsers",
  initialState,
  reducers: {
    resetAllUsersState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allUsersList = [];
      state.userDetail={};
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allUsers list
      .addCase(getAllUsersList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllUsersList.fulfilled, (state, action) => {
        state.loading = false;
        state.allUsersList = action.payload;
      })
      .addCase(getAllUsersList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allUsers";
      })

      // Get UserDetail
      .addCase(getUserDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.userDetail = action.payload;
      })
      .addCase(getUserDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch UserDetail";
      })
      // Update User Status
      .addCase(updateUserStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update User Status";
      });
  },
});

export const { resetAllUsersState } = allUsersSlice.actions;
export default allUsersSlice.reducer;
