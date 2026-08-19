/* ============================================================
   D-131 — derived event flows.
   The Event flow tab was authored-content-only (fraud + ClaimsCore,
   D-108). This derives a storming flow for EVERY other packaged
   wall from graph facts alone: one event node per use case, its
   commands from the realizing FRs, business rules from the gated
   Gherkin ATs, policies from the wall's publish contracts. No
   grounds[] chips are attached — derived flows claim no grounding
   they don't have. Authored flows always win (skip if a hand flow
   already covers the wall).
   ============================================================ */

export function buildDerivedFlows() {
  const K4 = typeof window !== 'undefined' && window.__KG4__;
  if (!K4 || !K4.org || !K4.products) return [];
  const HAND = new Set(['CTX-FNOL', 'CTX-COVERAGE', 'CTX-AB', 'CTX-TOTAL-LOSS']);

  const wrap = g => {
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    const byLocal = new Map(g.nodes.map(n => [n.localId, n]));
    const out = (id, t) => g.edges.filter(e => e.from === id && (!t || e.type === t));
    const inn = (id, t) => g.edges.filter(e => e.to === id && (!t || e.type === t));
    const nodes = t => g.nodes.filter(n => n.type === t);
    return { byId, byLocal, out, inn, nodes };
  };
  const org = wrap(K4.org);
  const members = {};
  for (const mg of Object.values(K4.members || {})) {
    const w = wrap(mg);
    const d = w.nodes('Domain')[0];
    if (d) members[d.localId] = w;
  }
  const ctxDomain = new Map();
  for (const e of K4.org.edges) if (e.type === 'contains') {
    const d = org.byId.get(e.from), c = org.byId.get(e.to);
    if (d && c) ctxDomain.set(c.localId, d.localId);
  }

  const flows = [];
  const seen = new Set();
  const byCtx = {};

  for (const pg of Object.values(K4.products)) {
    const P = wrap(pg);
    const frs = P.nodes('FunctionalRequirement');
    const ats = P.nodes('AcceptanceTest');
    const frComp = f => P.byId.get((P.inn(f.id, 'implements')[0] || {}).from);
    const frCtx = f => { const c = frComp(f); return c ? P.byId.get((P.out(c.id, 'part_of')[0] || {}).to) : null; };

    for (const uc of P.nodes('UseCase')) {
      const fset = frs.filter(f => P.inn(f.id, 'realizes').some(e => e.from === uc.id));
      const wall = fset.map(frCtx).find(Boolean);
      if (!wall || HAND.has(wall.localId) || !String(wall.localId).startsWith('CTX-')) continue;
      const key = wall.localId;
      if (!byCtx[key]) byCtx[key] = { wall, items: [] };
      byCtx[key].items.push({ uc, fset, P, frComp });
    }
  }

  for (const [ctx, { wall, items }] of Object.entries(byCtx)) {
    if (seen.has(ctx)) continue;
    seen.add(ctx);
    const mw = members[ctxDomain.get(ctx)];
    const mc = mw && mw.byLocal.get(ctx);
    const model = mc && mw.nodes('DomainModel').find(m => mw.out(m.id, 'part_of').some(e => e.to === mc.id));
    const pubs2 = mc ? mw.out(mc.id, 'publishes_to').map(e => mw.byId.get(e.to)).filter(k => k && k.type === 'Contract')
      .map(k => ({ k, cp: mw.byId.get((mw.out(k.id, 'with')[0] || {}).to) })) : [];

    let parent = 'start';
    const nodes = items.map(({ uc, fset, P }, i) => {
      const myAts = P.nodes('AcceptanceTest').filter(a => P.out(a.id, 'tests').some(e => e.to === uc.id));
      const id = `dv-${ctx.toLowerCase()}-${i}`;
      const n = {
        id, type: 'SimpleNode', parentId: parent, kind: 'event',
        summary: uc.label, isPivotal: i === 0,
        aggregate: model ? model.label : wall.label,
        description: uc.props.note || '',
        trigger: { kind: 'external', actor: '', mechanism: '', label: uc.props.note || uc.label },
        commands: fset.map(f => ({ label: f.label, on: model ? model.label : wall.label, desc: '' })),
        businessRules: myAts.map(a => ({ label: `${a.localId} — gated acceptance`, desc: String(a.props.gherkin || '').split('\n').join(' · ') })),
        policies: i === items.length - 1 ? pubs2.map(({ k, cp }) => ({ label: k.label, desc: k.props.mechanism || '', crosses: (cp || {}).label || '' })) : [],
        hotspots: [],
      };
      parent = id;
      return n;
    });

    flows.push({
      id: `dv-${ctx.toLowerCase()}`,
      name: `${wall.label} — event flow (derived)`,
      contextId: ctx,
      summary: (mc && mc.props.purpose) || `How work moves through ${wall.label} — derived from the recorded use cases, requirements and contracts.`,
      nodes,
    });
  }

  if (typeof window !== 'undefined') {
    window.__DERIVED_FLOWS_BY_CTX__ = Object.fromEntries(flows.map(f => [f.contextId, f.id]));
  }
  return flows;
}
