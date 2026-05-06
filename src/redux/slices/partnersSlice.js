import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// get AllPartners
export const getAllPartnersList = createAsyncThunk(
  "allPartners/getAllPartnersList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/getallpartner",
        {},
        {
          headers: {
            "Content-Type": "application/json", // optional in GET, but included here per request
          },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch allPartners";
      return rejectWithValue(message);
    }
  }
);

// get VerifiedPartners
export const getVerifiedPartnersList = createAsyncThunk(
  "allPartners/getVerifiedPartnersList",
  async (_, { rejectWithValue }) => { 
    try {
      debugger;
      const response = await api.post(
        "/admin/app/getverifypartner",
        {},
        {
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch verified partners";
      return rejectWithValue(message);
    }
  }
);

// create partner
export const createPartner = createAsyncThunk(
  "allPartners/createPartner",
  async (formData, { rejectWithValue }) => {
    console.log("formData:", formData);

    try {
      const response = await api.post("/admin/app/createpartner", formData, {
        // ✅ Do NOT set Content-Type manually
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
  error.response?.data?.error?.message ||
  error.message ||
  "Partner already exists with matching data" ||
  "Failed to create partner";

return rejectWithValue(message);

    }
  }
);

// create service
export const createService = createAsyncThunk(
  "allPartners/createService",
  async(payload, {rejectWithValue}) => {
    console.log('Payload: ', payload);

    try {
      const response = await api.post('/admin/app/createservice', payload, {
        withCredentials: false,
      });

      return response.data.data;
    } catch (error) {
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to create Service";
      return rejectWithValue(message);
    }
  }
);

// edit service
export const editService = createAsyncThunk(
  "allPartners/editService",
  async(payload, {rejectWithValue}) => {
    console.log('Payload: ', payload);

    try {
      const response = await api.post('/admin/app/editservice', payload, {
        withCredentials: false,
      });

      return response.data.data;
    } catch (error) {
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to edit Service";
      return rejectWithValue(message);
    }
  }
);

export const deleteService = createAsyncThunk(
  "allPartners/deleteService",
  async(serviceId, {rejectWithValue}) => {
    console.log('Delete Service ID: ', serviceId);
 
    try {
      const response = await api.post('/admin/app/deleteservice', { service_id: serviceId }, {
        withCredentials: false,
      });
 
      return response.data.data;
    } catch (error) {
      const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to delete Service";
      return rejectWithValue(message);
    }
  }
);

// get service category
export const fetchServiceCategories = createAsyncThunk(  
  "allPartners/getserivecategory",
  async(_, {rejectWithValue}) => {
    try {
      const response = await api.post('/admin/app/getservicecategorylist', {}, {
        withCredentials: false,
      });
      return response.data.data;
    }
    catch (error) {
      const message =
      error.response?.data?.error?.message ||
      error.message ||
      "Failed to fetch service category";
      return rejectWithValue(message);
    }
  }
);

// get PartnerDetailsedit`
export const updatePartnerDetail = createAsyncThunk(
  "allPartners/editPartnerDetails",
  async (formData, { rejectWithValue }) => {
    console.log("formData:", formData);

    try {
      const response = await api.post("/admin/app/editpartner", formData, {
        // ✅ Do NOT set Content-Type manually
        withCredentials: false,
      });
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to edit partner details";
      return rejectWithValue(message);
    }
  }
);

// get PartnerDetail
export const getPartnerDetail = createAsyncThunk(
  "allPartners/getPartnerDetail",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getallpartnerdetails", id, {
        headers: {
          "Content-Type": "application/json", // optional in GET, but included here per request
        },
        withCredentials: false,
      });
      console.log('Get Partner Detail: ', response.data.data)
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to fetch PartnerDetail";
      return rejectWithValue(message);
    }
  }
);

