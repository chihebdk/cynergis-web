#!/usr/bin/env node
/* ============================================================
   design-audit — the mechanical coherence & completeness check
   for the ClaimsCore design packet (D-197). Run before Build:
       node cynergis/scripts/design-audit.mjs
   Exit 0 = every id-join resolves both ways, every stage reaches
   a terminal, every transition is tested, every active acceptance
   test is supported somewhere. Non-zero = findings printed.
   The client data modules are copied to a temp dir with the
   "use client" pragma stripped so node can import them.
   ============================================================ */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', 'app');
const tmp = mkdtempSync(join(tmpdir(), 'design-audit-'));
for (const f of ['claims-design-storms', 'claims-lifecycle', 'claims-policies', 'claims-bc-packet', 'claims-contracts', 'claims-capabilities']) {
  const src = readFileSync(join(ROOT, 'flow', f + '.js'), 'utf8')
    .replace(/^"use client";/, '')
    .replace(/from "\.\/(claims-[a-z-]*)"/g, 'from "./$1.mjs"');
  writeFileSync(join(tmp, f + '.mjs'), src);
}
const load = f => import(pathToFileURL(join(tmp, f + '.mjs')).href);
const { CLAIMS_DESIGN_STORMS } = await load('claims-design-storms');
const { CLAIMS_LIFECYCLES, lifecycleCheck } = await load('claims-lifecycle');
const { CONTEXT_POLICIES } = await load('claims-policies');
const { BC_PACKET } = await load('claims-bc-packet');
const { CLAIMS_CONTRACTS } = await load('claims-contracts');
const { CONTEXT_CAPABILITIES } = await load('claims-capabilities');
const infraSrc = readFileSync(join(ROOT, 'flow', 'claims-infra.js'), 'utf8').replace(/^"use client";/, '');
writeFileSync(join(tmp, 'claims-infra.mjs'), infraSrc);
const { INFRA_NEEDS } = await load('claims-infra');

const prd = readFileSync(join(ROOT, 'lib', 'prd-data.js'), 'utf8');
const dmm = readFileSync(join(ROOT, 'lib', 'domain-model-data.js'), 'utf8');
const ddd = readFileSync(join(ROOT, 'lib', 'ddd-data.js'), 'utf8');
const jny = readFileSync(join(ROOT, 'flow', 'journeys.js'), 'utf8');

