"use client";

import { StateProvider } from "@flowai/state";
import { entities, embeddedEntities } from "./data";
import { createMemoryAdapter } from "./adapter";

// entities/embeddedEntities are already in {collection, fields} / {rootCollection, arrayField, fields} shape
const registry = { entities, embeddedEntities };

const stateConfig = {
  registry,
  crudAdapter: () => createMemoryAdapter(),
  autosaveInterval: 2000,
};

export const MapStateProvider = ({ children }) => (
  <StateProvider config={stateConfig}>{children}</StateProvider>
);
