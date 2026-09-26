'use client';
/* ============================================================
   THE GUIDED TOUR — engine.
   A demo walkthrough that both NARRATES and DRIVES: each step may
   declare the nav state it needs, and the engine navigates the app
   there through the same entry point the UI's own buttons use
   (window.cynPushUrl / __cynApplyProd), then highlights an element
   and explains it.

   Two rules shape the whole design:
     1 The app stays INTERACTIVE. The dim layer is a giant spread
       box-shadow on the spotlight ring, and every tour surface
       except the card itself is pointer-events:none — so the
       visitor can click the links a step invites them to click.
     2 Progression is MANUAL. Nothing auto-advances; the visitor
       clicks "Next step" when they are done exploring.

   Anchors resolve by VISIBLE TEXT wherever possible (rail items,
   tabs, buttons) rather than by position, because a text match
   survives a rail gaining an entry and an nth-child does not.
   A step whose anchor never appears degrades to a centred card
   instead of stalling the tour.
   ============================================================ */
import React from 'react';
import { TOUR_STEPS } from './tour-steps';

const SEEN_KEY = 'onthos.tour.v1.seen';

/* The deep link is read at IMPORT time, not in an effect: the shell rewrites
   location on mount (cynReplaceUrl) and drops params it does not know, so by
   the time an effect ran the ?tour= would already be gone. */
const BOOT = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const RING_PAD = 6;
const CARD_W = 384;
const GAP = 16;
const FIND_TIMEOUT = 5000;

/* ---------- storage (never throws: private mode, blocked cookies) ---------- */
const seen = {
  get() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } },
  set() { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } },
};

/* ---------- anchor resolution ---------- */
const visible = (el) => {
  if (!el || !el.getClientRects) return false;
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4;   // a collapsed 0x0 node must never win
};

/* Find by visible text among candidates. Exact (trimmed, case-insensitive)
   match wins; otherwise the shortest containing match, which avoids matching
   a whole panel when a label inside it would do. */
function byText(text, within, list) {
  const scope = within ? document.querySelector(within) : document;
  if (!scope) return null;
  if (list) return pickByText(list.filter(visible), text);
  /* The clickable vocabulary of this app: rail entries, tab strips, phase
     segments, and the card primitives (a journey card, a context card and a
     component card are plain divs, so `button, a` alone would miss them). */
  const cands = Array.from(scope.querySelectorAll(
    '.asc-nav, .env-navitem, .env-seg, .asc-tab, .ddd-tab, .dd-iseg-btn, '
    + '.mer-sub, .ddd-ctx, .ddd-cmp-card, .tstx-row, .rlz-opt, .rlz-lever, '
    + 'button, a, [role="tab"], [role="button"]'
  )).filter(visible);
  return pickByText(cands, text);
}

/* exact (trimmed, case-insensitive) match wins; else the shortest containing
   match, so a label beats the whole panel that contains it */
function pickByText(cands, text) {
  const want = text.trim().toLowerCase();
  let best = null;
  for (const el of cands) {
    const t = (el.textContent || '').trim().toLowerCase();
    if (!t) continue;
    if (t === want) return el;
    if (t.includes(want) && (!best || t.length < (best.textContent || '').trim().length)) best = el;
  }
  return best;
}

function resolve(step) {
  if (!step) return null;
  /* sel AND text together is the precise form: "the element matching this
     selector whose text says this" — how a specific card is picked out of a
     grid of identical ones. */
  if (step.sel && step.text) {
    const scope = step.within ? document.querySelector(step.within) : document;
    if (scope) {
      for (const sl of [].concat(step.sel)) {
        const el = byText(step.text, null, Array.from(scope.querySelectorAll(sl)));
        if (el) return el;
      }
    }
  }
  if (step.text) {
    const el = byText(step.text, step.within);
    if (el) return el;
  }
  if (step.sel) {
    const scope = step.within ? document.querySelector(step.within) : document;
    if (scope) {
      for (const s of [].concat(step.sel)) {
        const el = Array.from(scope.querySelectorAll(s)).find(visible);
        if (el) return el;
      }
    }
  }
  return null;
}

/* Wait for an anchor to exist. The app is client-rendered with dynamic
   imports and async canvases, so a step can easily run before its target
   mounts. Resolves with null on timeout — the caller degrades gracefully. */
function waitFor(step, signal) {
  return new Promise((done) => {
    if (!step || (!step.text && !step.sel)) return done(null);
    const found = resolve(step);
    if (found) return done(found);
    let settled = false;
    const finish = (el) => {
      if (settled) return;
      settled = true;
      obs.disconnect(); clearInterval(poll); clearTimeout(bail);
      done(el);
    };
    const look = () => { const el = resolve(step); if (el) finish(el); };
    const obs = new MutationObserver(look);
    obs.observe(document.body, { childList: true, subtree: true });
    const poll = setInterval(look, 120);          // covers pure style/size changes
    const bail = setTimeout(() => finish(null), FIND_TIMEOUT);
    if (signal) signal.addEventListener('abort', () => finish(null), { once: true });
  });
}

