/* ============================================================
   Cynergis — Delivery / "Manage" overlay (window.__DELIVERY__).
   The execution layer that runs ACROSS phases (D-025): teams,
   schedule, milestones, live status, and — first-class —
   BLOCKERS (waiting-on). Shaped as knowledge-graph nodes + edges
   so the board is just a saved query over the same graph:

     Team        (squad)                  node
     Milestone   (program checkpoint)     node
     DeliveryItem(use-case execution)     node  -- assigned_to --> Team
                                                -- realizes    --> UseCase (UC*)
     Blocker     (waiting-on)             node  -- blocks      --> DeliveryItem/UseCase
                                                -- waiting_on  --> {dependency|approval|event|useCase}

   Bitemporal in the real store: `since`/`expected`/`status` are
   versioned, so a cleared blocker keeps its history. Here we seed
   the current snapshot for the worked product (Fraud Decisioning).
   ============================================================ */
window.__DELIVERY__ = {
  asOf: '2026-06-28',
  byProduct: {
    fraud: {
      stages: ['Backlog', 'In flight', 'In review', 'Live'],

      teams: [
        { id: 'TEAM-DEC',  name: 'Decisioning Squad', lead: 'Marcus Lee',     capacity: '6 eng · 1 PM · 1 DS', focus: 'Real-time scoring + step-up' },
        { id: 'TEAM-CASE', name: 'Case Ops Squad',    lead: 'Sara Lindqvist', capacity: '4 eng · 1 PM',        focus: 'Analyst tooling + notifications' },
        { id: 'TEAM-PLAT', name: 'Risk Platform',     lead: 'Priya Nair',     capacity: '5 eng (shared)',      focus: 'Feature store + model serving' },
      ],

      milestones: [
        { id: 'MS1', label: 'Pilot live — 10% of card traffic',        date: '2026-05-30', status: 'done' },
        { id: 'MS2', label: 'Full rollout — 100% of traffic',          date: '2026-07-18', status: 'upcoming' },
        { id: 'MS3', label: 'Legacy rules engine decommissioned',      date: '2026-08-29', status: 'at-risk' },
      ],

      // one DeliveryItem per use case (realizes UC*, assigned_to a Team)
      items: [
        { id: 'DI-1', ucId: 'UC1', team: 'TEAM-DEC',  stage: 'In flight', progress: 72, start: '2026-05-05', target: '2026-07-10',
          note: 'Streaming scorer on the authorization bus; p95 latency tuning.' },
        { id: 'DI-2', ucId: 'UC2', team: 'TEAM-CASE', stage: 'In review', progress: 88, start: '2026-05-12', target: '2026-07-02',
          note: 'Auto-block + customer notification; in QA / acceptance.' },
        { id: 'DI-3', ucId: 'UC3', team: 'TEAM-CASE', stage: 'In flight', progress: 40, start: '2026-05-20', target: '2026-07-22',
          note: 'Analyst triage console — currently blocked, see waiting-on.' },
        { id: 'DI-4', ucId: 'UC4', team: 'TEAM-DEC',  stage: 'Backlog',   progress: 0,  start: '2026-07-15', target: '2026-08-20',
          note: 'Step-up auth on medium risk; start gated on a vendor contract.' },
      ],

      // BLOCKERS — first-class "waiting_on" edges. This is the core case:
      // "we are working on a use case and it is blocked because we are
      //  waiting for something — and it is captured."
      blockers: [
        { id: 'BLK1', ucId: 'UC3', kind: 'dependency', waitingOn: 'Case Manager API v2', owner: 'Core Platform team',
          since: '2026-06-12', expected: '2026-07-05', severity: 'high',
          detail: 'Triage console needs the v2 case API (bulk disposition + tamper-evident audit fields). ETA confirmed by Core Platform; tracked.' },
        { id: 'BLK2', ucId: 'UC4', kind: 'approval', waitingOn: 'Step-up auth vendor contract', owner: 'Procurement & Legal',
          since: '2026-06-20', expected: '2026-07-15', severity: 'medium',
          detail: 'Build cannot start until the step-up authentication provider contract is signed. Known dependency; start date set after expected signature.' },
      ],
    },
  },
};
