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

    /* ════════ ClaimsCore (Meridian, R2 — D-105) ════════
       The behavioral half of the four walls' models — commands, events,
       invariants — mirroring kg/org/domains/claims.js; invariants trace to
       the lifecycle spec's FRs (kg/org/products/claimscore.js). */
    'PROD-CLAIMSCORE': {
      aggregates: [
        {
          id: 'AGG-LOSSREPORT', name: 'Loss report', context: 'CTX-FNOL', ucs: ['UC1', 'UC2', 'UC8'],
          commands: ['Register report', 'Merge channel input', 'Score severity', 'Assign lane'],
          events: ['Loss reported', 'Severity scored', 'Report assigned', 'Report handed to claim'],
          invariants: [
            { text: 'One loss event, one report — phone, app, web, broker and police feeds are channels into the same model, never separate models', fr: 'FR1' },
            { text: 'Severity is recalculated as facts land — never frozen at intake', fr: 'FR2' },
          ],
        },
        {
          id: 'AGG-CLAIM', name: 'Claim', context: 'CTX-COVERAGE', ucs: ['UC3', 'UC4', 'UC6'],
          commands: ['Open claim against snapshot', 'Record coverage decision', 'Move reserve', 'Instruct payment', 'Apply investigation hold'],
          events: ['Claim opened', 'Coverage decided', 'Reserve moved', 'Payment instructed', 'Settlement held'],
          invariants: [
            { text: 'A claim exists only against a coverage snapshot fixed as at the date of loss — later policy changes never alter an open claim\u2019s coverage basis', fr: 'FR3' },
            { text: 'Every coverage decision carries limits, deductibles and endorsement effects (OPCF 47R elections)', fr: 'FR4' },
            { text: 'Every reserve move is evented for actuarial consumption', fr: 'FR5' },
            { text: 'The ledger reflects instructed-not-yet-settled until Billing\u2019s outcome event returns', fr: 'FR6' },
          ],
        },
        {
          id: 'AGG-ABCLAIM', name: 'AB claim', context: 'CTX-AB', ucs: ['UC5'],
          commands: ['Engage benefit streams', 'Apply elections', 'Net offsets'],
          events: ['Benefits engaged', 'Election applied', 'Offset netted'],
          invariants: [
            { text: 'Benefits adjudicate against the SABS in force at the date of loss plus the insured\u2019s elected options, never against current wording', fr: 'FR7' },
          ],
        },
        {
          id: 'AGG-TREATPLAN', name: 'Treatment plan', context: 'CTX-AB', ucs: ['UC5'],
          commands: ['Intake OCF', 'Decide plan', 'Authorize payment', 'Escalate clock'],
          events: ['OCF received', 'Plan decided', 'Payment authorized', 'Clock escalated at 80%'],
          invariants: [
            { text: 'No payment without an approved plan or a statutory exception', fr: 'FR7' },
            { text: 'Every plan decision is timestamped against SABS clocks — a miss is a deemed approval', fr: 'FR8' },
          ],
        },
        {
          id: 'AGG-SALVAGE', name: 'Salvage disposition', context: 'CTX-TOTAL-LOSS', ucs: ['UC7'],
          commands: ['Determine ACV', 'Offer settlement', 'File brand', 'Dispose salvage'],
          events: ['Threshold breached', 'ACV determined', 'Owner settled', 'Salvage returned'],
          invariants: [
            { text: 'One vehicle, one disposition — settlement to the owner and recovery from the asset are the same file, never two', fr: 'FR9' },
          ],
        },
      ],
    },
  },
};
