"use client";

import { seedFlows } from "./data";

// In-memory document store seeded from the static flow data (no DB).
const collections = new Map();
const getCollection = (name) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
};

for (const flow of seedFlows) {
  getCollection("flowMap").set(flow.id, structuredClone(flow));
}

const ARR = "nodes";
const memoryAdapter = {
  find: async (entity, filter) => {
    let items = Array.from(getCollection(entity).values());
    if (filter) items = items.filter((it) => Object.entries(filter).every(([k, v]) => it[k] === v));
    return structuredClone(items);
  },
  save: async (entity, data) => {
    const col = getCollection(entity);
    const existing = col.get(data.id);
    col.set(data.id, existing ? { ...existing, ...structuredClone(data) } : structuredClone(data));
  },
  remove: async (entity, id) => { getCollection(entity).delete(id); },
  pushEmbedded: async (entity, parentId, data) => {
    const p = getCollection(entity).get(parentId); if (!p) return;
    if (!p[ARR]) p[ARR] = []; p[ARR].push(structuredClone(data));
  },
  updateEmbedded: async (entity, parentId, data) => {
    const p = getCollection(entity).get(parentId); if (!p?.[ARR]) return;
    const i = p[ARR].findIndex((x) => x.id === data.id);
    if (i >= 0) p[ARR][i] = { ...p[ARR][i], ...structuredClone(data) };
  },
  pullEmbedded: async (entity, parentId, itemId) => {
    const p = getCollection(entity).get(parentId); if (!p?.[ARR]) return;
    p[ARR] = p[ARR].filter((x) => x.id !== itemId);
  },
};

export const useMemoryAdapter = () => memoryAdapter;
