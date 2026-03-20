import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

/* ============================
   🔹 GET ALL PLANS
============================ */
export const getAllPlans = createAsyncThunk(
    "partnerSubscription/getAllPlans",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.post(`/admin/app/getallpartnersubscription`,
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: false,
                }
            );
            console.log('Response Data',res.data);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

/* ============================
   🔹 GET PLAN BY ID
============================ */
export const getPlanById = createAsyncThunk(
  "partnerSubscription/getPlanById",
  async (id, { rejectWithValue }) => {
    try {
        const res = await api.post(`/admin/app/getpartnersubscriptionbyid`,
            {id},
            {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: false,
            }
        );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================
   🔹 ADD PLAN
============================ */
export const addPlan = createAsyncThunk(
  "partnerSubscription/addPlan",
  async (data, { rejectWithValue }) => {
    try {
       const res = await api.post(`/admin/app/addpartnersubscription`,
            {data},
            {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: false,
            }
        );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================
   🔹 UPDATE PLAN
============================ */
export const updatePlan = createAsyncThunk(
  "partnerSubscription/updatePlan",
  async ({ id, data }, { rejectWithValue }) => {
    try {
        const res = await api.post(`/admin/app/updatepartnersubscription`,
            { id, ...data },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: false,
            }
        );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================
   🔹 DELETE PLAN
============================ */
export const deletePlan = createAsyncThunk(
  "partnerSubscription/deletePlan",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(`/admin/app/deletepartnersubscription`,
            { id },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                withCredentials: false,
            }
        );
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);


export const getAllPlansFeatures = createAsyncThunk(
    "partnerSubscription/getAllPlansFeatures",
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.post(`/admin/app/getallpartnersubscriptionfeatures`,
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: false,
                }
            );
            console.log('Response Data',res.data);
            return res.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);

const initialState = {
    plans: [],
    featuresList:[],
    selectedPlan: null,
    loading: false,
    error: null,
};

/* ============================
   🔹 SLICE
============================ */
const partnerSubscriptionSlice = createSlice({
  name: "partnerSubscription",
  initialState,
  reducers: {
    clearSelectedPlan: (state) => {
      state.selectedPlan = null;
    }
  },

  extraReducers: (builder) => {
    builder

      /* GET ALL */
      .addCase(getAllPlans.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload.data;
      })
      .addCase(getAllPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* GET ALL FEATURES*/
      .addCase(getAllPlansFeatures.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllPlansFeatures.fulfilled, (state, action) => {
        state.loading = false;
        state.featuresList = action.payload.data;
      })
      .addCase(getAllPlansFeatures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* GET BY ID */
      .addCase(getPlanById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getPlanById.fulfilled, (state, action) => {
        state.selectedPlan = action.payload.data;
      })
      .addCase(getPlanById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ADD */
      .addCase(addPlan.fulfilled, (state, action) => {
        state.plans.push(action.payload);
      })

      /* UPDATE */
      .addCase(updatePlan.fulfilled, (state, action) => {
        // Option 1: Refetch
        // Option 2: Update locally
      })

      /* DELETE */
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter(
          (p) => p.plan_id !== action.meta.arg
        );
      });
  },
  
});


export const { clearSelectedPlan } = partnerSubscriptionSlice.actions;
export default partnerSubscriptionSlice.reducer;