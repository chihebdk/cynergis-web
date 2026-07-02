import React from 'react';
import './trace-core';
const { Ref, RelationshipPanel, MermaidView } = window;
/* ============================================================
   Cynergis — Traceability detail bodies (window.renderEntityDetail).
   Given an indexed record + helpers (Ref, RelationshipPanel,
   MermaidView…), render a typed detail body. The RelationshipPanel
   at the foot of every body surfaces the COMPLETE bidirectional
   trace graph for that entity, so navigation is end-to-end.
   ============================================================ */
(function () {
  /* primitives */
  function DRow({ k, children }) {
    if (children == null || children === '') return null;
    return <div className="tr-drow"><div className="tr-dk">{k}</div><div className="tr-dv">{children}</div></div>;
  }
  function DList({ items }) {
    return <ul className="tr-dlist">{(items || []).map((x, i) => <li key={i}>{x}</li>)}</ul>;
  }
  function Pill({ tone, children }) { return <span className={'tr-pill' + (tone ? ' ' + tone : '')}>{children}</span>; }
  function SecLabel({ children }) { return <div className="tr-seclabel">{children}</div>; }

  const tone = {
    Success: 'ok', Failure: 'bad', Accepted: 'ok', Proposed: 'warn', Superseded: 'bad', Deprecated: 'bad',
    Active: 'ok', Decided: 'info', High: 'bad', Medium: 'warn', Low: 'ok', Available: 'ok',
  };

  /* ---- use-case detail, split into tabs so it never needs long-scrolling ---- */
  function UseCaseTabs({ rec, h }) {
    const d = rec.data;
    const { Ref, MermaidView, RelationshipPanel } = h;
    const { useState, useEffect, useRef } = React;

    const Scenario = () => (
      <>
        <DRow k="Trigger">{d.trigger}</DRow>
        <DRow k="Supporting actors">{d.supportingActors}</DRow>
        <DRow k="Orchestration">{d.orchestration}</DRow>
        <DRow k="Preconditions">{d.preconditions}</DRow>
        <DRow k="Postconditions">{d.postconditions}</DRow>
        <SecLabel>Main success scenario</SecLabel>
        <ol className="tr-flow">{(d.mainFlow || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
        {(d.extensions || []).length > 0 && <>
          <SecLabel>Extensions / alternate flows</SecLabel>
          {(d.extensions || []).map((e, i) => <div className="tr-drow" key={i}><div className="tr-dk">{e.at}</div><div className="tr-dv">{e.text}</div></div>)}
        </>}
        {(d.terminalStates || []).length > 0 && <>
          <SecLabel>Terminal states</SecLabel>
          {(d.terminalStates || []).map((tsx, i) => <div className="tr-drow" key={i}><div className="tr-dk"><Pill tone={tone[tsx.type] || ''}>{tsx.type}</Pill></div><div className="tr-dv">{tsx.text}</div></div>)}
        </>}
      </>
    );

    const Acceptance = () => (
      <>
        {(d.acceptance || []).map((a, i) => (
          <div className="tr-acc" key={i}>
            <div className="tr-acc-t">{a.title}</div>
            {(a.given || []).map((g, j) => <div className="tr-acc-l" key={'g' + j}><b>{j === 0 ? 'Given' : 'and'}</b> {g}</div>)}
            {(a.when || []).map((w, j) => <div className="tr-acc-l" key={'w' + j}><b>{j === 0 ? 'When' : 'and'}</b> {w}</div>)}
            {(a.then || []).map((th, j) => <div className="tr-acc-l" key={'t' + j}><b>{j === 0 ? 'Then' : 'and'}</b> {th}</div>)}
          </div>
        ))}
      </>
    );

    const tabs = [{ key: 'scenario', label: 'Scenario', render: Scenario }];
    if (d.workflow) tabs.push({ key: 'workflow', label: 'Workflow', render: () => <MermaidView code={d.workflow} /> });
    if ((d.acceptance || []).length > 0) tabs.push({ key: 'acceptance', label: 'Acceptance', render: Acceptance });
    tabs.push({ key: 'trace', label: 'Traceability', render: () => <RelationshipPanel id={rec.id} /> });

    const [active, setActive] = useState(tabs[0].key);
    const wrapRef = useRef(null);
    useEffect(() => { const sc = wrapRef.current && wrapRef.current.closest('.tr-modal-body'); if (sc) sc.scrollTop = 0; }, [active]);
    const cur = tabs.find(t => t.key === active) || tabs[0];

    return (
      <div className="tr-uc" ref={wrapRef}>
        <div className="tr-uctabs" role="tablist">
          {tabs.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={t.key === active}
              className={'tr-uctab' + (t.key === active ? ' on' : '')} onClick={() => setActive(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="tr-uctab-panel" role="tabpanel">{cur.render()}</div>
      </div>
    );
  }

  function body(rec, h) {
    const d = rec.data;
    const { Ref, MermaidView, RelationshipPanel } = h;
    const Rel = () => <RelationshipPanel id={rec.id} />;

    switch (rec.kind) {
      case 'sc':
        return <><DRow k="Criterion">{d.text}</DRow><DRow k="Target">{d.metric && <Pill tone="info">{d.metric}</Pill>}</DRow><Rel /></>;

      case 'objective':
        return <>
          <DRow k="Objective">{d.objective}</DRow><DRow k="Owner">{d.owner}</DRow>
          {(d.keyResults || []).length > 0 && <>
            <SecLabel>Key results</SecLabel>
            {(d.keyResults || []).map(k => <div className="tr-drow" key={k.id}><div className="tr-dk"><Ref id={k.id} /></div><div className="tr-dv">{k.kr}{k.metric && <> · <Ref id={k.metric} /></>}</div></div>)}
          </>}
          <Rel />
        </>;

      case 'kr':
        return <><DRow k="Key result">{d.kr}</DRow><DRow k="Contribution">{d.contribution}</DRow><DRow k="Metric">{d.metric && <Ref id={d.metric} />}</DRow><Rel /></>;

      case 'dependency':
        return <>
          <DRow k="Product">{d.product}</DRow>
          <DRow k="Direction"><Pill tone={d.direction === 'upstream' ? 'info' : 'warn'}>{d.direction}</Pill></DRow>
          <DRow k="Status"><Pill tone={tone[d.status] || ''}>{d.status}</Pill></DRow>
          <DRow k="Nature">{d.nature}</DRow><DRow k="Notes">{d.notes}</DRow><Rel />
        </>;

      case 'persona':
        return <>
          <div className="tr-persona-top"><Pill>{d.role}</Pill>{d.tier && <Pill tone="info">{d.tier}</Pill>}</div>
          {d.quote && <div className="tr-quote">“{d.quote}”</div>}
          <SecLabel>Story</SecLabel>
          <DRow k="Situation">{d.situation}</DRow><DRow k="Goal">{d.goal}</DRow><DRow k="Obstacle">{d.obstacle}</DRow>
          <DRow k="Solution">{d.solution}</DRow><DRow k="Success metric">{d.successMetric}</DRow>
          <SecLabel>How they work</SecLabel>
          <DRow k="Authority">{d.authority}</DRow><DRow k="Permissions">{d.permissions}</DRow>
          <DRow k="Frequency">{d.frequency}</DRow><DRow k="Volume">{d.volume}</DRow>
          <DRow k="Touchpoints">{d.touchpoints}</DRow><DRow k="Tools">{d.tools}</DRow><DRow k="Regulatory">{d.regulatory}</DRow>
          <Rel />
        </>;

      case 'stakeholder':
        return <><DRow k="Role">{d.role}</DRow><DRow k="Interest">{d.interest}</DRow><Rel /></>;

      case 'journey':
        return <>
          <SecLabel>Story arc</SecLabel>
          <DRow k="Opening">{d.opening}</DRow><DRow k="Rising">{d.rising}</DRow>
          <DRow k="Climax">{d.climax}</DRow><DRow k="Resolution">{d.resolution}</DRow>
          {d.capabilities && <DRow k="Capabilities">{d.capabilities}</DRow>}
          <Rel />
        </>;

      case 'usecase':
        return <UseCaseTabs rec={rec} h={h} />;

      case 'risk':
        return <>
          <DRow k="Category"><Pill>{d.cat}</Pill></DRow>
          <DRow k="Likelihood"><Pill tone={tone[d.likelihood] || ''}>{d.likelihood}</Pill></DRow>
          <DRow k="Impact"><Pill tone={tone[d.impact] || ''}>{d.impact}</Pill></DRow>
          <DRow k="Mitigation">{d.mitigation}</DRow><DRow k="Owner">{d.owner}</DRow><Rel />
        </>;

      case 'fr':
        return <><DRow k="Area"><Pill>{d.area}</Pill></DRow><DRow k="Requirement">{d.text}</DRow><Rel /></>;

      case 'nfr':
        return <><DRow k="Category"><Pill>{d.cat}</Pill></DRow><DRow k="Statement">{d.text}</DRow><Rel /></>;

      case 'policy':
        return <><DRow k="Statement">{d.statement}</DRow><Rel /></>;

      case 'governance':
        return <>
          <DRow k="Type"><Pill>{d.type}</Pill></DRow><DRow k="Owner">{d.owner}</DRow>
          <DRow k="Status"><Pill tone={tone[d.status] || ''}>{d.status}</Pill></DRow>
          <DRow k="Notes">{d.notes}</DRow><Rel />
        </>;

      case 'security':
        return <><DRow k="Control">{d.control}</DRow><DRow k="Approach">{d.approach}</DRow><Rel /></>;

      case 'adr':
        return <>
          <div className="tr-persona-top"><Pill tone={tone[d.status] || ''}>{d.status}</Pill><Pill>{d.cat}</Pill></div>
          <DRow k="Rationale">{d.rationale}</DRow><DRow k="Alternatives">{d.alternatives}</DRow>
          <DRow k="Consequences">{d.consequences}</DRow><Rel />
        </>;

      case 'component':
        return <>
          <DRow k="Subdomain"><Pill>{d.domain}</Pill></DRow>
          <DRow k="Overview">{d.overview}</DRow>
          {(d.trigger || []).length > 0 && <>
            <SecLabel>Entry points (triggers)</SecLabel>
            {(d.trigger || []).map((t, i) => <div className="tr-drow" key={i}><div className="tr-dk"><Pill tone="info">{t.type}</Pill></div><div className="tr-dv">{t.name || t.action}{t.source && <span className="tr-dim"> · from {t.source}</span>}{t.actor && <span className="tr-dim"> · {t.actor}</span>}{t.schema && <div className="tr-code-sm"><code>{t.schema}</code></div>}{t.why && <div className="tr-dim">{t.why}</div>}</div></div>)}
          </>}
          {(d.command || []).length > 0 && <><SecLabel>Commands</SecLabel><DList items={(d.command || []).map(c => c.command)} /></>}
          {(d.businessRules || []).length > 0 && <>
            <SecLabel>Business rules</SecLabel>
            {(d.businessRules || []).map((b, i) => <div className="tr-drow" key={i}><div className="tr-dk">{b.ref && <Ref id={b.ref} />}</div><div className="tr-dv">{b.rule}</div></div>)}
          </>}
          {(d.readModel || []).length > 0 && <>
            <SecLabel>Reads</SecLabel>
            {(d.readModel || []).map((r, i) => <div className="tr-drow" key={i}><div className="tr-dk"><Pill>{r.type}</Pill></div><div className="tr-dv">{r.table || r.api || ''}{(r.table || r.api) && r.desc ? ' — ' : ''}{r.desc}</div></div>)}
          </>}
          {(d.writeModel || []).length > 0 && <>
            <SecLabel>Writes</SecLabel>
            {(d.writeModel || []).map((w, i) => <div className="tr-drow" key={i}><div className="tr-dk"><Pill>{w.type}</Pill></div><div className="tr-dv">{w.table || w.queue || ''}{(w.table || w.queue) && w.desc ? ' — ' : ''}{w.desc}</div></div>)}
          </>}
          {(d.resource || []).length > 0 && <>
            <SecLabel>Resources</SecLabel>
            <div className="tr-chiprow">{(d.resource || []).map(r => <Ref id={r} key={r} />)}</div>
          </>}
          {(d.dependency || []).length > 0 && <>
            <SecLabel>Dependencies</SecLabel>
            {(d.dependency || []).map((dep, i) => <div className="tr-drow" key={i}><div className="tr-dk"><Ref id={dep.ref} /></div><div className="tr-dv">{dep.note}</div></div>)}
          </>}
          {d.code && <>
            <SecLabel>Code</SecLabel>
            <DRow k="Path"><code className="tr-code">{d.code.path}</code></DRow>
            <DRow k="Tests">{d.code.tests}{d.code.coverage && <span className="tr-dim"> · {d.code.coverage} coverage</span>}</DRow>
            <DRow k="Owners">{d.code.owners}</DRow>
          </>}
          {(d.hotspot || []).length > 0 && <>
            <SecLabel>Hotspots</SecLabel>
            {(d.hotspot || []).map((m, i) => <div className="tr-hot" key={i}><Pill tone="warn">{m.level}</Pill> {m.text}</div>)}
          </>}
          <Rel />
        </>;

      case 'schema':
        return <>
          <div className="tr-persona-top"><Pill>{d.kind}</Pill><Pill tone="info">v{d.version}</Pill>{d.ownedBy && <Ref id={d.ownedBy} />}</div>
          {(d.fields || []).length > 0 && <>
            <SecLabel>Fields</SecLabel>
            <table className="tr-table"><tbody>{(d.fields || []).map((f, i) => <tr key={i}><td>{f.name}</td><td>{f.type}</td></tr>)}</tbody></table>
          </>}
          <SecLabel>Producers → consumers</SecLabel>
          <div className="tr-drow"><div className="tr-dk">Producers</div><div className="tr-dv tr-chiprow">{(d.producers || []).map(p => <Ref id={p} key={p} />)}</div></div>
          <div className="tr-drow"><div className="tr-dk">Consumers</div><div className="tr-dv tr-chiprow">{(d.consumers || []).length ? (d.consumers || []).map(c => <Ref id={c} key={c} />) : <Pill tone="warn">no consumers registered</Pill>}</div></div>
          <Rel />
        </>;

      case 'secret':
        return <>
          <div className="tr-persona-top"><Pill>{d.kind}</Pill><Pill tone="info">{d.manager}</Pill></div>
          <DRow k="Path"><code className="tr-code">{d.pathHint}</code></DRow>
          <DRow k="Rotation">{d.rotation}</DRow>
          <DRow k="Environments">{(d.environments || []).join(' · ')}</DRow>
          <DRow k="Used by"><span className="tr-chiprow">{(d.usedBy || []).map(u => <Ref id={u} key={u} />)}</span></DRow>
          <Rel />
        </>;

      case 'integration':
        return <>
          <DRow k="Direction"><Pill tone="info">{d.direction}</Pill></DRow>
          <DRow k="Protocol">{d.protocol}</DRow><DRow k="Data">{d.data}</DRow>
          <DRow k="Auth">{d.auth}</DRow><DRow k="Notes">{d.notes}</DRow><Rel />
        </>;

      case 'api':
        return <>
          <DRow k="Endpoint"><code className="tr-code">{d.method} {d.path}</code></DRow>
          <DRow k="Purpose">{d.purpose}</DRow><DRow k="Errors">{d.errors}</DRow><Rel />
        </>;

      case 'resource':
        return <>
          <div className="tr-persona-top"><Pill>{d.cat}</Pill><Pill tone="info">{d.engine}</Pill></div>
          <DRow k="Description">{d.desc}</DRow>
          {(d.config || []).length > 0 && <>
            <SecLabel>Configuration</SecLabel>
            <table className="tr-table"><tbody>{(d.config || []).map((c, i) => <tr key={i}><td>{c.k}</td><td>{c.v}</td></tr>)}</tbody></table>
          </>}
          <Rel />
        </>;

      default:
        return <><div className="tr-dv">{rec.label}</div><Rel /></>;
    }
  }

  window.renderEntityDetail = body;
})();
