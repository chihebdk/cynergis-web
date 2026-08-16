/* ============================================================
   The gated write path's intake (D-077, doctrine 4 — D-066 §1.4):
   a two-way UI act never writes the graph or a spec directly; it
   stages a CHANGE REQUEST here. kg/apply.js routes each request
   into the OWNING SPEC (the same answer Optimus update_route gives),
   regenerates, and the change comes back to the UI from the derived
   knowledge base. pending.jsonl is the queue; applied.jsonl is the
   audit trail (temporal, never overwritten — D-009).
   Post-cutover (D-102): every route targets a v4 spec — the acting
   register names its graph and the table resolves the owning file.
   Dev-demo intake: in the target state this is the PR pipeline.
   ============================================================ */
import fs from 'fs';
import path from 'path';

/* graph → the owning lifecycle spec (registers act per product graph) */
const V4_SPECS = { claimscore: 'kg/org/products/claimscore.js' };

/* op → the owning spec (the routing table update_route serves) */
const ROUTES = {
  'approval.decide': (p) => V4_SPECS[p && p.graph],
  'approval.create': (p) => V4_SPECS[p && p.graph],
  'incident.apply': (p) => V4_SPECS[p && p.graph],
  'incident.escalate': (p) => V4_SPECS[p && p.graph],
  'review.record': () => 'kg/org/domains/claims.js',   // Phase E (D-097): the quarterly outcome review
};

export async function POST(req) {
  const body = await req.json();
  const { op, target, payload } = body || {};
  const route = ROUTES[op] ? ROUTES[op](payload) : null;
  if (!op || !target || !route) {
    return Response.json({ error: `unroutable change: op=${op}` }, { status: 400 });
  }
  const dir = path.join(process.cwd(), '..', 'kg', 'changes');
  fs.mkdirSync(dir, { recursive: true });
  const change = {
    id: 'chg-' + Date.now().toString(36),
    ts: new Date().toISOString(),
    op, target, payload,
    route,
    apply: 'node kg/apply.js',
  };
  fs.appendFileSync(path.join(dir, 'pending.jsonl'), JSON.stringify(change) + '\n');
  return Response.json({ staged: true, id: change.id, route: change.route });
}
