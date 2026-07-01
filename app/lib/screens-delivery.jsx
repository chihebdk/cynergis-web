import React from 'react';
import './trace-core';
import './delivery-data';
const { Ref: DRef } = window;

/* ============================================================
   Cynergis — Delivery / "Manage" board (cross-cutting surface, D-025).
   The Jira-like execution view that runs ACROSS phases: teams,
   schedule, milestones, live status, and first-class BLOCKERS
   (waiting-on). Driven by window.__DELIVERY__ — a saved query over
   the same knowledge graph; use-case ids render as <Ref> chips that
   open the universal entity modal, so the board is wired into the KG.
   ============================================================ */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

const DPico = ({ d, w = 14 }) => (
  <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const DI = {
  board:   <path d="M2 2v12h12M5 11V7M8.5 11V4.5M12 11V8.5" />,
  block:   <path d="M8 1.5 1.5 8 8 14.5 14.5 8zM8 5v3.5M8 11h.01" />,
  team:    <path d="M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4M2 13c0-2 1.6-3.2 3.5-3.2S9 11 9 13M11 4.2a2 2 0 0 1 0 3.6M11.5 9.6c1.6.2 2.5 1.4 2.5 3.4" />,
  flag:    <path d="M3.5 14V2.5M3.5 3h8l-1.6 2.4L11.5 8h-8" />,
  clock:   <path d="M8 8m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M8 4.5V8l2.3 1.4" />,
  wait:    <path d="M4 2h8M4 14h8M5 2c0 3 6 3.5 6 6s-6 3-6 6M11 2c0 3-6 3.5-6 6s6 3 6 6" />,
};

const STAGE_CLASS = { 'Backlog': 'backlog', 'In flight': 'flight', 'In review': 'review', 'Live': 'live' };
const SEV_CLASS = { high: 'err', medium: 'warn', low: 'info' };

function StatPill({ n, label, tone }) {
  return (
    <div className={'dlv-pill ' + (tone || '')}>
      <span className="dlv-pill-n">{n}</span>
      <span className="dlv-pill-l">{label}</span>
    </div>
  );
}

/* ---- the headline: a blocked use case waiting on something, captured ---- */
function BlockerCard({ b, asOf }) {
  const waited = daysBetween(b.since, asOf);
  const eta = daysBetween(asOf, b.expected);
  return (
    <div className={'dlv-blk ' + (SEV_CLASS[b.severity] || 'warn')}>
      <div className="dlv-blk-top">
        <span className="dlv-blk-icon"><DPico d={DI.block} w={15} /></span>
        <div className="dlv-blk-head">
          <div className="dlv-blk-line">
            <DRef id={b.ucId} />
            <span className="dlv-blk-rel">is blocked — waiting on</span>
            <span className="dlv-blk-on">{b.waitingOn}</span>
            <span className={'dlv-kind ' + b.kind}>{b.kind}</span>
          </div>
          <div className="dlv-blk-meta">
            <span><DPico d={DI.team} w={11} /> {b.owner}</span>
            <span><DPico d={DI.clock} w={11} /> blocked {waited}d (since {fmtDate(b.since)})</span>
            <span className={eta < 0 ? 'overdue' : ''}>
              <DPico d={DI.wait} w={11} /> {eta < 0 ? `overdue ${-eta}d` : `expected ${fmtDate(b.expected)} (${eta}d)`}
            </span>
          </div>
        </div>
      </div>
      <p className="dlv-blk-detail">{b.detail}</p>
    </div>
  );
}

/* ---- a delivery item card on the board ---- */
function ItemCard({ it, team, blocker }) {
  return (
    <div className={'dlv-card' + (blocker ? ' is-blocked' : '')}>
      <div className="dlv-card-top">
        <DRef id={it.ucId} />
        {blocker && <span className="dlv-badge err"><DPico d={DI.block} w={10} /> Blocked</span>}
      </div>
      <div className="dlv-card-note">{it.note}</div>
      {it.stage !== 'Backlog' && (
        <div className="dlv-prog"><div className="dlv-prog-bar" style={{ width: it.progress + '%' }} /></div>
      )}
      <div className="dlv-card-foot">
        <span className="dlv-team-chip">{team ? team.name : '—'}</span>
        <span className="dlv-target"><DPico d={DI.clock} w={11} /> {fmtDate(it.target)}</span>
      </div>
    </div>
  );
}

function ProductDelivery({ product, prd }) {
  const D = (window.__DELIVERY__ && window.__DELIVERY__.byProduct[product.id]) || null;
  if (!prd || !D) {
    return (
      <div className="asc-page">
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Delivery</div></div>
          <div className="dlv-empty">No delivery plan yet. The Manage board appears once a product enters Build planning.</div>
        </div>
      </div>
    );
  }
  const asOf = window.__DELIVERY__.asOf;
  const teamById = id => D.teams.find(t => t.id === id);
  const blockerFor = ucId => D.blockers.find(b => b.ucId === ucId);
  const count = stage => D.items.filter(i => i.stage === stage).length;

  return (
    <div className="asc-page dlv-wrap">
      {/* header + live status summary */}
      <div className="dlv-head">
        <div>
          <div className="dlv-eyebrow"><DPico d={DI.board} w={12} /> MANAGE · DELIVERY BOARD</div>
          <h2 className="dlv-title">Where everything is, right now</h2>
          <p className="dlv-sub">Execution across phases — teams, schedule, milestones, and what’s blocked. A live query over the product graph.</p>
        </div>
        <div className="dlv-asof"><DPico d={DI.clock} w={12} /> as of {fmtDate(asOf)}</div>
      </div>
      <div className="dlv-stats">
        <StatPill n={count('In flight')} label="In flight" tone="flight" />
        <StatPill n={count('In review')} label="In review" tone="review" />
        <StatPill n={D.blockers.length} label="Blocked" tone="err" />
        <StatPill n={count('Live')} label="Live" tone="live" />
        <StatPill n={D.items.length} label="Use cases" tone="" />
      </div>

      {/* WAITING-ON — the captured blockers */}
      {D.blockers.length > 0 && (
        <div className="asc-section dlv-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DPico d={DI.wait} w={14} /> Waiting on — captured blockers</div>
            <div className="asc-sec-sub">Work we know is paused, why, who owns the unblock, and when we expect it</div>
          </div>
          <div className="dlv-blk-list">
            {D.blockers.map(b => <BlockerCard key={b.id} b={b} asOf={asOf} />)}
          </div>
        </div>
      )}

      {/* BOARD — Jira-like columns */}
      <div className="asc-section dlv-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DPico d={DI.board} w={14} /> Delivery board</div>
          <div className="asc-sec-sub">Every use case by execution stage · {D.items.length} items</div>
        </div>
        <div className="dlv-board">
          {D.stages.map(stage => {
            const items = D.items.filter(i => i.stage === stage);
            return (
              <div className={'dlv-col ' + STAGE_CLASS[stage]} key={stage}>
                <div className="dlv-col-h"><span>{stage}</span><span className="dlv-col-n">{items.length}</span></div>
                <div className="dlv-col-body">
                  {items.length === 0 && <div className="dlv-col-empty">—</div>}
                  {items.map(it => <ItemCard key={it.id} it={it} team={teamById(it.team)} blocker={blockerFor(it.ucId)} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dlv-split">
        {/* TEAMS */}
        <div className="asc-section dlv-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DPico d={DI.team} w={14} /> Teams on it</div>
            <div className="asc-sec-sub">Squads delivering this product</div>
          </div>
          <div className="dlv-teams">
            {D.teams.map(t => {
              const carrying = D.items.filter(i => i.team === t.id && i.stage !== 'Live');
              return (
                <div className="dlv-team" key={t.id}>
                  <div className="dlv-team-h">
                    <div className="dlv-team-nm">{t.name}</div>
                    <div className="dlv-team-cap">{t.capacity}</div>
                  </div>
                  <div className="dlv-team-lead">Lead · {t.lead}</div>
                  <div className="dlv-team-focus">{t.focus}</div>
                  <div className="dlv-team-load">{carrying.length} active {carrying.length === 1 ? 'item' : 'items'}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MILESTONES */}
        <div className="asc-section dlv-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DPico d={DI.flag} w={14} /> Milestones</div>
            <div className="asc-sec-sub">Program checkpoints</div>
          </div>
          <div className="dlv-mstones">
            {D.milestones.map(m => (
              <div className={'dlv-ms ' + m.status} key={m.id}>
                <span className="dlv-ms-dot" />
                <div className="dlv-ms-body">
                  <div className="dlv-ms-label">{m.label}</div>
                  <div className="dlv-ms-meta"><span className="dlv-ms-date">{fmtDate(m.date)}</span><span className={'dlv-ms-st ' + m.status}>{m.status === 'at-risk' ? 'at risk' : m.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ProductDelivery = ProductDelivery;
