import { createContext, useContext } from "react";

// The DOM node in Header.jsx that pages render their title / header controls
// into. Provided by <PageHeaderSlotProvider> (PageHeaderSlot.jsx).
export const PageHeaderSlotContext = createContext({ slot: null, setSlot: () => {} });

// Callback ref for the element in Header.jsx that hosts page content.
export const usePageHeaderSlotRef = () => useContext(PageHeaderSlotContext).setSlot;
