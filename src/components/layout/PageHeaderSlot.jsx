import { useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeaderSlotContext } from "./pageHeaderSlotContext";

// Lets a page render its title and header controls into the app's top bar
// (Header.jsx) instead of drawing a second header row of its own. The bar
// already owns the hamburger and the account menu; the page supplies the rest.
//
// Content rendered this way sits outside any scaled V2 canvas, so the chrome
// keeps its own type size no matter how far the page canvas is scaled down.

export const PageHeaderSlotProvider = ({ children }) => {
  const [slot, setSlot] = useState(null);
  const value = useMemo(() => ({ slot, setSlot }), [slot]);
  return <PageHeaderSlotContext.Provider value={value}>{children}</PageHeaderSlotContext.Provider>;
};

export const PageHeaderPortal = ({ children }) => {
  const { slot } = useContext(PageHeaderSlotContext);
  return slot ? createPortal(children, slot) : null;
};
