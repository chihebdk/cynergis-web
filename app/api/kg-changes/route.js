/* ============================================================
   The gated write path's intake (D-077, doctrine 4 — D-066 §1.4):
   a two-way UI act never writes the graph or a spec directly; it
   stages a CHANGE REQUEST here. kg/apply.js routes each request
   into the OWNING SPEC (the same answer Optimus update_route gives),
   regenerates, and the change comes back to the UI from the derived
   knowledge base. pending.jsonl is the queue; applied.jsonl is the
   audit trail (temporal, never overwritten — D-009).
   Dev-demo intake: in the target state this is the PR pipeline.
   ============================================================ */
import fs from 'fs';
import path from 'path';

/* op → the owning spec (the routing table update_route serves).
   Shared ops route by the acting register's graph (D-098): the same
   approval/incident acts serve the v3 fraud register (ops-data.js)
   and the v4 ClaimsCore register (its lifecycle spec). */
const V4_SPECS = {
  claimscore: 'kg/org/products/claimscore.js', 'adjuster-wb': 'kg/org/products/adjuster-wb.js',
  'repair-portal': 'kg/org/products/repair-portal.js', autoquote: 'kg/org/products/autoquote.js',
  'rating-api': 'kg/org/products/rating-api.js', catalogue: 'kg/org/products/catalogue.js',
  policycore: 'kg/org/products/policycore.js', 'uw-workbench': 'kg/org/products/uw-workbench.js',
  'payments-hub': 'kg/org/products/payments-hub.js', 'customer-portal': 'kg/org/products/customer-portal.js',
  'broker-portal': 'kg/org/products/broker-portal.js',
};
const DOMAIN_SPECS = {
  claims: 'kg/org/domains/claims.js', pricing: 'kg/org/domains/pricing.js',
  distribution: 'kg/org/domains/distribution.js', 'uw-policy': 'kg/org/domains/uw-policy.js',
  billing: 'kg/org/domains/billing.js', platform: 'kg/org/domains/platform.js',
};
const ROUTES = {
  'approval.decide': (p) => V4_SPECS[p && p.graph] || 'cynergis/app/lib/ops-data.js',
  'approval.create': (p) => V4_SPECS[p && p.graph] || 'cynergis/app/lib/ops-data.js',
  'incident.apply': (p) => V4_SPECS[p && p.graph] || 'cynergis/app/lib/ops-data.js',
  'incident.escalate': (p) => V4_SPECS[p && p.graph] || 'cynergis/app/lib/ops-data.js',
  'decision.record': 'cynergis/app/lib/realize-data.js',
  'review.record': (p) => DOMAIN_SPECS[p && p.graph] || 'kg/org/domains/claims.js',   // Phase E (D-097, generalized D-113): the quarterly outcome review routes to the domain's member spec
};

export async function POST(req) {
  const body = await req.json();
  const { op, target, payload } = body || {};
  if (!op || !target || !ROUTES[op]) {
    return Response.json({ error: `unroutable change: op=${op}` }, { status: 400 });
  }
  const dir = path.join(process.cwd(), '..', 'kg', 'changes');
  fs.mkdirSync(dir, { recursive: true });
  const change = {
    id: 'chg-' + Date.now().toString(36),
    ts: new Date().toISOString(),
    op, target, payload,
    route: typeof ROUTES[op] === 'function' ? ROUTES[op](payload) : ROUTES[op],
    apply: 'node kg/apply.js',
  };
  fs.appendFileSync(path.join(dir, 'pending.jsonl'), JSON.stringify(change) + '\n');
  return Response.json({ staged: true, id: change.id, route: change.route });
}
