"use client";

import { createContext, useContext } from "react";

// Which perspective the event flow shows: the business/spec lens (grounding in
// UC/FR/NFR/POL) or the architecture lens (components/APIs/resources/schemas).
// Provided by FlowEmbed; consumed by the board panel (and any node decorators).
export const LensContext = createContext("spec");
export const useLens = () => useContext(LensContext);
