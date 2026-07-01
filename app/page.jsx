'use client';
import dynamic from 'next/dynamic';

// The ported prototype is fully client-side (it shares state via `window`), so render it client-only.
const CynergisApp = dynamic(() => import('./CynergisApp'), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  return <CynergisApp />;
}
