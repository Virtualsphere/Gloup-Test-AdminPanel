
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get Active Banner
export const getActiveBannerList = createAsyncThunk(
  "activeBanner/getActiveBannerList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getactivebanner", {},{
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
        "Failed to fetch active banners";
      return rejectWithValue(message);
    }
  }
);

// add banner
export const addBanner = createAsyncThunk(
  "activeBanner/addBanner",
  async (formDataToSend, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/addbanner", formDataToSend, {
          withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to add banner";
      return rejectWithValue(message);
    }
  }
);

// delete banner
export const deleteBanner = createAsyncThunk(
  "activeBanner/deleteBanner",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/deletebanner", id,{
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
        "Failed to delete banner";
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  loading: false,
  error: null,
  success: false,
  allActiveBanners: [],
};

const allActiveBannersSlice = createSlice({
  name: "allActiveBanners",
  initialState,
  reducers: {
    resetAllActiveBannersState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allActiveBanners = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allActiveBanners list
      .addCase(getActiveBannerList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getActiveBannerList.fulfilled, (state, action) => {
        state.loading = false;
        state.allActiveBanners = action.payload;
      })
      .addCase(getActiveBannerList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allActiveBanners";
      })

      // add banner
      .addCase(addBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBanner.fulfilled, (state, action) => {
        state.loading = false;
        
      })
      .addCase(addBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add banner";
      })

    // delete banner
      .addCase(deleteBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBanner.fulfilled, (state, action) => {
        state.loading = false;
                
      })
      .addCase(deleteBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete banner";
      });

          
  },
});

export const { resetAllActiveBannersState } = allActiveBannersSlice.actions;
export default allActiveBannersSlice.reducer;
