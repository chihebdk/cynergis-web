/* ============================================================
   D-130 — the generic product projector.
   D-106 hand-projected ClaimsCore's lifecycle graph into the PRD
   grammar (__PRD4__) and D-105 hand-projected its walls into the
   Design element (__DDD__.byProduct). The other ten products had
   full graphs since D-113 (audited D-129) but EMPTY pages. This
   module derives BOTH shapes for every v4 product that lacks a
   hand entry — same joins, zero new facts: everything below reads
   the derived graphs in window.__KG4__. ClaimsCore's hand-tuned
   entries are kept (the projector is additive).
   ============================================================ */
import './kg-v4.gen';
import './prd-data';
import './ddd-data';
import { buildDerivedFlows } from '../flow/derived-flows';

(function () {
  const K4 = typeof window !== 'undefined' && window.__KG4__;
  if (!K4 || !K4.org || !K4.products) return;
  buildDerivedFlows();   // D-131: sets window.__DERIVED_FLOWS_BY_CTX__ at boot (the adapter re-seeds lazily)

  const wrap = g => {
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    const byLocal = new Map(g.nodes.map(n => [n.localId, n]));
    const out = (id, t) => g.edges.filter(e => e.from === id && (!t || e.type === t));
    const inn = (id, t) => g.edges.filter(e => e.to === id && (!t || e.type === t));
    const nodes = t => g.nodes.filter(n => n.type === t);
    return { g, byId, byLocal, out, inn, nodes };
  };
  const org = wrap(K4.org);
  const members = {};
  for (const mg of Object.values(K4.members || {})) {
    const w = wrap(mg);
    const d = w.nodes('Domain')[0];
    if (d) members[d.localId] = w;
  }

  const ctxDomain = new Map();   // CTX localId -> org Domain node
  for (const e of K4.org.edges) if (e.type === 'contains') {
    const d = org.byId.get(e.from), c = org.byId.get(e.to);
    if (d && c && d.type === 'Domain') ctxDomain.set(c.localId, d);
  }

  const gherkin = txt => {
    const out = { given: [], when: [], then: [] };
    let cur = null;
    for (const raw of String(txt || '').split('\n')) {
      const l = raw.trim();
      if (/^given/i.test(l)) { cur = 'given'; out.given.push(l.replace(/^given\s*/i, '')); }
      else if (/^when/i.test(l)) { cur = 'when'; out.when.push(l.replace(/^when\s*/i, '')); }
      else if (/^then/i.test(l)) { cur = 'then'; out.then.push(l.replace(/^then\s*/i, '')); }
      else if (/^and/i.test(l) && cur) out[cur].push(l.replace(/^and\s*/i, ''));
      else if (l && cur) out[cur].push(l);
    }
    return out;
  };
  const first = s => String(s || '').split(/(?<=\.)\s/)[0];

  for (const [ns, pg] of Object.entries(K4.products)) {
    const P = wrap(pg);
    const prod = P.nodes('Product')[0];
    if (!prod) continue;
    const pid = (prod.props.orgRef || '').split(':').pop() || prod.localId;
    const orgProd = org.byLocal.get(pid);
    const pp = prod.props;

    /* the walls this product packages, their member graphs and org domain */
    const walls = orgProd ? org.out(orgProd.id, 'packages').map(e => org.byId.get(e.to)).filter(Boolean) : [];
    const homeDom = walls.length ? ctxDomain.get(walls[0].localId) : null;
    const member = homeDom ? members[homeDom.localId] : null;

    const scs = P.nodes('SuccessMetric');
    const vds = P.nodes('ValueDriver');
    const personas = P.nodes('Persona');
    const ucs = P.nodes('UseCase');
    const frs = P.nodes('FunctionalRequirement');
    const comps = P.nodes('Component');
    const ats = P.nodes('AcceptanceTest');
    const risks = P.nodes('Risk');
    const stakes = P.nodes('Stakeholder');
    const srcs = P.nodes('Source');
    const jrns = P.nodes('Journey');
    const dls = P.nodes('DeliveryItem');
    const nfrs = P.nodes('Nfr');
    const aprs = P.nodes('Approval').filter(a => a.status !== 'superseded');
    const outs = P.nodes('Outcome');
    const learns = P.nodes('Learning');
    const gofwd = P.nodes('Decision').find(d => /go-forward/i.test(d.label));

    const scById = Object.fromEntries(scs.map(n => [n.localId, n]));
    const outBySc = {};
    for (const o of outs) {
      const sc = P.byId.get((P.out(o.id, 'actualizes')[0] || {}).to);
      if (sc) outBySc[sc.localId] = o;
    }
    const frComp = f => P.byId.get((P.inn(f.id, 'implements')[0] || {}).from);
    const frCtx = f => { const c = frComp(f); return c ? P.byId.get((P.out(c.id, 'part_of')[0] || {}).to) : null; };
    const ucFrs = uc => frs.filter(f => P.inn(f.id, 'realizes').some(e => e.from === uc.id));
    const ucVds = uc => P.out(uc.id, 'advances').map(e => P.byId.get(e.to)).filter(Boolean);
    const ucActor = uc => P.byId.get((P.out(uc.id, 'performed_by')[0] || {}).to);
    const atsFor = uc => ats.filter(a => P.out(a.id, 'tests').some(e => e.to === uc.id));
    const cites = n => P.out(n.id, 'cites').map(e => (P.byId.get(e.to) || {}).localId).filter(Boolean);

    /* member-graph depth for a wall — resolved against the wall's OWN domain
       (composite products package contexts across several domains) */
    const dep = ctxLocal => {
      const wallDom = ctxDomain.get(ctxLocal);
      const mw = (wallDom && members[wallDom.localId]) || member;
      if (!mw) return null;
      const c = mw.byLocal.get(ctxLocal);
      if (!c) return null;
      const member_ = mw;
      return depIn(member_, c);
    };
    const depIn = (member, c) => {
      const models = member.nodes('DomainModel').filter(m => member.out(m.id, 'part_of').some(e => e.to === c.id))
        .map(m => ({ node: m, aggregates: member.inn(m.id, 'part_of').map(e => member.byId.get(e.from)) }));
      const contracts = [...member.out(c.id, 'consumes'), ...member.out(c.id, 'publishes_to')]
        .map(e => member.byId.get(e.to)).filter(k => k && k.type === 'Contract')
        .map(k => ({ node: k, counterpart: member.byId.get((member.out(k.id, 'with')[0] || {}).to) }));
      const agents = member.nodes('Agent').filter(a => member.out(a.id, 'serves').some(e => e.to === c.id));
      const oms = member.out(c.id, 'measured_by').map(e => member.byId.get(e.to)).filter(Boolean);
      const team = member.byId.get((member.out(c.id, 'owned_by')[0] || {}).to);
      const apps = member.nodes('Application').filter(a => member.out(a.id, 'implements').some(e => e.to === c.id));
      return { c, models, contracts, agents, oms, team, apps };
    };

    /* ── the PRD projection (additive — hand entries win) ── */
    if (!window.__PRD4__[pid]) {
      const kpiFor = vd => {
        const scId = (vd.props.measuredBy || [])[0];
        const sc = scById[scId]; const o = sc && outBySc[scId];
        return sc ? { current: o ? o.props.current : sc.props.baseline, target: sc.props.target, unit: '', direction: 'toward target' } : null;
      };
      const otherOnWalls = orgProd ? org.nodes('Product').filter(x => x.localId !== pid &&
        org.out(x.id, 'packages').some(e => walls.some(w => w.id === e.to))).map(x => `${x.label} (same wall, separate product)`) : [];
      window.__PRD4__[pid] = {
        productId: pid,
        overview: {
          projectName: `${prod.label} — ${pp.kind || ''}`, author: 'Atlas (derived)', date: '2026-08-19',
          problem: pp.problem, background: pp.bet,
          objectives: vds.map(v => v.props.statement).filter(Boolean),
          vision: pp.bet, differentiator: (walls[0] && member && (dep(walls[0].localId) || {}).c ? (dep(walls[0].localId).c.props.posture || '') : '') || pp.bet,
          targetUsers: personas.map(p => `${p.label} — ${p.props.note || ''}`).join(' · '),
          criteria: scs.map(sc => ({ id: sc.localId, text: sc.props.statement || sc.label, metric: sc.props.target })),
          hypothesis: `${pp.bet || ''} ${pp.valueRollup ? `Ramp truth: ${pp.valueRollup.rampQuarter} (${pp.valueRollup.annualized} of ${pp.valueRollup.target}).` : ''}`,
          exit: {
            decisionRight: homeDom ? `${homeDom.props.owner}, with the quarterly outcome review (evidence in, trade-offs out).` : 'The domain executive.',
            killCriteria: risks.map(r => `${r.label} — ${r.props.note || ''}`),
            reviewCadence: 'Phase-gate review at each lifecycle transition; the domain’s quarterly outcome review governs the envelope.',
          },
        },
        valueDrivers: vds.map(v => ({
          id: v.localId, name: v.label, metric: (v.props.measuredBy || [])[0], weight: +(1 / Math.max(1, vds.length)).toFixed(2),
          measured: !!kpiFor(v), kpi: kpiFor(v) || undefined,
        })),
        portfolio: {
          domain: homeDom ? `${homeDom.label} — ${homeDom.props.valueChainStep || ''}` : '',
          capability: pp.note || pp.kind, valueStream: (jrns[0] || {}).label || '',
          position: pp.bet,
          owners: [
            homeDom && { role: 'Accountable Executive', name: homeDom.props.owner },
            { role: 'Owning team', name: pp.owner },
            ...walls.map(w => { const d = dep(w.localId); return d && d.team ? { role: w.label, name: `${d.team.label} (${d.team.props.size || '—'})` } : null; }),
          ].filter(Boolean),
          dependencies: P.nodes('Contract').map((c, i) => ({
            id: `D${i + 1}`, product: c.label, direction: 'seam', nature: c.props.note || c.props.contractType || '', status: 'Available', notes: c.props.contractType || '',
          })),
          objectives: (() => {
            const obj = P.nodes('Objective')[0];
            if (!obj) return [];
            return [{ id: obj.localId, objective: obj.label, owner: homeDom ? homeDom.props.owner : '', keyResults:
              P.out(obj.id, 'has').map(e => P.byId.get(e.to)).filter(Boolean).map(kr => ({
                id: kr.localId, kr: kr.label, metric: (P.byId.get((P.out(kr.id, 'targets')[0] || {}).to) || {}).localId || '', contribution: '' })) }];
          })(),
        },
        personas: personas.map((p, i) => {
          const myUcs = ucs.filter(u => (ucActor(u) || {}).id === p.id);
          const myVds = [...new Set(myUcs.flatMap(u => ucVds(u)))];
          const myWalls = [...new Set(myUcs.flatMap(u => ucFrs(u).map(f => (frCtx(f) || {}).localId)).filter(Boolean))];
          const apps = myWalls.flatMap(w => ((dep(w) || {}).apps || []).map(a => a.label));
          return {
            id: p.localId, name: p.label, role: p.label, tier: i < 2 ? 'Primary' : 'Secondary',
            situation: p.props.note || '',
            goal: myUcs.map(u => u.label).join('; ') || (jrns[0] || {}).label || '',
            obstacle: first(pp.problem),
            solution: first(pp.bet),
            successMetric: [...new Set(myUcs.flatMap(u => ucVds(u).flatMap(v => v.props.measuredBy || [])))]
              .map(id => (scById[id] || { label: id }).label || id).join(' · '),
            touchpoints: prod.label, tools: apps.join(' · '),
            collaboration: myVds.map(v => v.label).join(' · '),
            frequency: myUcs.length ? `${myUcs.length} use case${myUcs.length === 1 ? '' : 's'} on this product` : '',
            volume: '', permissions: '', authority: '', regulatory: '', quote: '',
          };
        }),
        stakeholders: stakes.map(st => ({ id: st.localId, name: st.label, role: 'Stakeholder', interest: st.props.stake || '' })),
        product: {
          approach: pp.bet,
          inScope: frs.map(f => f.label),
          outScope: otherOnWalls,
          mvp: dls.map(d => d.label),
          growth: gofwd && gofwd.props.options ? [].concat(gofwd.props.options) : learns.map(l => l.label),
          vision: [(P.nodes('Objective')[0] || {}).label].filter(Boolean),
        },
        journeys: jrns.map(j => ({
          id: j.localId, title: j.label, personaId: (personas[0] || {}).localId,
          opening: j.props.note || '', rising: ucs.slice(0, Math.ceil(ucs.length / 2)).map(u => u.label).join(' → '),
          climax: (ucs[Math.max(0, Math.ceil(ucs.length / 2) - 1)] || {}).label || '', resolution: (ucs[ucs.length - 1] || {}).label || '',
          capabilities: comps.map(c => c.label).join(', '),
        })),
        usecases: ucs.map(uc => {
          const fset = ucFrs(uc);
          const myAts = atsFor(uc);
          const parsed = myAts.map(a => ({ a, gw: gherkin(a.props.gherkin) }));
          const wallIds = [...new Set(fset.map(f => (frCtx(f) || {}).localId).filter(Boolean))];
          const supporting = [...new Set(wallIds.flatMap(w => {
            const d = dep(w);
            return d ? d.contracts.filter(k => (k.node.props.dir || '') === 'consumes').map(k => (k.counterpart || {}).label).filter(Boolean) : [];
          }))].join(', ');
          const esc = s => String(s || '').replace(/[\[\]()"{}|]/g, ' ').slice(0, 70).trim();
          const steps = fset.map(f => f.label);
          /* the mermaid workflow: trigger → each realizing FR → the gated outcome */
          const wf = ['flowchart TD', `  T([${esc(uc.props.note || uc.label)}])`];
          let prev = 'T';
          steps.forEach((st, i) => { wf.push(`  ${prev} --> S${i}[${esc(st)}]`); prev = `S${i}`; });
          const thenEnd = parsed[0] && parsed[0].gw.then[0];
          if (thenEnd) wf.push(`  ${prev} --> E([${esc(thenEnd)}])`);
          return {
            id: uc.localId, driverRef: (ucVds(uc)[0] || {}).localId, title: uc.label,
            journeyId: (P.byId.get((P.out(uc.id, 'belongs_to')[0] || {}).to) || {}).localId,
            primaryActor: (ucActor(uc) || {}).localId, supportingActors: supporting,
            frs: fset.map(f => f.localId),
            trigger: uc.props.note || '',
            preconditions: [...new Set(parsed.flatMap(p => p.gw.given))].join('; '),
            postconditions: [...new Set(parsed.flatMap(p => p.gw.then))].join('; '),
            orchestration: steps.join(' → '),
            repeatability: '',
            mainFlow: steps,
            workflow: steps.length ? wf.join('\n') : undefined,
            acceptance: parsed.map(({ a, gw }) => ({ title: `${a.localId} — gated acceptance${a.props.status ? ` · ${a.props.status}` : ''}`, ...gw })),
          };
        }),
        specs: {
          functional: frs.map(f => ({
            id: f.localId, area: (frComp(f) || {}).label || '', text: f.label, traceJ: (jrns[0] || {}).localId,
            traceSC: [...new Set(frs.length ? P.inn(f.id, 'realizes').map(e => P.byId.get(e.from)).filter(Boolean).flatMap(u => ucVds(u).flatMap(v => v.props.measuredBy || [])) : [])][0] || '',
          })),
          nonfunctional: nfrs.map(n => ({ id: n.localId, cat: 'NFR', text: n.label })),
          /* policies = the ops agents' recorded guardrails on the packaged walls */
          policies: walls.flatMap(w => {
            const d = dep(w.localId);
            const ops = d && d.agents.find(a => a.props.kind === 'operations');
            return ops ? (ops.props.guardrails || []).filter(gd => !/D-056/.test(gd)).map((gd, i) => ({
              id: `POL-${w.localId.replace('CTX-', '')}-${i + 1}`, name: gd.split('—')[0].trim(), statement: `${gd} (recorded on ${ops.label}, ${w.label}).`, traceFR: '' })) : [];
          }),
        },
        release: {
          strategy: pp.bet,
          milestones: dls.map((d, i) => ({ id: `M${i + 1}`, name: d.label, date: '2026', status: (d.props.status || '') === 'done' ? 'Done' : (d.props.status || '—'), notes: (P.out(d.id, 'tracks').map(e => (P.byId.get(e.to) || {}).localId).filter(Boolean)).join(', ') })),
        },
        governance: aprs.map(a => ({ id: a.localId, type: a.props.kind || 'Approval', item: a.label, owner: a.props.approver || a.props.requestedBy || '', status: a.props.status === 'approved' ? 'Active' : (a.props.status || ''), notes: a.props.conditions || '' })),
        risk: risks.map(r => ({ id: r.localId, cat: 'Risk', title: r.label, likelihood: '—', impact: '—', mitigation: r.props.note || '', owner: pp.owner })),
        glossary: (() => {
          const terms = [];
          for (const ply of org.nodes('Polyseme'))
            for (const m of ply.props.meanings || [])
              if (m.ref && (walls.some(w => w.localId === m.ref) || (homeDom && m.ref === homeDom.localId)))
                terms.push({ term: `${ply.label} (in ${homeDom ? homeDom.label : m.where})`, definition: m.means });
          for (const w of walls.slice(0, 2)) {
            const d = dep(w.localId);
            if (d) for (const m of d.models) terms.push({ term: m.node.label, definition: m.node.props.invariant || '' });
          }
          return terms;
        })(),
        evidence: {
          sources: srcs.map(s => ({ id: s.localId, name: s.label, type: s.props.sourceType || 'doc', status: 'current', origin: s.props.origin, summary: s.props.summary || '' })),
          cites: (() => {
            const map = {};
            for (const n of [...scs, ...personas, ...jrns, ...ucs]) {
              const cs = cites(n);
              if (cs.length) map[n.localId] = cs;
              else if (srcs.length && (n.type === 'SuccessMetric')) map[n.localId] = [srcs[0].localId];
            }
            return map;
          })(),
        },
      };
    }

    /* ── the Design element projection (additive) ── */
    const DDD = window.__DDD__ && window.__DDD__.byProduct;
    if (DDD && !DDD[pid] && member && walls.length) {
      const builderGuardrails = ['Cannot redraw its own boundary — a system-level call', 'Model and invariant changes need a human gate', 'No production access — the operations profile acts in production'];
      const opsPermissions = ['Role-scoped production MCP — acts + observes only', 'No repository or code access', 'Governance acts stay human (D-056)'];
      const contexts = walls.map(w => {
        const d = dep(w.localId);
        if (!d) return null;
        const builder = d.agents.find(a => a.props.kind === 'builder');
        const ops = d.agents.find(a => a.props.kind === 'operations');
        const myUcs = ucs.filter(u => ucFrs(u).some(f => (frCtx(f) || {}).localId === w.localId));
        const language = d.models.flatMap(m => m.aggregates.map(a => ({ term: a.label.toLowerCase(), def: a.props.def || '' })));
        return {
          id: w.localId, name: w.label, classification: w.props.classification,
          language,
          capabilities: (myUcs.length ? myUcs : ucs).map(u => u.localId),
          note: first(d.c.props.purpose),
          summary: [d.c.props.purpose, d.c.props.posture].filter(Boolean).join(' '),
          needs: d.contracts.filter(k => (k.node.props.dir || '') === 'consumes')
            .map(k => ({ from: (k.counterpart || {}).label || '—', data: k.node.props.mechanism || '' })),
          agent: builder ? {
            name: builder.label, tier: 'PR-gated',
            charter: builder.props.knows || '', does: builder.props.knows || '',
            value: d.oms.map(o => o.label),
            skill: { id: w.localId.toLowerCase().replace('ctx-', '') + '-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/subdomain-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: d.models.map(m => m.node.label),
            composes: ops ? (ops.props.skills || []) : [],
            slice: { aggregates: d.models.reduce((s, m) => s + m.aggregates.length, 0), invariants: d.models.length, events: d.contracts.length, policies: (ops ? (ops.props.guardrails || []).length : 0) },
            sources: srcs.map(s => ({ label: s.label, type: 'doc', href: s.props.origin })),
            assets: [{ kind: 'skill', name: w.localId.toLowerCase().replace('ctx-', '') + '.skill.md', note: 'Charter · language · procedures' }],
            drives: d.apps.map(a => a.label),
            guardrails: builderGuardrails,
          } : null,
          opsAgent: ops ? {
            name: ops.label, asBuilt: ops.localId,
            charter: `Deployed at ${ops.props.tier}${ops.props.tierNote ? ` — ${ops.props.tierNote}` : ''}`,
            permissions: opsPermissions,
          } : null,
        };
      }).filter(Boolean);

      const relations = contexts.flatMap(cx => {
        const d = dep(cx.id);
        return d.contracts.map(k => {
          const consumes = (k.node.props.dir || '') === 'consumes';
          const other = (k.counterpart || {}).label || '—';
          return {
            from: consumes ? other : cx.id, to: consumes ? cx.id : other,
            pattern: k.node.props.pattern || '—', label: k.node.props.mechanism || k.node.label,
            upstream: consumes ? other : cx.id, flow: k.node.props.mechanism || '',
          };
        });
      });

      const skillByRealize = {};
      for (const sk of P.nodes('Skill')) {
        const t = P.out(sk.id, 'realizes')[0];
        if (t) skillByRealize[(P.byId.get(t.to) || {}).localId] = sk;
      }
      const realizations = ucs.map(uc => {
        const fset = ucFrs(uc);
        const cxs = fset.map(f => (frCtx(f) || {}).localId).filter(Boolean);
        const sk = skillByRealize[uc.localId] || fset.map(f => skillByRealize[(frComp(f) || {}).localId]).find(Boolean);
        return {
          ucId: uc.localId, context: cxs[0] || (walls[0] || {}).localId,
          components: [...new Set(fset.map(f => (frComp(f) || {}).localId).filter(Boolean))],
          form: sk ? 'llm-function' : 'code', composition: 'workflow', surface: 'app',
          agency: sk ? ({ Suggest: 'suggests', Assist: 'assisted', Operate: 'automated', Codify: 'codified' }[sk.props.tier] || 'assisted') : 'human-in-loop',
          trigger: uc.props.note || '',
          nodes: fset.map(f => `code · ${f.label}`),
          testStrategy: atsFor(uc).map(a => a.localId).join(', ') || '—',
          rationale: sk ? `${sk.label} carries part of this flow at ${sk.props.tier} — least-agentic that fits; the tier is the recorded delegation level.` : 'Deterministic flow over the wall’s model — no judgment to delegate. Least-agentic that fits.',
          enforces: [],
        };
      });

      /* canvas:false → the Context map / System design pages render the REAL
         typed-seam register (D-105); the interactive canvas stays authored
         content (ClaimsCore only, D-108) */
      DDD[pid] = { canvas: false, contexts, relations, realizations };
    }
  }
})();
