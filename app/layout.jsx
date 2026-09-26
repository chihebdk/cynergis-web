// Global stylesheets (order matters: design system → feature CSS → inline overrides).
import './theme/styles.css';
import './theme/feature/ascent.css';
import './theme/feature/evidence.css';
import './theme/feature/disdes.css';
import './theme/feature/trace.css';
import './theme/feature/delivery.css';
import './theme/feature/design-ddd.css';
import './theme/feature/meridian.css';
import './theme/feature/org-refchart.css';
import '@xyflow/react/dist/style.css';
import './theme/feature/flow-canvas.css';
import './theme/feature/inline.css';

export const metadata = {
  title: 'Meridian Auto Insurance · OTO Studio',
  description: 'The DDD organization: domains, bounded contexts, durable teams — every surface derived from the knowledge graph.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
