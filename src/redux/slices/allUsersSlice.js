import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllUsers
export const getAllUsersList = createAsyncThunk(
  "allUsers/getAllUsersList",
  async (params = {}, { rejectWithValue }) => {
    try {
      const body = {};
      if (params?.min_bookings != null && params.min_bookings !== "") {
        body.min_bookings = params.min_bookings;
      }
      const response = await api.post("/admin/app/getallusers", body,{
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

// ---- Users V2 (UsersV2 / UserDetailsV2) ------------------------------------

const postAdmin = async (path, body, fallback, rejectWithValue) => {
  try {
    const response = await api.post(`/admin/app/${path}`, body, {
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
      fallback;
    return rejectWithValue(message);
  }
};

// Paginated users with SQL filters: { page, limit, search, status, gender,
// city, source, login_method, loyalty, booked, joined_from, joined_to, sort }
export const getUsersListV2 = createAsyncThunk(
  "allUsers/getUsersListV2",
  (params = {}, { rejectWithValue }) =>
    postAdmin("getUsersListV2", params, "Failed to fetch users", rejectWithValue)
);

// Same list, returned to the caller only (CSV export) so the table isn't replaced.
export const fetchUsersListV2 = createAsyncThunk(
  "allUsers/fetchUsersListV2",
  (params = {}, { rejectWithValue }) =>
    postAdmin("getUsersListV2", params, "Failed to fetch users", rejectWithValue)
);

// KPIs, growth, top cities, latest activity for the users page.
export const getUsersSummaryV2 = createAsyncThunk(
  "allUsers/getUsersSummaryV2",
  (_, { rejectWithValue }) =>
    postAdmin("getUsersSummaryV2", {}, "Failed to fetch users summary", rejectWithValue)
);

// Profile for any status + bookings with real status and amounts paid: { id }
export const getUserProfileV2 = createAsyncThunk(
  "allUsers/getUserProfileV2",
  (id, { rejectWithValue }) =>
    postAdmin("getUserProfileV2", { id }, "Failed to fetch user profile", rejectWithValue)
);

// Timeline + push history for one user (not stored): { id, limit }
export const fetchUserActivityV2 = createAsyncThunk(
  "allUsers/fetchUserActivityV2",
  (params, { rejectWithValue }) =>
    postAdmin("getUserActivityV2", params, "Failed to fetch user activity", rejectWithValue)
);

// Coupons redeemed + wallet transactions for one user (not stored): { id }
export const fetchUserOffersV2 = createAsyncThunk(
  "allUsers/fetchUserOffersV2",
  (id, { rejectWithValue }) =>
    postAdmin("getUserOffersV2", { id }, "Failed to fetch user offers", rejectWithValue)
);

// Push notification to one user via the existing targeted-notification API.
export const sendUserNotification = createAsyncThunk(
  "allUsers/sendUserNotification",
  ({ id, title, description }, { rejectWithValue }) =>
    postAdmin(
      "send-targeted-notification",
      { recipient_type: "user", recipient_id: id, title, description },
      "Failed to send notification",
      rejectWithValue
    )
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  userDetail:{},
  allUsersList: [], // To store the list of allUserss
  usersV2: [],
  usersV2Total: 0,
  usersV2Loading: false,
  usersV2Error: null,
  usersSummaryV2: null,
  userProfileV2: null,
  userProfileV2Loading: false,
  userProfileV2Error: null,
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

      // Users V2 list
      .addCase(getUsersListV2.pending, (state) => {
        state.usersV2Loading = true;
        state.usersV2Error = null;
      })
      .addCase(getUsersListV2.fulfilled, (state, action) => {
        state.usersV2Loading = false;
        state.usersV2 = action.payload?.rows || [];
        state.usersV2Total = action.payload?.total || 0;
      })
      .addCase(getUsersListV2.rejected, (state, action) => {
        state.usersV2Loading = false;
        state.usersV2Error = action.payload || "Failed to fetch users";
      })
      .addCase(getUsersSummaryV2.fulfilled, (state, action) => {
        state.usersSummaryV2 = action.payload || null;
      })

      // User profile V2
      .addCase(getUserProfileV2.pending, (state) => {
        state.userProfileV2Loading = true;
        state.userProfileV2Error = null;
      })
      .addCase(getUserProfileV2.fulfilled, (state, action) => {
        state.userProfileV2Loading = false;
        state.userProfileV2 = action.payload || null;
      })
      .addCase(getUserProfileV2.rejected, (state, action) => {
        state.userProfileV2Loading = false;
        state.userProfileV2Error = action.payload || "Failed to fetch user profile";
      })

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
