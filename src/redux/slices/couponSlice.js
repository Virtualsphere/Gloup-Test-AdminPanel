
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllCoupons
export const getAllCouponsList = createAsyncThunk(
  "allCoupons/getAllCouponsList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getallcoupons", {},{
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
        "Failed to fetch allCoupons";
      return rejectWithValue(message);
    }
  }
);

// add coupon
export const addCoupon = createAsyncThunk(
  "allCoupons/addCoupon",
  async (couponData, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/addcoupons", couponData, {
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
        "Failed to add coupon";
      return rejectWithValue(message);
    }
  }
);

// delete coupon
export const deleteCoupon = createAsyncThunk(
  "allCoupons/deleteCoupon",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/deletecoupons", id,{
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
        "Failed to delete coupon";
      return rejectWithValue(message);
    }
  }
);



const initialState = {
  loading: false,
  error: null,
  success: false,
  allCouponsList: [],
};

const allCouponsSlice = createSlice({
  name: "allCoupons",
  initialState,
  reducers: {
    resetAllCouponsState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allCouponsList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allCoupons list
      .addCase(getAllCouponsList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCouponsList.fulfilled, (state, action) => {
        state.loading = false;
        state.allCouponsList = action.payload;
      })
      .addCase(getAllCouponsList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allCoupons";
      })

      // add coupon
      .addCase(addCoupon.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCoupon.fulfilled, (state) => {
        state.loading = false;
               
      })
      .addCase(addCoupon.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add Coupon";
      })

      // delete coupon
            .addCase(deleteCoupon.pending, (state) => {
              state.loading = true;
              state.error = null;
            })
            .addCase(deleteCoupon.fulfilled, (state) => {
              state.loading = false;
              
            })
            .addCase(deleteCoupon.rejected, (state, action) => {
              state.loading = false;
              state.error = action.payload || "Failed to delete coupon";
            });
              
  },
});

export const { resetAllCouponsState } = allCouponsSlice.actions;
export default allCouponsSlice.reducer;
