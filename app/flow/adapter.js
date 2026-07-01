"use client";

import { seedFlows } from "./data";

// In-memory store (mapper starter pattern), seeded with our flows as `map` docs.
const collections = new Map();
const getCollection = (name) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
};

// seed once
for (const flow of seedFlows) getCollection("map").set(flow.id, structuredClone(flow));
getCollection("submap"); // ensure the collection exists (empty for now)

export function createMemoryAdapter(databaseName) {
  const prefix = databaseName ? `${databaseName}:` : "";
  const col = (entity) => getCollection(`${prefix}${entity}`);
  return {
    find: async (entity, filter) => {
      let items = Array.from(col(entity).values());
      if (filter) items = items.filter((it) => Object.entries(filter).every(([k, v]) => it[k] === v));
      return structuredClone(items);
    },
    save: async (entity, data) => {
      const c = col(entity);
      const existing = c.get(data.id);
      c.set(data.id, existing ? { ...existing, ...structuredClone(data) } : structuredClone(data));
    },
    remove: async (entity, id) => { col(entity).delete(id); },
    pushEmbedded: async (entity, parentId, data) => {
      const p = col(entity).get(parentId); if (!p) return;
      if (!p.nodes) p.nodes = []; p.nodes.push(structuredClone(data));
    },
    updateEmbedded: async (entity, parentId, data) => {
      const p = col(entity).get(parentId); if (!p?.nodes) return;
      const i = p.nodes.findIndex((n) => n.id === data.id);
      if (i >= 0) p.nodes[i] = { ...p.nodes[i], ...structuredClone(data) };
    },
    pullEmbedded: async (entity, parentId, itemId) => {
      const p = col(entity).get(parentId); if (!p?.nodes) return;
      p.nodes = p.nodes.filter((n) => n.id !== itemId);
    },
  };
}
