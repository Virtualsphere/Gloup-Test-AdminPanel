import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

const holidayError = (error, fallback) =>
  error.response?.data?.error?.message ||
  error.response?.data?.message ||
  error.message ||
  fallback;

export const listStoreHolidays = createAsyncThunk(
  "holidays/listStoreHolidays",
  async ({ store_id, from, to }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/listholidays",
        {
          store_id: Number(store_id),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(holidayError(error, "Failed to list holidays"));
    }
  }
);

export const addStoreHoliday = createAsyncThunk(
  "holidays/addStoreHoliday",
  async ({ store_id, date, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/addholiday",
        {
          store_id: Number(store_id),
          date,
          ...(reason ? { reason } : {}),
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(holidayError(error, "Failed to add holiday"));
    }
  }
);

export const removeStoreHoliday = createAsyncThunk(
  "holidays/removeStoreHoliday",
  async ({ store_id, date }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/removeholiday",
        { store_id: Number(store_id), date },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(holidayError(error, "Failed to remove holiday"));
    }
  }
);

export const addWeeklyHoliday = createAsyncThunk(
  "holidays/addWeeklyHoliday",
  async ({ store_id, weekday, reason }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/addweeklyholiday",
        {
          store_id: Number(store_id),
          weekday,
          ...(reason ? { reason } : {}),
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        holidayError(error, "Failed to add weekly holiday")
      );
    }
  }
);

export const removeWeeklyHoliday = createAsyncThunk(
  "holidays/removeWeeklyHoliday",
  async ({ store_id, weekday }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/removeweeklyholiday",
        { store_id: Number(store_id), weekday },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        holidayError(error, "Failed to remove weekly holiday")
      );
    }
  }
);

const initialState = {
  loading: false,
  actionLoading: false,
  error: null,
  holidays: [],
  weekly: [],
  weekday_names: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};

const holidaySlice = createSlice({
  name: "holidays",
  initialState,
  reducers: {
    clearHolidays(state) {
      state.holidays = [];
      state.weekly = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(listStoreHolidays.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(listStoreHolidays.fulfilled, (state, action) => {
        state.loading = false;
        state.holidays = action.payload?.holidays || [];
        state.weekly = action.payload?.weekly || [];
        if (action.payload?.weekday_names?.length) {
          state.weekday_names = action.payload.weekday_names;
        }
      })
      .addCase(listStoreHolidays.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to list holidays";
      })
      .addCase(addStoreHoliday.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(addStoreHoliday.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(addStoreHoliday.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(removeStoreHoliday.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(removeStoreHoliday.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(removeStoreHoliday.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(addWeeklyHoliday.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(addWeeklyHoliday.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(addWeeklyHoliday.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(removeWeeklyHoliday.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(removeWeeklyHoliday.fulfilled, (state) => {
        state.actionLoading = false;
      })
      .addCase(removeWeeklyHoliday.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearHolidays } = holidaySlice.actions;
export default holidaySlice.reducer;