/* ---------- navigation ---------- */
/* Drive the app through its OWN deep-link path.
   cynPushUrl writes history and pings subscribers, but the shell keeps its
   view (org / portfolio / product) in React state and only re-reads the URL
   on a history event — so pushing alone re-renders without moving. Replaying
   popstate runs the shell's own handler, which resolves the product, sets the
   view and applies phase/entry/ctx/tab via __cynApplyProd. Same code path as
   a visitor pressing Back, so there is nothing bespoke to keep in sync. */
function navigate(nav) {
  if (!nav || typeof window === 'undefined') return false;
  const cur = window.__cynNav || {};
  const full = { pf: null, prod: null, ctx: null, tab: 'flow', ...nav };
  if (Object.keys(full).every(k => cur[k] === full[k])) return false;
  try {
    window.cynPushUrl?.(full);
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    return true;
  } catch { return false; }
}

/* Long enough for React to commit the new screen, so a step cannot latch onto
   the element it is about to replace. Deliberately a timeout and not
   requestAnimationFrame: rAF does not fire in a background tab (nor in a
   headless render), which would leave the step waiting forever. */
const settleFrames = () => new Promise((r) => setTimeout(r, 180));

/* Scroll the anchor into view inside whatever actually scrolls (.asc-main
   is the scroll container on most screens, not the window). */
function reveal(el) {
  if (!el) return;
  try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ }
}

/* ---------- placement ---------- */
function place(rect) {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!rect) {
    return { card: { top: Math.max(24, vh / 2 - 130), left: Math.max(16, vw / 2 - CARD_W / 2) }, ring: null, side: 'center' };
  }
  const ring = {
    top: rect.top - RING_PAD, left: rect.left - RING_PAD,
    width: rect.width + RING_PAD * 2, height: rect.height + RING_PAD * 2,
  };
  const fitsRight = rect.right + GAP + CARD_W < vw - 12;
  const fitsLeft = rect.left - GAP - CARD_W > 12;
  let left, side;
  if (fitsRight) { left = rect.right + GAP; side = 'right'; }
  else if (fitsLeft) { left = rect.left - GAP - CARD_W; side = 'left'; }
  else { left = Math.min(Math.max(12, rect.left), vw - CARD_W - 12); side = rect.top > vh / 2 ? 'above' : 'below'; }
  let top;
  if (side === 'right' || side === 'left') top = Math.max(16, Math.min(rect.top - 8, vh - 260));
  else if (side === 'below') top = Math.min(rect.bottom + GAP, vh - 240);
  else top = Math.max(16, rect.top - GAP - 230);
  return { card: { top, left }, ring, side };
}

