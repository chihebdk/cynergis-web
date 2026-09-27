'use client';
/* ============================================================
   THE GUIDED TOUR — engine.

   The interaction model, in one paragraph. The card lives in the
   bottom-left corner permanently — before, during and after the
   tour — because nothing in the product uses that corner. A step
   has two phases. In AWAIT the screen is dimmed except one
   control, and that control is the only thing on the page that
   still responds; the visitor has to click it, which is what
   moves the app. The moment they do, the step flips to CLEAR:
   the dim lifts, the whole page is visible and legible, and
   nothing is clickable at all — only scrolling works — so they
   can read the screen they just opened without getting lost.
   "Next step" on the card then arms the next control.

   How the blocking works, and why not an overlay: interaction is
   gated by capture-phase listeners that swallow pointer and
   activation events outside the armed control, while wheel,
   touch-move and scroll keys are never touched. So scrolling is
   the browser's own, at full fidelity, and the visual dim is a
   separate pointer-events:none layer that can never interfere.

   Anchors resolve by VISIBLE TEXT wherever possible, because a
   text match survives a rail gaining an entry and an nth-child
   does not. A step whose control cannot be found degrades to
   CLEAR with Next enabled — a tour must never trap anyone.
   ============================================================ */
import React from 'react';
import { TOUR_STEPS } from './tour-steps';

const SEEN_KEY = 'onthos.tour.v1.seen';

/* The deep link is read at IMPORT time, not in an effect: the shell rewrites
   location on mount (cynReplaceUrl) and drops params it does not know, so by
   the time an effect ran the ?tour= would already be gone. */
const BOOT = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const RING_PAD = 6;
const FIND_TIMEOUT = 5000;

const seen = {
  get() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } },
  set() { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } },
};

/* ---------- anchor resolution ---------- */
const visible = (el) => {
  if (!el || !el.getClientRects) return false;
  const r = el.getBoundingClientRect();
  return r.width > 4 && r.height > 4;      // a collapsed 0x0 node must never win
};

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

/* The clickable vocabulary of this app: rail entries, tab strips, phase
   segments, and the card primitives (a journey card, a context card and a
   component card are plain divs, so `button, a` alone would miss them). */
const CANDIDATES = '.asc-nav, .env-navitem, .env-seg, .asc-tab, .ddd-tab, .dd-iseg-btn, '
  + '.mer-sub, .ddd-ctx, .ddd-cmp-card, .mer-prod, .ovw-domcard, .tstx-row, '
  + '.rlz-opt, .rlz-lever, button, a, [role="tab"], [role="button"]';

/* A spec is { sel?, text?, nameSel?, within?, inner? }:
     sel + text  the element matching sel whose text says text — how one card
                 is picked out of a grid of identical ones
     nameSel     REQUIRED for cards: match text against THIS element inside the
                 candidate (its heading) rather than the candidate's whole text.
                 Without it a card that merely MENTIONS the name can win — the
                 Adjuster Workbench card says "…over ClaimsCore's claim module",
                 and being the shorter card it beat ClaimsCore itself. When a
                 nameSel is given and nothing matches, this returns null rather
                 than falling back to a looser search: arming the wrong control
                 is worse than a step that admits it cannot find its target.
     inner       after locating that element, the control to use INSIDE it
                 (a product card is the landmark; its link is the button) */
function byName(cands, nameSel, text) {
  const want = text.trim().toLowerCase();
  const nameOf = (c) => {
    const n = c.querySelector(nameSel);
    return n ? (n.textContent || '').trim().toLowerCase() : null;
  };
  return cands.find(c => nameOf(c) === want)
    || cands.find(c => { const n = nameOf(c); return n && n.includes(want); })
    || null;
}

function resolve(spec) {
  if (!spec) return null;
  const scope = spec.within ? document.querySelector(spec.within) : document;
  if (!scope) return null;
  let found = null;

  if (spec.sel && spec.text) {
    for (const sl of [].concat(spec.sel)) {
      const cands = Array.from(scope.querySelectorAll(sl)).filter(visible);
      const el = spec.nameSel ? byName(cands, spec.nameSel, spec.text) : pickByText(cands, spec.text);
      if (el) { found = el; break; }
    }
    if (!found && spec.nameSel) return null;      // no loose fallback — see above
  }
  if (!found && spec.text) {
    found = pickByText(Array.from(scope.querySelectorAll(CANDIDATES)).filter(visible), spec.text);
  }
  if (!found && spec.sel) {
    for (const sl of [].concat(spec.sel)) {
      const el = Array.from(scope.querySelectorAll(sl)).find(visible);
      if (el) { found = el; break; }
    }
  }
  if (found && spec.inner) {
    const inner = Array.from(found.querySelectorAll(spec.inner)).find(visible);
    if (inner) return inner;
  }
  return found;
}

