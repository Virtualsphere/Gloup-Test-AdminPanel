import { createContext, useContext } from "react";

// The factor <ScaledCanvas> is currently scaling its content by (1 = design
// size). Provided by ScaledCanvas; read it from anything that renders at true
// screen pixels inside <Unscaled> and needs to match the canvas type size.
export const CanvasScaleContext = createContext(1);

export const useCanvasScale = () => useContext(CanvasScaleContext);