// get StoreServices
export const getStoreServices = createAsyncThunk(
  "partnerDetail/getStoreServices",
  async (id, { rejectWithValue }) => {
    try {
      console.log('get store ser', id);
      const response = await api.post("/admin/app/getservices", id, {
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
        "Failed to fetch StoreServices";
      return rejectWithValue(message);
    }
  }
);

// update Partner Status
export const updatePartnerStatus = createAsyncThunk(
  "allPartners/updatePartnerStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updatepartner",
        { id, status },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to update Partner Status";
      return rejectWithValue(message);
    }
  }
);

// add payouts
export const addPayout = createAsyncThunk(
  "partnerDetail/addPayout",
  async ({ store_id, amount }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/addpayout",
        { store_id, amount },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to add payout";
      return rejectWithValue(message);
    }
  }
);

// get payouts logs
export const getAllPayoutLogs = createAsyncThunk(
  "allPartners/getAllPayoutLogs",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getpayoutlogs", id, {
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
        "Failed to fetch allPayoutLogs";
      return rejectWithValue(message);
    }
  }
);

// delete Partner
export const deletePartner = createAsyncThunk(
  "allPartners/deletePartner",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/deletePartner",
        { id },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to delete partner";
      return rejectWithValue(message);
    }
  }
);

// update Multiple Partners
export const updateMultiplePartner = createAsyncThunk(
  "allPartners/updateMultiplePartner",
  async ({ partnerIds, status }, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/admin/app/updateMultiplePartner",
        { partnerIds, status },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: false,
        }
      );
      return response.data.data;
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to update multiple partners";
      return rejectWithValue(message);
    }
  }
);

// generate default slots
export const generateDefaultSlots = createAsyncThunk(
  "allPartners/generateDefaultSlots",
  async (storeId, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/generateDefaultSlots", { storeId }, {
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
        "Failed to generate default slots";
      return rejectWithValue(message);
    }
  }
);

// block and unblock slot
export const BlockAndUnblockSlot = createAsyncThunk(  
  "allPartners/BlockAndUnblockSlot",
  async ({ storeId ,slotId, status, date }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/blockandunblockslot", { storeId, slotId, status, date }, {
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
        "Failed to block/unblock slot";
      return rejectWithValue(message);
    }
    } 
);

// get Blocked Slots 
export const getBlockedSlots = createAsyncThunk(
  "allPartners/getBlockedSlots",
  async ({ storeId, date }, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getblockedslots", { storeId, date }, {
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
        "Failed to fetch blocked slots";
      return rejectWithValue(message);
    }
  }
);

// get language list
export const getLanguageList = createAsyncThunk(
  "allPartners/getLanguageList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getlanguagelist", {}, {
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
        "Failed to fetch language list";
      return rejectWithValue(message);
    }
  }
);

// get service provided for options
export const getServiceProvidedForOptions = createAsyncThunk(
  "allPartners/getServiceProvidedForOptions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/app/getserviceprovidedforoptions", {}, {
        headers: {  
          "Content-Type": "application/json",
        },
        withCredentials: false,
      });
      return response.data.data;
    }
    catch (error) {
      const message =
        error.response?.data?.error?.message || 
        error.message ||
        "Failed to fetch service provided for options";
      return rejectWithValue(message);
    }
  }
);

// Initial state
const initialState = {
  loading: false,
  error: null,
  success: false,
  partnerDetail: {},
  updatePartner: {},
  storeServices: {},
  allPartnersList: [],
  allPayoutLogs: [],
  verifiedPartners: [],
  serviceCategories: [],
  blockedSlots: [],
  languageList: [],
  serviceProvidedForOptions: [],
};

