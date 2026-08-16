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
      // aggregates (consistency boundaries) — grouped by the context they seed.
      // archRef joins the BEHAVIORAL half here (commands/events/invariants) to the
      // STRUCTURAL half in __ARCH__ (store + entity tables): a domain-level
      // aggregate ({domain}) or a component-owned one ({component}, e.g. the saga).
      aggregates: [
        {
          id: 'AGG-AUTH', name: 'Authorization', context: 'BC-DEC', ucs: ['UC1', 'UC2'],
          archRef: { domain: 'dec' },
          commands: ['Score authorization', 'Apply decision', 'Reverse hold'],
          events: ['Authorization scored', 'Authorization blocked', 'Authorization approved'],
          // each invariant traces to the functional requirement that mandates it (D-031)
          invariants: [
            { text: 'An authorization has exactly one effective decision at any time — reversals append a superseding decision, never mutate', fr: 'FR1' },
            { text: 'A decision cannot be both approved and blocked', fr: 'FR3' },
            { text: 'Every decision carries an outcome, a risk band and an explanation', fr: 'FR2' },
          ],
        },
        {
          id: 'AGG-STEPUP', name: 'Step-up Challenge', context: 'BC-DEC', ucs: ['UC4'],
          archRef: { component: 'C6' },
          commands: ['Issue challenge', 'Resolve challenge'],
          events: ['Step-up issued', 'Step-up passed', 'Step-up failed', 'Step-up expired'],
          invariants: [
            { text: 'Step-up is issued only on a medium risk band', fr: 'FR7' },
            { text: 'A challenge expires after its timeout' },   // no requirement captured → surfaces as a gap
          ],
        },
        {
          id: 'AGG-CASE', name: 'Case', context: 'BC-CASE', ucs: ['UC3'],
          archRef: { domain: 'case' },
          commands: ['Open case', 'Assign analyst', 'Record disposition'],
          events: ['Case opened', 'Case assigned', 'Case disposed', 'Outcome labelled'],
          invariants: [
            { text: 'A case must reference the triggering authorization', fr: 'FR5' },
            { text: 'A disposition requires a recorded rationale', fr: 'FR6' },
            { text: 'Only the assigned analyst can dispose a case', fr: 'FR6' },
          ],
        },
      ],

      // Policies are no longer authored here: they are DERIVED from the storming
      // flows (flow/data.js node.policies — single source of truth), rolled up by
      // derivedPolicies() in screens-design-ddd.jsx for the bounded-context
      // Policies tab and the knowledge pack.

    },
  },
};
