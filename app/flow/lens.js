"use client";

import { createContext, useContext } from "react";

// Which perspective the event flow shows: the business/spec lens (grounding in
// UC/FR/NFR/POL) or the architecture lens (components/APIs/resources/schemas).
// Provided by FlowEmbed; the board panel reads the lens and hosts the switcher.
export const LensContext = createContext({ lens: "spec", setLens: () => {} });
export const useLens = () => useContext(LensContext).lens;
export const useLensState = () => useContext(LensContext);
