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

/* op → the owning spec (the routing table update_route serves) */
const ROUTES = {
  'approval.decide': 'cynergis/app/lib/ops-data.js',
  'decision.record': 'cynergis/app/lib/realize-data.js',
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
    route: ROUTES[op],
    apply: 'node kg/apply.js',
  };
  fs.appendFileSync(path.join(dir, 'pending.jsonl'), JSON.stringify(change) + '\n');
  return Response.json({ staged: true, id: change.id, route: change.route });
}