/* The name of whatever got armed — shown nowhere, but published on the root as
   data-tour-label so a step can be checked from outside for arming the RIGHT
   card, not merely a card. The earlier instrumentation reported the element's
   class, which could not tell two identical cards apart. */
const CARDS = '.mer-prod, .ovw-domcard, .mer-sub, .ddd-ctx, .ddd-cmp-card, .tstx-row';
const NAMES = '.mer-prod-top b, .ovw-dc-top b, h3, .ddd-ctx-nm, .agu-nm, .tstx-row-t';
function labelOf(el) {
  if (!el) return '';
  const card = (el.closest && el.closest(CARDS)) || el;
  const name = card.querySelector && card.querySelector(NAMES);
  return ((name || card).textContent || '').trim().replace(/\s+/g, ' ').slice(0, 44);
}

/* Wait for an anchor to exist: the app is client-rendered with dynamic imports
   and async canvases, so a step can run before its target mounts. Resolves
   null on timeout and the caller degrades. */
function waitFor(spec, signal) {
  return new Promise((done) => {
    if (!spec) return done(null);
    const first = resolve(spec);
    if (first) return done(first);
    let settled = false;
    const finish = (el) => {
      if (settled) return;
      settled = true;
      obs.disconnect(); clearInterval(poll); clearTimeout(bail);
      done(el);
    };
    const look = () => { const el = resolve(spec); if (el) finish(el); };
    const obs = new MutationObserver(look);
    obs.observe(document.body, { childList: true, subtree: true });
    const poll = setInterval(look, 120);
    const bail = setTimeout(() => finish(null), FIND_TIMEOUT);
    if (signal) signal.addEventListener('abort', () => finish(null), { once: true });
  });
}

/* ---------- navigation ---------- */
/* Drive the app through its OWN deep-link path. cynPushUrl writes history and
   pings subscribers, but the shell keeps its view (org / portfolio / product)
   in React state and only re-reads the URL on a history event — so pushing
   alone re-renders without moving. Replaying popstate runs the shell's own
   handler, which resolves the product, sets the view and applies
   phase/entry/ctx/tab. Same path as a visitor pressing Back.

   This runs on entering every step, as a CORRECTOR: normally the visitor's
   click already moved the app and this is a no-op. It matters when a click did
   not navigate, or they used browser Back, or they deep-linked mid-tour. */
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
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

function reveal(el) {
  if (!el) return;
  try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch { /* ignore */ }
}

/* ============================================================
   THE INTERACTION GATE
   Blocks activation everywhere except the armed control and the
   tour's own card. Never touches wheel / touchmove / scroll keys,
   so scrolling stays native.
   ============================================================ */
const GATED = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'submit', 'touchstart'];

/* The tour sometimes has to click something itself (see `ensure`). Its own
   synthetic click is a real event, so the gate would swallow it like any other
   — this flag lets exactly that click through. */
let BYPASS = 0;
function clickThrough(el) {
  if (!el) return;
  BYPASS++;
  try { el.click(); } catch { /* ignore */ }
  setTimeout(() => { BYPASS = Math.max(0, BYPASS - 1); }, 0);
}

function useGate({ active, armed, allow, onArmedClick, onKey }) {
  const ref = React.useRef({});
  ref.current = { active, armed, allow, onArmedClick, onKey };

  React.useEffect(() => {
    if (!active) return;
    const permitted = (node) => {
      const { armed: a, allow: al } = ref.current;
      if (!node || !node.closest) return false;
      if (node.closest('.tour-card')) return true;          // the card is always live
      if (a && (node === a || a.contains(node))) return true;
      for (const s of (al || [])) if (node.closest(s)) return true;
      return false;
    };
    const gate = (e) => {
      if (BYPASS > 0) return;                                 // the tour's own click
      if (permitted(e.target)) {
        const { armed: a, onArmedClick: cb } = ref.current;
        if (e.type === 'click' && a && (e.target === a || a.contains(e.target))) cb && cb();
        return;                                              // let it through untouched
      }
      e.stopPropagation();
      e.stopImmediatePropagation();                           // beat React's root listener
      if (e.cancelable) e.preventDefault();
    };
    const onKeyDown = (e) => {
      const { onKey: k } = ref.current;
      if (k && k(e)) { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); return; }
      // Enter and Space activate a focused control — block them outside the
      // permitted area. Arrows, PageUp/Down and Home/End are left alone so the
      // page still scrolls by keyboard.
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const ae = document.activeElement;
      const control = ae && ae.closest && ae.closest('button, a, [role="button"], [role="tab"], input, select, textarea');
      if (control && !permitted(ae)) { e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); }
    };
    for (const t of GATED) document.addEventListener(t, gate, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.body.classList.add('tour-gated');
    return () => {
      for (const t of GATED) document.removeEventListener(t, gate, true);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.classList.remove('tour-gated');
    };
  }, [active]);
}

