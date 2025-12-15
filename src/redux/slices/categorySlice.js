
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";



// get AllCategory
export const getAllCategoryList = createAsyncThunk(
  "allCategory/getAllCategoryList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getallcategory", {},{
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
        "Failed to fetch allCategory";
      return rejectWithValue(message);
    }
  }
);

// add category
export const addCategory = createAsyncThunk(
  "allCategory/addCategory",
  async (formDataToSend, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/addcategory", formDataToSend, {
          withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to add category";
      return rejectWithValue(message);
    }
  }
);

// delete category
export const deleteCategory = createAsyncThunk(
  "allCategory/deleteCategory",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/deletecategory", id,{
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
        "Failed to delete category";
      return rejectWithValue(message);
    }
  }
);


const initialState = {
  loading: false,
  error: null,
  success: false,
  allCategoryList: [], 
};

const allCategorySlice = createSlice({
  name: "allCategory",
  initialState,
  reducers: {
    resetAllCategoryState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allCategoryList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allCategory list
      .addCase(getAllCategoryList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllCategoryList.fulfilled, (state, action) => {
        state.loading = false;
        state.allCategoryList = action.payload;
      })
      .addCase(getAllCategoryList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allCategory";
      })

      // add category
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state) => {
        state.loading = false;
        
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add category";
      })

    // delete category
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state) => {
        state.loading = false;
        
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete category";
      });

          
  },
});

export const { resetAllCategoryState } = allCategorySlice.actions;
export default allCategorySlice.reducer;
