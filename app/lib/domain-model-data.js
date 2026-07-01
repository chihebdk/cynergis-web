/* ============================================================
   Cynergis — Domain model (window.__DOMAIN__), the opening move of
   Design (D-027). EventStorming over Discover's journeys + use cases
   + business rules → domain events · commands · aggregates · policies.
   The ubiquitous language converges here and the SEAMS reveal the
   bounded contexts (so the contexts are an OUTPUT of this model).

   Shaped as knowledge-graph nodes/edges:
     Aggregate holds→ Invariant ;  Aggregate emits→ DomainEvent
     Command targets→ Aggregate ;  Policy reacts→ (DomainEvent → Command)
   Invariants are defined ONCE here; the realization (D-026) decides
   how each is enforced (code | llm-function | agent | human).
   ============================================================ */
window.__DOMAIN__ = {
  byProduct: {
    fraud: {
      // aggregates (consistency boundaries) — grouped by the context they seed
      aggregates: [
        {
          id: 'AGG-AUTH', name: 'Authorization', context: 'BC-DEC', ucs: ['UC1', 'UC2'],
          commands: ['Score authorization', 'Apply decision'],
          events: ['Authorization scored', 'Authorization blocked', 'Authorization approved'],
          // each invariant traces to the functional requirement that mandates it (D-031)
          invariants: [
            { text: 'An authorization is decided exactly once', fr: 'FR1' },
            { text: 'A decision cannot be both approved and blocked', fr: 'FR3' },
            { text: 'Every decision carries a risk band + an explanation', fr: 'FR2' },
          ],
        },
        {
          id: 'AGG-STEPUP', name: 'Step-up Challenge', context: 'BC-DEC', ucs: ['UC4'],
          commands: ['Issue step-up challenge', 'Resolve challenge'],
          events: ['Step-up issued', 'Step-up passed', 'Step-up failed'],
          invariants: [
            { text: 'Step-up is issued only on a medium risk band', fr: 'FR7' },
            { text: 'A challenge expires after its timeout' },   // no requirement captured → surfaces as a gap
          ],
        },
        {
          id: 'AGG-CASE', name: 'Case', context: 'BC-CASE', ucs: ['UC3'],
          commands: ['Open case', 'Assign analyst', 'Record disposition'],
          events: ['Case opened', 'Case assigned', 'Case disposed'],
          invariants: [
            { text: 'A case must reference the triggering authorization', fr: 'FR5' },
            { text: 'A disposition requires a recorded rationale', fr: 'FR6' },
            { text: 'Only the assigned analyst can dispose a case', fr: 'FR6' },
          ],
        },
      ],

      // policies: reactions — "when EVENT → issue COMMAND" (often cross contexts → the seams); each traces to its FR
      policies: [
        { id: 'POL-1', when: 'Authorization scored = medium', then: 'Issue step-up challenge', context: 'BC-DEC', fr: 'FR7',
          note: 'Medium risk triggers a step-up rather than a hard block.' },
        { id: 'POL-2', when: 'Authorization blocked', then: 'Open case', context: 'BC-CASE', fr: 'FR5',
          note: 'Blocked / escalated authorizations become analyst cases (crosses Decisioning → Case Management).' },
        { id: 'POL-3', when: 'Authorization blocked', then: 'Notify customer', context: 'BC-NOTIFY', fr: 'FR4',
          note: 'Customer is notified on a block (crosses into the generic Notification context).' },
      ],

      // how the model produced the three contexts (the seams)
      seams: [
        { context: 'BC-DEC', name: 'Decisioning', rationale: 'Authorization + Step-up share scoring/decision language and a tight consistency boundary.' },
        { context: 'BC-CASE', name: 'Case Management', rationale: 'Case has its own lifecycle and language (triage / disposition); it reacts to block events.' },
        { context: 'BC-NOTIFY', name: 'Customer Notification', rationale: 'Notification is a pure reaction with no domain state of its own → generic, off-the-shelf.' },
      ],
    },
  },
};