/* ---------- the spotlight ring, kept glued to its target ---------- */
function useRect(el, spec, live) {
  const [rect, setRect] = React.useState(null);
  const elRef = React.useRef(el);
  elRef.current = el;

  React.useEffect(() => {
    if (!live || !el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
    let raf = 0;
    const sync = () => {
      let node = elRef.current;
      const r0 = node && node.isConnected ? node.getBoundingClientRect() : null;
      // a detached or collapsed target is stale — find it again
      if ((!r0 || (r0.width < 1 && r0.height < 1)) && spec) {
        const again = resolve(spec);
        if (again) { elRef.current = again; node = again; }
      }
      const r = node && node.isConnected ? node.getBoundingClientRect() : null;
      setRect(prev => {
        if (!r && !prev) return prev;
        if (r && prev && Math.abs(r.top - prev.top) < 0.5 && Math.abs(r.left - prev.left) < 0.5
          && Math.abs(r.width - prev.width) < 0.5 && Math.abs(r.height - prev.height) < 0.5) return prev;
        return r;
      });
      raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(sync); };
    const id = setInterval(kick, 250);
    window.addEventListener('scroll', kick, true);
    window.addEventListener('resize', kick);
    return () => { clearInterval(id); cancelAnimationFrame(raf); window.removeEventListener('scroll', kick, true); window.removeEventListener('resize', kick); };
  }, [el, live]);   // eslint-disable-line react-hooks/exhaustive-deps

  return rect;
}

/* ============================================================ */
export default function TourHost() {
  const steps = TOUR_STEPS;
  const [mode, setMode] = React.useState('boot');       // boot | invite | tour | done
  const [i, setI] = React.useState(0);
  const [phase, setPhase] = React.useState('await');    // await | clear
  const [armed, setArmed] = React.useState(null);        // the one live element
  const [lost, setLost] = React.useState(false);         // control never appeared
  const step = steps[i] || steps[0];

  /* --- boot: deep link, or the first-visit invitation --- */
  React.useEffect(() => {
    if (typeof window === 'undefined' || !BOOT) { setMode('invite'); return; }
    const asked = BOOT.get('tour');
    const at = parseInt(BOOT.get('tstep') || '0', 10);
    if (asked === '1' || asked === 'start') {
      setI(Number.isFinite(at) && at > 0 ? Math.min(at, steps.length) - 1 : 0);
      setMode('tour');
      return;
    }
    if (asked === '0' || asked === 'off') { seen.set(); setMode('done'); return; }
    setMode(seen.get() ? 'done' : 'invite');
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.onthosTour = (n) => { setI(Math.min(Math.max(1, n || 1), steps.length) - 1); setMode('tour'); };
  }, [steps.length]);

  /* --- entering a step: correct the location, then arm its control --- */
  React.useEffect(() => {
    if (mode !== 'tour') return;
    let dead = false;
    const ctl = new AbortController();
    setArmed(null); setLost(false);
    setPhase(step.click ? 'await' : 'clear');

    (async () => {
      const moved = navigate(step.nav);
      if (moved) await settle(180);
      if (dead) return;
      if (step.settle) await settle(step.settle);
      if (dead) return;

      const spec = step.click || step.look;
      if (!spec) return;
      /* Some controls only exist once something is open — the storm canvas
         appears after a business process is selected. In the normal forward
         flow the previous step's click already did that; this repairs the
         deep-link and Back cases, and is skipped whenever the control is
         already there. */
      if (step.ensure && !resolve(spec)) {
        const opener = resolve(step.ensure);
        if (opener) { clickThrough(opener); await settle(700); }
        if (dead) return;
      }
      const el = await waitFor(spec, ctl.signal);
      if (dead) return;
      if (!el) { setLost(true); setPhase('clear'); return; }
      reveal(el);
      await settle(240);
      if (dead) return;
      setArmed(el);
    })();
    return () => { dead = true; ctl.abort(); };
  }, [mode, i]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* the visitor clicked the armed control: let the app move, then clear the
     screen so they can read what they just opened */
  const onArmedClick = React.useCallback(() => {
    if (phase !== 'await') return;
    setTimeout(() => { setPhase('clear'); setArmed(null); }, 420);
  }, [phase]);

  const last = i === steps.length - 1;
  const go = (n) => { if (n >= 0 && n < steps.length) setI(n); };
  const finish = () => { seen.set(); setMode('done'); };
  const start = () => { setI(0); setMode('tour'); };

  const onKey = React.useCallback((e) => {
    if (mode !== 'tour') return false;
    if (e.key === 'Escape') { finish(); return true; }
    if (phase === 'clear' && (e.key === 'ArrowRight' || e.key === 'Enter')) { last ? finish() : go(i + 1); return true; }
    if (e.key === 'ArrowLeft') { go(i - 1); return true; }
    return false;
  }, [mode, phase, i, last]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* the gate is on during the invitation (so the card is the only live thing)
     and for the whole tour; it is off once the visitor is exploring alone */
  const gateOn = mode === 'invite' || mode === 'tour';
  useGate({ active: gateOn, armed: phase === 'await' ? armed : null,
    allow: phase === 'clear' ? (step.allow || []) : [], onArmedClick, onKey });

  const ringEl = mode === 'tour' ? armed : null;
  const rect = useRect(ringEl, step.click || step.look, !!ringEl);
  const ring = rect ? {
    top: rect.top - RING_PAD, left: rect.left - RING_PAD,
    width: rect.width + RING_PAD * 2, height: rect.height + RING_PAD * 2,
  } : null;

  if (mode === 'boot') return null;

  /* the dim: in AWAIT it is the ring's own spread shadow, so exactly one
     control is lit; during the invitation it is a flat veil; in CLEAR there is
     none at all — the page is meant to be read. */
  const veil = mode === 'invite' || (mode === 'tour' && phase === 'await' && !ring);

  return (
    <div className="tour-root" data-tour-mode={mode} data-tour-step={i + 1} data-tour-id={step.id}
      data-tour-phase={mode === 'tour' ? phase : ''}
      data-tour-anchor={ring ? 'found' : lost ? 'missing' : armed ? 'pending' : 'none'}
      data-tour-hit={armed ? ((armed.className || '').toString().trim().split(/\s+/).slice(0, 3).join(' ') || armed.tagName.toLowerCase()) : ''}
      data-tour-label={armed ? labelOf(armed) : ''}>

      {veil && <div className="tour-veil" />}
      {ring && <div className={'tour-ring' + (phase === 'await' ? ' armed' : ' plain')}
        style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }} />}

      {mode === 'invite' && (
        <div className="tour-card tour-card-invite" role="dialog" aria-label="Guided tour">
          <div className="tour-where">Guided tour</div>
          <div className="tour-title">Would you like a tour?</div>
          <div className="tour-body">
            Every phase of this demo is filled in, from the shape of the organisation down to a
            deployed component — which is easy to walk straight past. The tour visits the pieces
            worth seeing, one click at a time, in about five minutes.
          </div>
          <div className="tour-actions">
            <button type="button" className="tour-btn ghost" onClick={finish}>I&apos;ll explore on my own</button>
            <button type="button" className="tour-btn primary" onClick={start}>Start the guided tour</button>
          </div>
        </div>
      )}

      {mode === 'done' && (
        <button type="button" className="tour-card tour-card-mini" onClick={start}>
          <span className="tour-mini-d" aria-hidden="true" />
          <span className="tour-mini-t"><b>Guided tour</b><span className="tour-mini-sub">walk the demo in five minutes</span></span>
        </button>
      )}

      {mode === 'tour' && (
        <div className="tour-card" role="dialog" aria-label={step.title}>
          <div className="tour-card-h">
            <span className="tour-count">Step {i + 1} of {steps.length}</span>
            <button type="button" className="tour-x" onClick={finish} aria-label="End the tour">✕</button>
          </div>

          {step.where && <div className="tour-where">{step.where}</div>}
          <div className="tour-title">{step.title}</div>
          <div className="tour-body">{step.body}</div>

          {phase === 'await' && step.click && (
            <div className="tour-ask">
              <span className="tour-ask-k">{armed ? 'Your turn' : 'Finding it…'}</span>
              <span>{step.ask || 'Click the highlighted control to continue.'}</span>
            </div>
          )}
          {phase === 'clear' && step.then && <div className="tour-then">{step.then}</div>}
          {lost && (
            <div className="tour-warn">
              That control is not on screen — it may have moved. Carry on with Next step.
            </div>
          )}

          <div className="tour-progress" aria-hidden="true">
            {steps.map((s, n) => (
              <button key={s.id} type="button" tabIndex={-1} title={s.title}
                className={'tour-pip' + (n === i ? ' on' : '') + (n < i ? ' past' : '')}
                onClick={() => go(n)} />
            ))}
          </div>

          <div className="tour-actions">
            <button type="button" className="tour-btn ghost" onClick={finish}>End tour</button>
            <div className="tour-actions-r">
              <button type="button" className="tour-btn ghost" onClick={() => go(i - 1)} disabled={i === 0}>Back</button>
              {phase === 'await'
                ? <button type="button" className="tour-btn skip" onClick={() => { setPhase('clear'); setArmed(null); }}>Skip the click</button>
                : <button type="button" className="tour-btn primary" onClick={() => (last ? finish() : go(i + 1))}>
                  {last ? 'Finish' : 'Next step'}
                </button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
