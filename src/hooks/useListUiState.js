import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setListUiState } from "../redux/slices/listUiStateSlice";

/**
 * Drop-in replacement for a group of useState fields (page, search, filters,
 * sort, view type, ...) that persists them in Redux under `key`, so they
 * survive unmounting the list page (e.g. navigating to a detail page and
 * back) instead of resetting on remount.
 *
 * const [state, setField] = useListUiState("partner", { currentPage: 1, searchTerm: "" });
 * state.currentPage
 * setField("currentPage", (prev) => prev + 1)  // updater form, like setState
 * setField("searchTerm", "foo")                 // direct value form
 */
export function useListUiState(key, defaults) {
  const dispatch = useDispatch();
  const stored = useSelector((state) => state.listUiState[key]);
  const value = stored ? { ...defaults, ...stored } : defaults;

  const setField = useCallback(
    (field, valueOrUpdater) => {
      const nextValue =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(value[field])
          : valueOrUpdater;
      dispatch(setListUiState({ key, patch: { [field]: nextValue } }));
    },
    [dispatch, key, value]
  );

  return [value, setField];
}
