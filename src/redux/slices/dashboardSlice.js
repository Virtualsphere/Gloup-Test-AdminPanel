import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// get dashboard
export const getDashboard = createAsyncThunk(
  "dashboard/getDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getdashborad",{}, {
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
        "Failed to fetch dashboard";
      return rejectWithValue(message);
    }
  }
);

// get monthly reports
export const getMonthlyReports = createAsyncThunk(
  "dashboard/getMonthlyReports",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getMonthlyReports",{}, {
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
        "Failed to fetch monthly reports";
      return rejectWithValue(message);
    }
  }
);

// get reports
export const getReports = createAsyncThunk(
  "dashboard/getReports",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getReports",{}, {
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
        "Failed to fetch reports";
      return rejectWithValue(message);
    }
  }
);

// get top saloon
export const getTopSaloon = createAsyncThunk(
  "dashboard/getTopSaloon",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getTopSaloon",{}, {
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
        "Failed to fetch top saloon";
      return rejectWithValue(message);
    }
  }
);

// get filtered stores
export const getFilteredStores = createAsyncThunk(
  "dashboard/getFilteredStores",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getFilteredStores",{}, {
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
        "Failed to fetch filtered stores";
      return rejectWithValue(message);
    }
  }
);

// get category revenue
export const getCategoryRevenue = createAsyncThunk(
  "dashboard/getCategoryRevenue",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getCategoryRevenue", {}, {
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
        "Failed to fetch category revenue";
      return rejectWithValue(message);
    }
  }
);

// get stores by search
export const getStoresBySearch = createAsyncThunk(
  "dashboard/getStoresBySearch",
  async (search, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getStores", { search }, {
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
        "Failed to fetch stores by search";
      return rejectWithValue(message);
    }
  }
);

// get stores by status
export const getStoresByStatus = createAsyncThunk(
  "dashboard/getStoresByStatus",
  async (status, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getStoreByStatus", { status }, {
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
        "Failed to fetch stores by status";
      return rejectWithValue(message);
    }
  }
);

// get salons by id
export const getSalonsById = createAsyncThunk(
  "dashboard/getSalonsById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/admin/app/getSalons/${id}`, {}, {
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
        "Failed to fetch salons by id";
      return rejectWithValue(message);
    }
  }
);

// Sales by Category
export const getRevenueCategory = createAsyncThunk(
  "dashboard/getRevenueCategory",
  async (category, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getRevenueCategory", { category }, {
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
        "Failed to fetch sales by category";
      return rejectWithValue(message);
    }
  }
);

// update salon
export const updateSalon = createAsyncThunk(
  "dashboard/updateSalon",
  async (salonData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/updatesalon", salonData, {
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
        "Failed to update salon";
      return rejectWithValue(message);
    }
  }
);

// advanced search
export const getAdvancedSearch = createAsyncThunk(
  "dashboard/getAdvancedSearch",
  async (search, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/advancedSearch", { search }, {
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
        "Failed to fetch advanced search";
      return rejectWithValue(message);
    }
  }
);

// get customers
export const getCustomers = createAsyncThunk(
  "dashboard/getCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getCustomers", {}, {
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
        "Failed to fetch customers";
      return rejectWithValue(message);
    }
  }
);

// get revenue growth
export const getRevenueGrowth = createAsyncThunk(
  "dashboard/getRevenueGrowth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getRevenueGrowth", {}, {
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
        "Failed to fetch revenue growth";
      return rejectWithValue(message);
    }
  }
);

// get stores by date
export const getStoresByDate = createAsyncThunk(
  "dashboard/getStoresByDate",
  async (date, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getStoresByDate", { date }, {
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
        "Failed to fetch stores by date";
      return rejectWithValue(message);
    }
  }
);

const initialState = {
  loading: false,
  error: null,
  success: false,
  dashboardList: {},
  monthlyReports: {},
  reports: {},
  topSaloon: {},
  filteredStores: {},
  categoryRevenue: {},
  storesBySearch: {},
  storesByStatus: {},
  salonsById: {},
  revenueCategory: {},
  updateSalon: {},
  advancedSearch: {},
  customers: {},
  revenueGrowth: {},
  storesByDate: {},
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    resetDashboardState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.dashboardList = {};
      state.monthlyReports = {};
      state.reports = {};
      state.topSaloon = {};
      state.filteredStores = {};
      state.categoryRevenue = {};
      state.storesBySearch = {};
      state.storesByStatus = {};
      state.salonsById = {};
      state.revenueCategory = {};
      state.updateSalon = {};
      state.advancedSearch = {};
      state.customers = {};
      state.revenueGrowth = {};
      state.storesByDate = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Get dashboard list
      .addCase(getDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardList = action.payload;
      })
      .addCase(getDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch dashboard";
      })
      // Get monthly reports
      .addCase(getMonthlyReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMonthlyReports.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyReports = action.payload;
      })
      .addCase(getMonthlyReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch monthly reports";
      })
      // Get reports
      .addCase(getReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(getReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch reports";
      })
      // Get top saloon
      .addCase(getTopSaloon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTopSaloon.fulfilled, (state, action) => {
        state.loading = false;
        state.topSaloon = action.payload;
      })
      .addCase(getTopSaloon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch top saloon";
      })
      // Get filtered stores
      .addCase(getFilteredStores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getFilteredStores.fulfilled, (state, action) => {
        state.loading = false;
        state.filteredStores = action.payload;
      })
      .addCase(getFilteredStores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch filtered stores";
      })
      // Get category revenue
      .addCase(getCategoryRevenue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCategoryRevenue.fulfilled, (state, action) => {
        state.loading = false;
        state.categoryRevenue = action.payload;
      })
      .addCase(getCategoryRevenue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch category revenue";
      })
      // Get stores by search
      .addCase(getStoresBySearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoresBySearch.fulfilled, (state, action) => {
        state.loading = false;
        state.storesBySearch = action.payload;
      })
      .addCase(getStoresBySearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch stores by search";
      })
      // Get stores by status
      .addCase(getStoresByStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoresByStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.storesByStatus = action.payload;
      })
      .addCase(getStoresByStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch stores by status";
      })
      // Get salons by id
      .addCase(getSalonsById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSalonsById.fulfilled, (state, action) => {
        state.loading = false;
        state.salonsById = action.payload;
      })
      .addCase(getSalonsById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch salons by id";
      })
      // Sales by Category
      .addCase(getRevenueCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRevenueCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.revenueCategory = action.payload;
      })
      .addCase(getRevenueCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch sales by category";
      })
      // Update salon
      .addCase(updateSalon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSalon.fulfilled, (state, action) => {
        state.loading = false;
        state.updateSalon = action.payload;
      })
      .addCase(updateSalon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update salon";
      })
      // Get advanced search
      .addCase(getAdvancedSearch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAdvancedSearch.fulfilled, (state, action) => {
        state.loading = false;
        state.advancedSearch = action.payload;
      })
      .addCase(getAdvancedSearch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch advanced search";
      })
      // Get customers
      .addCase(getCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(getCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customers";
      })
      // Get revenue growth
      .addCase(getRevenueGrowth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRevenueGrowth.fulfilled, (state, action) => {
        state.loading = false;
        state.revenueGrowth = action.payload;
      })
      .addCase(getRevenueGrowth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch revenue growth";
      })
      // Get stores by date
      .addCase(getStoresByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoresByDate.fulfilled, (state, action) => {
        state.loading = false;
        state.storesByDate = action.payload;
      })
      .addCase(getStoresByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch stores by date";
      });
  },
});

export const { resetDashboardState } = dashboardSlice.actions;
export default dashboardSlice.reducer;