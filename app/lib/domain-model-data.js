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
        /* D-181: the accepted cut's records. AGG-LOSSREPORT and AGG-CLAIM are
           REHOMED to their successor walls (same ids the design storms stamp);
           the four new records are added; the AB pair carries forward with its
           deferred wall; AGG-SALVAGE stays with the retired wall so its page
           keeps reading truthfully. Invariants echo the lifecycle's never-rules
           — those without an fr surface as Discover gaps, on purpose. */
        {
          id: 'AGG-LOSSREPORT', name: 'Loss report', context: 'CTX-INTAKE', ucs: ['UC1', 'UC2'],
          commands: ['Open the loss report', 'Match & merge submissions', 'Score severity & suggest the lane', 'Complete the report', 'Register the claim'],
          events: ['Loss reported', 'Report merged', 'Severity triaged', 'Report completed', 'Claim registered'],
          invariants: [
            { text: 'One loss, one report — phone, app, web, broker and police feeds are channels into the same record, never separate ones', fr: 'FR1' },
            { text: 'Severity is recalculated as facts land — never frozen at intake', fr: 'FR2' },
            { text: 'Only the licensed intake role completes a report' },
            { text: 'One loss, one claim — registration checks for an existing claim before a number is assigned', fr: 'FR1' },
          ],
        },
        {
          id: 'AGG-CLAIM', name: 'Claim file', context: 'CTX-ADJUD', ucs: ['UC3', 'UC4', 'UC6', 'UC8'],
          commands: ['Create the claim file', 'Verify policy & coverage from the snapshot', 'Establish & move reserves', 'Determine fault', 'Calculate the settlement', 'Authorize payment', 'Apply & release holds', 'Close the file', 'Reopen with a new decision version', 'Apply post-close credits'],
          events: ['Claim opened', 'Policy verified', 'Coverage confirmed', 'Claim denied', 'Reserve established', 'Fault determined', 'Settlement calculated', 'Payment authorized', 'Claim closed', 'Claim reopened', 'Credit accepted after close', 'Hold applied'],
          invariants: [
            { text: 'A claim adjudicates only against the stored coverage snapshot as at the date of loss — never a live policy call', fr: 'FR3' },
            { text: 'Every coverage decision carries limits, deductibles and endorsement effects (OPCF 47R elections)', fr: 'FR4' },
            { text: 'Every reserve move is evented, and authorization respects the handler\u2019s authority limit', fr: 'FR5' },
            { text: 'The money state is instructed-not-yet-settled until Claim payments\u2019 outcome event returns', fr: 'FR6' },
            { text: 'No payment authorization and no closure while any hold is open' },
            { text: 'A closed file is never edited — late money lands as new credit entries' },
            { text: 'Reopening appends a new decision version; every prior decision stays on record' },
          ],
        },
        {
          id: 'AGG-REPAIRCASE', name: 'Repair case', context: 'CTX-REPAIR', ucs: [],
          commands: ['Open the appraisal assignment', 'Accept the assignment', 'Price the estimate', 'Approve estimate & supplements', 'Verify the repair'],
          events: ['Appraisal requested', 'Assignment accepted', 'Estimate received', 'Threshold breach declared', 'Estimate approved', 'Supplement approved', 'Repair completed', 'Repair verified'],
          invariants: [
            { text: 'One estimate of record per case — supplements append to it, never replace it' },
            { text: 'An estimate over the total-loss line hands the vehicle over — coordination never settles a total loss itself', fr: 'FR9' },
          ],
        },
        {
          id: 'AGG-PAYLEDGER', name: 'Payment ledger', context: 'CTX-PAYMENTS', ucs: [],
          commands: ['Receive the instruction', 'Dispatch the payment', 'Confirm settlement', 'Record a failure', 'Book a credit'],
          events: ['Payment instruction received', 'Instruction dispatched', 'Payment failed', 'Settlement confirmed', 'Credit received'],
          invariants: [
            { text: 'The ledger is the single truth about the money — instructed, dispatched, settled and credited, per claim', fr: 'FR6' },
            { text: 'Entries append; no entry is ever edited or deleted' },
          ],
        },
        {
          id: 'AGG-SALVAGECASE', name: 'Salvage case', context: 'CTX-TOTALLOSS', ucs: ['UC7'],
          commands: ['Open from the threshold breach', 'Value the vehicle', 'Offer & accept the settlement', 'Brand & transfer title', 'Dispose the salvage'],
          events: ['Threshold breach received', 'Vehicle valued', 'Settlement offered & accepted', 'Title branded & transferred', 'Salvage disposed'],
          invariants: [
            { text: 'One vehicle, one disposition — settlement to the owner and recovery from the asset are the same file, never two', fr: 'FR9' },
            { text: 'Funds move only after lien and title status are read' },
          ],
        },
        {
          id: 'AGG-RECOVERYCASE', name: 'Recovery case', context: 'CTX-RECOVERY', ucs: [],
          commands: ['Open from the referral', 'Build & issue the demand', 'Receive the recovery', 'Close the case'],
          events: ['Recovery referred', 'Demand issued', 'Recovery received', 'Recovery closed'],
          invariants: [
            { text: 'A recovery case exists only against a closed claim\u2019s facts' },
            { text: 'Every receipt credits the claim through Claim payments, never directly' },
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