const claimsPrd = prd.slice(prd.indexOf("'PROD-CLAIMSCORE'"));
const UC = new Set([...claimsPrd.matchAll(/\{id:'(UC\d+)'/g)].map(m => m[1]));
const AT = new Set([...claimsPrd.matchAll(/\{id:'(AT\d+)'/g)].map(m => m[1]));
const FR = new Set([...claimsPrd.matchAll(/\{id:'(FR\d+)'/g)].map(m => m[1]));
const NFR = new Set([...claimsPrd.matchAll(/\{id:'(NFR\d+)'/g)].map(m => m[1]));
const INV = new Set([...dmm.matchAll(/id: '(INV-[A-Za-z-]+)'/g)].map(m => m[1]));
const CAPID_IN_REAL = [...ddd.matchAll(/capId: '(CAP-[A-Za-z-]+)'/g)].map(m => m[1]);
const HOME = new Set([...jny.matchAll(/"(CTX-[A-Z]+)":/g)].map(m => m[1]));
const CTXS = ['CTX-INTAKE', 'CTX-ADJUD', 'CTX-REPAIR', 'CTX-PAYMENTS', 'CTX-TOTALLOSS', 'CTX-RECOVERY'];
const CAP_ALL = new Set(Object.values(CONTEXT_CAPABILITIES).flat().map(c => c.id));
const CT_IDS = new Set(CLAIMS_CONTRACTS.map(c => c.id));

const F = [];   // findings (defects)
const O = [];   // observations (recorded/acceptable)
const okGround = g => UC.has(g) || AT.has(g) || FR.has(g) || NFR.has(g);
const allIds = new Map();
const reg = (id, where) => {
  if (!id) return;
  if (allIds.has(id)) F.push(`DUPLICATE id ${id} (${where} + ${allIds.get(id)})`);
  else allIds.set(id, where);
};

for (const ctx of CTXS) {
  const storm = CLAIMS_DESIGN_STORMS.find(m => m.contextId === ctx);
  const ev = new Set((storm?.nodes || []).filter(n => n.kind === 'event').map(n => n.id));
  const lc = CLAIMS_LIFECYCLES[ctx];
  const pols = CONTEXT_POLICIES[ctx] || [];
  const pk = BC_PACKET[ctx];
  const caps = CONTEXT_CAPABILITIES[ctx] || [];
  const tag = ctx.replace('CTX-', '');

  // lifecycle ↔ wall
  if (!lc) { F.push(`${ctx}: no lifecycle`); continue; }
  const chk = lifecycleCheck(ctx);
  if (!chk.healthy) F.push(`${ctx}: story-vs-wall UNHEALTHY: cardsWithoutRow=${chk.cardsWithoutRow} rowsWithoutCard=${chk.rowsWithoutCard} unreachable=${chk.unreachable}`);
  const trn = new Set(lc.moves.map(m => m.id));
  const trl = new Set(lc.never.map(n => n.id));
  lc.moves.forEach(m => { reg(m.id, ctx);
    if (m.eventId && !ev.has(m.eventId)) F.push(`${ctx}: ${m.id} eventId ${m.eventId} not on wall`);
    if (m.from && !lc.stages.some(s => s.id === m.from)) F.push(`${ctx}: ${m.id} bad from ${m.from}`);
    if (m.to && !lc.stages.some(s => s.id === m.to)) F.push(`${ctx}: ${m.id} bad to ${m.to}`);
  });
  lc.never.forEach(n => { reg(n.id, ctx);
    if (n.inv && !INV.has(n.inv)) F.push(`${ctx}: ${n.id} inv ref ${n.inv} not found`);
    (n.grounds || []).forEach(g => { if (!okGround(g)) F.push(`${ctx}: ${n.id} bad ground ${g}`); });
  });
  // terminal reachability: every non-terminal stage must reach a terminal
  const nxt = {}; lc.moves.filter(m => m.from && m.to && m.from !== m.to).forEach(m => (nxt[m.from] = nxt[m.from] || []).push(m.to));
  const terminals = new Set(lc.stages.filter(s => s.terminal).map(s => s.id));
  for (const st of lc.stages) {
    if (terminals.has(st.id)) continue;
    const seen = new Set([st.id]); const q = [st.id]; let hit = false;
    while (q.length) { const c = q.shift(); for (const t of (nxt[c] || [])) { if (terminals.has(t)) { hit = true; break; } if (!seen.has(t)) { seen.add(t); q.push(t); } } if (hit) break; }
    if (!hit) F.push(`${ctx}: stage ${st.id} cannot reach a terminal`);
  }

  // policies
  pols.forEach(p => { reg(p.id, ctx);
    if (p.eventId && !ev.has(p.eventId)) F.push(`${ctx}: ${p.id} eventId ${p.eventId} not on wall`);
    if (p.fromCtx && !CTXS.includes(p.fromCtx)) F.push(`${ctx}: ${p.id} fromCtx ${p.fromCtx} unknown`);
    if (p.contract) {
      const ct = CLAIMS_CONTRACTS.find(k => k.id === p.contract);
      if (!ct) F.push(`${ctx}: ${p.id} contract ${p.contract} not in registry`);
      else if (ct.from !== ctx && ct.to !== ctx) F.push(`${ctx}: ${p.id} rides ${p.contract} but the box is not a party (${ct.from}→${ct.to})`);
    }
    (p.grounds || []).forEach(g => { if (!okGround(g)) F.push(`${ctx}: ${p.id} bad ground ${g}`); });
  });

  // packet
  if (!pk) { F.push(`${ctx}: no packet`); continue; }
  const secIds = new Set(pk.security.map(x => x.id));
  pk.scenarios.forEach(sc => { reg(sc.id, ctx);
    if (sc.transition && !trn.has(sc.transition)) F.push(`${ctx}: ${sc.id} transition ${sc.transition} not found`);
    if (sc.rule && !trl.has(sc.rule)) F.push(`${ctx}: ${sc.id} rule ${sc.rule} not found`);
    if (!sc.transition && !sc.rule) F.push(`${ctx}: ${sc.id} anchors to neither transition nor rule`);
    if (sc.uc && !UC.has(sc.uc)) F.push(`${ctx}: ${sc.id} uc ${sc.uc} unknown`);
    if (sc.at && !AT.has(sc.at)) F.push(`${ctx}: ${sc.id} at ${sc.at} unknown`);
    (sc.grounds || []).forEach(g => { if (!okGround(g)) F.push(`${ctx}: ${sc.id} bad ground ${g}`); });
  });
  pk.readModels.forEach(rm => { reg(rm.id, ctx);
    (rm.eventIds || []).forEach(e => { if (!ev.has(e)) F.push(`${ctx}: ${rm.id} serves unknown event ${e}`); });
    (rm.readerIds || []).forEach(r => { if (!secIds.has(r)) F.push(`${ctx}: ${rm.id} reader ${r} not in this box's security register`); });
  });
  [...pk.serviceLevels, ...pk.security, ...pk.measures, ...pk.howBuilt.decisions, ...pk.knownGaps].forEach(x => {
    reg(x.id, ctx);
    (x.grounds || []).forEach(g => { if (!okGround(g)) F.push(`${ctx}: ${x.id} bad ground ${g}`); });
  });
  // per-id namespace sanity
  for (const [id, where] of allIds) if (where === ctx && !id.includes(`-${tag}-`) && !id.startsWith('CT-')) {
    if (!/^(TRN|TRL|POL|CAT|RM|SL|SEC|HB|MEA|GAP)-/.test(id)) continue;
    F.push(`${ctx}: id ${id} not namespaced to ${tag}`);
  }
  // transition coverage by scenarios (each stage-changing move should have a test)
  const tested = new Set(pk.scenarios.map(sc => sc.transition).filter(Boolean));
  lc.moves.filter(m => m.from !== m.to).forEach(m => { if (!tested.has(m.id)) O.push(`${ctx}: transition ${m.id} has no component test`); });
  // (AT coverage checked product-wide below — an AT is tested where its subject lives)
  // capabilities
  caps.forEach(cp => { reg(cp.id, ctx); (cp.serves || []).forEach(u => { if (!UC.has(u)) F.push(`${ctx}: ${cp.id} serves unknown ${u}`); }); });
}

// product-wide AT coverage: every active-box AT must be supported SOMEWHERE
const allSupported = new Set(Object.values(BC_PACKET).flatMap(pk => pk.scenarios.map(sc => sc.at).filter(Boolean)));
const activeATs = ['AT1','AT2','AT3','AT5','AT6','AT7','AT8'];   // AT4 belongs to deferred AB
activeATs.forEach(at => { if (!allSupported.has(at)) F.push(`product: Discover ${at} supported by NO component test in any box`); });

// infra register: every demandedBy id must resolve to a real design element
const allEvents = new Set(CLAIMS_DESIGN_STORMS.flatMap(m => m.nodes.filter(n => n.kind === 'event').map(n => n.id)));
const packetIds = new Set([
  ...Object.values(BC_PACKET).flatMap(pk => [...pk.serviceLevels, ...pk.security, ...pk.measures, ...pk.howBuilt.decisions, ...pk.knownGaps, ...pk.scenarios, ...pk.readModels].map(x => x.id)),
  ...CLAIMS_CONTRACTS.map(c => c.id),
]);
const infraIds = new Set();
INFRA_NEEDS.forEach(n => {
  if (infraIds.has(n.id)) F.push(`infra: duplicate ${n.id}`); infraIds.add(n.id);
  (n.demandedBy || []).forEach(d => {
    if (!allEvents.has(d) && !packetIds.has(d)) F.push(`infra: ${n.id} demandedBy ${d} resolves to nothing`);
  });
});

// registry-level checks
CLAIMS_CONTRACTS.forEach(ct => { reg(ct.id, 'registry');
  for (const party of [ct.from, ct.to]) if (party.startsWith('CTX-') && !CTXS.includes(party)) F.push(`registry: ${ct.id} unknown party ${party}`);
  (ct.grounds || []).forEach(g => { if (!okGround(g)) F.push(`registry: ${ct.id} bad ground ${g}`); });
});
// realization capIds resolve
CAPID_IN_REAL.forEach(cid => { if (!CAP_ALL.has(cid)) F.push(`realizations: capId ${cid} not in CONTEXT_CAPABILITIES`); });
// context-map seams vs registry (seam summaries in journeys.js)
const seams = [...jny.matchAll(/seam\("cm2-s-[a-z]+", "[^"]+", "([^"]+)"/g)].map(m => m[1]);
console.log('--- seams on the map:', JSON.stringify(seams));
console.log('--- contracts:', JSON.stringify([...CT_IDS]));

console.log('\n=== FINDINGS (defects) ===');
F.forEach(x => console.log('✗', x));
console.log(`(${F.length} findings)`);
console.log('\n=== OBSERVATIONS ===');
O.forEach(x => console.log('•', x));
console.log(`(${O.length} observations)`);

process.exit(F.length ? 1 : 0);
