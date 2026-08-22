import { createSlice } from "@reduxjs/toolkit";

// Keeps per-list UI state (page, search, filters, sort, view type) keyed by
// a list identifier (e.g. "partner"). Lives in Redux — not local component
// state — so it survives the list page unmounting when you navigate to a
// detail page and back, instead of resetting to page 1 every time.
const listUiStateSlice = createSlice({
  name: "listUiState",
  initialState: {},
  reducers: {
    setListUiState: (state, action) => {
      const { key, patch } = action.payload;
      state[key] = { ...(state[key] || {}), ...patch };
    },
    resetListUiState: (state, action) => {
      delete state[action.payload];
    },
  },
});

export const { setListUiState, resetListUiState } = listUiStateSlice.actions;
export default listUiStateSlice.reducer;
