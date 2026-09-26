'use client';
import React from 'react';
import mermaid from 'mermaid';

// Load the ported modules in dependency order. Each populates `window` with its data/components
// (the prototype's original cross-file sharing model); the explicit chain imports inside each
// module also enforce ordering regardless of bundler.
import './lib/prd-data';
import './lib/arch-data';
import './lib/org-data';
import './lib/delivery-data';
import './lib/ddd-data';
import './lib/kg4-derive';   // D-130: derives PRD + Design projections for every v4 product
import './lib/domain-model-data';
import './lib/trace-core';
import './lib/trace-details';
import './lib/screens-evidence';
import './lib/screens-disdes';
import './lib/screens-delivery';
import './lib/screens-design-ddd';
import './lib/org-prio';
import './lib/org-envision';
import OrgApp from './lib/org-app';
import TourHost from './tour/tour-engine';   // the guided demo walkthrough

// Mermaid was a CDN global in the prototype; provide it the same way.
if (typeof window !== 'undefined') window.mermaid = mermaid;

export default function CynergisApp() {
  return (
    <>
      <OrgApp />
      <TourHost />
    </>
  );
}