/* ============================================================ */
function Tour({ startAt, onClose }) {
  const steps = TOUR_STEPS;
  const [i, setI] = React.useState(Math.min(Math.max(0, startAt || 0), steps.length - 1));
  const [rect, setRect] = React.useState(null);
  const [pending, setPending] = React.useState(true);
  const [missing, setMissing] = React.useState(false);
  /* what the anchor resolved to — surfaced on the root as data-tour-hit purely
     so the step-by-step verification can assert the RIGHT element matched */
  const [hit, setHit] = React.useState('');
  const elRef = React.useRef(null);
  const step = steps[i];

  /* enter a step: navigate → wait for the anchor → reveal it */
  React.useEffect(() => {
    let dead = false;
    const ctl = new AbortController();
    setPending(true); setMissing(false); setHit(''); elRef.current = null; setRect(null);
    const moved = navigate(step.nav);
    (async () => {
      /* A navigation unmounts the previous screen. Resolving before the new one
         commits would match the outgoing rail and then measure it at 0x0 once
         React removed it — which is exactly what this wait prevents. */
      if (moved) await settleFrames();
      if (dead) return;
      if (step.preClick) {
        const opener = await waitFor(step.preClick, ctl.signal);
        if (dead) return;
        if (opener) { try { opener.click(); } catch { /* ignore */ } }
      }
      if (step.settle) await new Promise(r => setTimeout(r, step.settle));
      const el = await waitFor(step, ctl.signal);
      if (dead) return;
      elRef.current = el;
      setMissing(!el && !!(step.text || step.sel));
      setHit(el ? ((el.className || '').toString().trim().split(/\s+/).slice(0, 3).join(' ')
        || el.tagName.toLowerCase()) : '');
      if (el) { reveal(el); await new Promise(r => setTimeout(r, 220)); }
      if (dead) return;
      setRect(el ? el.getBoundingClientRect() : null);
      setPending(false);
    })();
    return () => { dead = true; ctl.abort(); };
  }, [i]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* keep the spotlight glued to the target: the app re-renders, rails scroll,
     canvases resize. Re-resolve on an interval so a replaced node is picked up. */
  React.useEffect(() => {
    if (pending) return;
    let raf = 0;
    const sync = () => {
      let el = elRef.current;
      const dead0 = !el || !el.isConnected
        || (el.getBoundingClientRect().width < 1 && el.getBoundingClientRect().height < 1);
      if (dead0 && (step.text || step.sel)) {
        const again = resolve(step);
        if (again) { el = again; elRef.current = again; }
      }
      const r = el && el.isConnected ? el.getBoundingClientRect() : null;
      setRect(prev => {
        if (!r && !prev) return prev;
        if (r && prev && Math.abs(r.top - prev.top) < 0.5 && Math.abs(r.left - prev.left) < 0.5
          && Math.abs(r.width - prev.width) < 0.5 && Math.abs(r.height - prev.height) < 0.5) return prev;
        return r;
      });
    };
    const onFrame = () => { sync(); raf = 0; };
    const kick = () => { if (!raf) raf = requestAnimationFrame(onFrame); };
    const id = setInterval(kick, 250);
    window.addEventListener('scroll', kick, true);
    window.addEventListener('resize', kick);
    return () => { clearInterval(id); cancelAnimationFrame(raf); window.removeEventListener('scroll', kick, true); window.removeEventListener('resize', kick); };
  }, [pending, i]);   // eslint-disable-line react-hooks/exhaustive-deps

  const go = React.useCallback((n) => {
    if (n < 0 || n >= steps.length) return;
    setI(n);
  }, [steps.length]);
  const finish = React.useCallback(() => { seen.set(); onClose(); }, [onClose]);

  /* keyboard: → / Enter next · ← back · Esc end */
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { finish(); return; }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); i + 1 < steps.length ? go(i + 1) : finish(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, finish, steps.length]);

  const { card, ring, side } = place(rect);
  const last = i === steps.length - 1;

  return (
    <div className="tour-root" data-tour-step={i + 1} data-tour-id={step.id}
      data-tour-anchor={pending ? 'pending' : missing ? 'missing' : rect ? 'found' : 'none'}
      data-tour-hit={hit}>
      {/* the dim: a spread shadow around the ring, so exactly one thing is lit.
          No ring (anchor missing / a "just look" step) → a plain flat dim. */}
      {ring
        ? <div className="tour-ring" style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }} />
        : <div className="tour-dim" />}

      <div className={'tour-card tour-' + side} style={{ top: card.top, left: card.left, width: CARD_W }} role="dialog" aria-modal="false" aria-label={step.title}>
        <div className="tour-card-h">
          <span className="tour-count">Step {i + 1} of {steps.length}</span>
          <button type="button" className="tour-x" onClick={finish} aria-label="End the tour">✕</button>
        </div>

        {step.where && <div className="tour-where">{step.where}</div>}
        <div className="tour-title">{step.title}</div>
        <div className="tour-body">{step.body}</div>

        {step.doIt && (
          <div className="tour-doit">
            <span className="tour-doit-k">Try it</span>
            <span>{step.doIt}</span>
          </div>
        )}
        {missing && (
          <div className="tour-warn">
            Could not find that control on screen — it may have moved. The description still applies; carry on with Next step.
          </div>
        )}

        <div className="tour-progress" aria-hidden="true">
          {steps.map((s, n) => (
            <button key={s.id} type="button"
              className={'tour-pip' + (n === i ? ' on' : '') + (n < i ? ' past' : '')}
              onClick={() => go(n)} tabIndex={-1} title={s.title} />
          ))}
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-btn ghost" onClick={finish}>End tour</button>
          <div className="tour-actions-r">
            <button type="button" className="tour-btn ghost" onClick={() => go(i - 1)} disabled={i === 0}>Back</button>
            <button type="button" className="tour-btn primary" onClick={() => (last ? finish() : go(i + 1))}>
              {last ? 'Finish' : 'Next step'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- mount point: the launcher + the tour ---------- */
export default function TourHost() {
  const [open, setOpen] = React.useState(false);
  const [startAt, setStartAt] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !BOOT) return;
    const asked = BOOT.get('tour');
    const at = parseInt(BOOT.get('tstep') || '0', 10);
    // ?tour=1 (optionally &tstep=N) opens it on load — how a specific step is
    // shared. Otherwise it opens once per browser, on a first visit.
    if (asked === '1' || asked === 'start') { setStartAt(Number.isFinite(at) && at > 0 ? at - 1 : 0); setOpen(true); return; }
    if (asked === '0' || asked === 'off') { seen.set(); return; }
    if (!seen.get()) { const t = setTimeout(() => setOpen(true), 900); return () => clearTimeout(t); }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.onthosTour = (n) => { setStartAt(Math.max(0, (n || 1) - 1)); setOpen(true); };
  }, []);

  return (
    <>
      {!open && (
        <button type="button" className="tour-launch" onClick={() => { setStartAt(0); setOpen(true); }}>
          <span className="tour-launch-d" aria-hidden="true" />
          Guided tour
        </button>
      )}
      {open && <Tour startAt={startAt} onClose={() => setOpen(false)} />}
    </>
  );
}