const allPartnersSlice = createSlice({
  name: "allPartners",
  initialState,
  reducers: {
    resetAllPartnersState(state) {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.allPartnersList = [];
      state.partnerDetail = {};
      state.storeServices = {};
      state.allPayoutLogs = [];
      state.serviceCategories = [];
    },
  },
  extraReducers: (builder) => {
    builder

      // Get allPartners list
      .addCase(getAllPartnersList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPartnersList.fulfilled, (state, action) => {
        state.loading = false;
        state.allPartnersList = action.payload;
      })
      .addCase(getAllPartnersList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allPartners";
      })
      // update partner
      .addCase(updatePartnerDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePartnerDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.updatePartner = action.payload;
      })
      .addCase(updatePartnerDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update";
      })

      // Get PartnerDetail
      .addCase(getPartnerDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPartnerDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.partnerDetail = action.payload;
      })
      .addCase(getPartnerDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch PartnerDetail";
      })

      // Get VerifiedPartners list
       .addCase(getVerifiedPartnersList.pending, (state) => {
        state.loading = true;
      })
      .addCase(getVerifiedPartnersList.fulfilled, (state, action) => {
        state.loading = false;
        state.verifiedPartners = action.payload;
      })
      .addCase(getVerifiedPartnersList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch verified partners";
      })

      // Get StoreService
      .addCase(getStoreServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoreServices.fulfilled, (state, action) => {
        state.loading = false;
        state.storeServices = action.payload;
      })
      .addCase(getStoreServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch StoreServices";
      })

        // Get Service Category
        .addCase(fetchServiceCategories.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(fetchServiceCategories.fulfilled, (state, action) => {
          state.loading = false;
          state.serviceCategories = action.payload;
        })
        .addCase(fetchServiceCategories.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to fetch service category";
        })

      // Update Partner Status
      .addCase(updatePartnerStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePartnerStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(updatePartnerStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update Partner Status";
      })

      // Get payouts
      .addCase(addPayout.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPayout.fulfilled, (state, action) => {
        state.loading = false;
        state.storeServices = action.payload;
      })
      .addCase(addPayout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch payouts";
      })

      // Get allPayoutsLogs
      .addCase(getAllPayoutLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPayoutLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.allPayoutLogs = action.payload;
      })
      .addCase(getAllPayoutLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch allPayoutLogs";
      })

      // Delete Partner
      .addCase(deletePartner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePartner.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(deletePartner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete partner";
      })

      .addCase(deleteService.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(deleteService.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete service";
      })

      // Update Multiple Partners
      .addCase(updateMultiplePartner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMultiplePartner.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(updateMultiplePartner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update multiple partners";
      })

      // Generate default slots
      .addCase(generateDefaultSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateDefaultSlots.fulfilled, (state, action) => {
        state.loading = false;
        state.partnerDetail = {...state.partnerDetail,timeslots: action.payload};
      })
      .addCase(generateDefaultSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to generate default slots";
      })

      // Block and Unblock slot
      .addCase(BlockAndUnblockSlot.fulfilled, (state, action) => {
        const { slotId, status, date } = action.payload;

        if (state.partnerDetail?.timeslots) {
          const slot = state.partnerDetail.timeslots.find(s => s.id === slotId);
          if (slot) {
            slot.status = status;
            slot.date = date;
          }
        }
      })
      .addCase(getBlockedSlots.pending, (state) => {
          state.loading = true;
          state.error = null;
      })
      .addCase(getBlockedSlots.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload || "Failed to fetch blocked slots";
      })

      // Get Language List
      .addCase(getLanguageList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLanguageList.fulfilled, (state, action) => {
        state.loading = false;
        state.languageList = action.payload;
      })
      .addCase(getLanguageList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch language list";
      })

      // Get Service Provided For Options
      .addCase(getServiceProvidedForOptions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getServiceProvidedForOptions.fulfilled, (state, action) => {
        state.loading = false;
        state.serviceProvidedForOptions = action.payload;
      })
      .addCase(getServiceProvidedForOptions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch service provided for options";
      });
  },
});

export const { resetAllPartnersState } = allPartnersSlice.actions;
export default allPartnersSlice.reducer;
