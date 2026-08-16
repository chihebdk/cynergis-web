'use client';
import React from 'react';

// The Meridian organization (v4) — every surface derived from the
// knowledge graphs in window.__KG4__ (D-094…D-102). WealthGrow (v3)
// retired at parity (D-102); its artifacts live in git history and
// Optimus `as_of` still answers about them.
import OrgApp from './lib/org-app';

export default function CynergisApp() {
  return <OrgApp />;
}
