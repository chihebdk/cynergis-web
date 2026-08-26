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
          shape: {
            description: 'One report per loss, fed by every channel: submissions append with provenance, parties and vehicles consolidate, the triage assessment refreshes as facts land. Registration stamps the claim number and hands the story to adjudication.',
            tables: [
              { name: 'loss_report', purpose: 'the root — one row per loss', columns: [
                { name: 'report_id', role: 'id', type: 'string', desc: 'The report\u2019s identity until a claim number exists.' },
                { name: 'stage', type: 'enum', desc: 'The state machine\u2019s pointer — reported \u00b7 triaged \u00b7 completed \u00b7 registered.' },
                { name: 'date_and_place_of_loss', type: 'date + text', desc: 'The merge key\u2019s anchor, and the snapshot request\u2019s key.' },
                { name: 'claim_number', role: 'ref', refTo: 'Claim file (Claim adjudication)', type: 'string', desc: 'Assigned at registration — empty until then.' },
                { name: 'snapshot_request', type: 'string', desc: 'The coverage snapshot requested at intake, keyed to date of loss.' },
              ] },
              { name: 'submission', owned: true, purpose: 'one row per channel touch — append-only, provenance kept', columns: [
                { name: 'submission_id', role: 'id', type: 'string', desc: 'One per touch — portal, desk call, broker, police notice.' },
                { name: 'channel', type: 'enum', desc: 'Which door it came through.' },
                { name: 'received_at', type: 'date', desc: 'When — the earliest submission sets the report\u2019s clock.' },
                { name: 'content_ref', type: 'string', desc: 'What was said, as received — never edited by the merge.' },
              ] },
              { name: 'party', owned: true, purpose: 'claimant, insured, third parties — consolidated across submissions', columns: [
                { name: 'party_id', role: 'id', type: 'string', desc: 'One row per person or organization on the loss.' },
                { name: 'role_and_contact', type: 'structured', desc: 'Who they are to the loss, and how to reach them.' },
              ] },
              { name: 'triage_assessment', owned: true, purpose: 'the model\u2019s suggestion, refreshed as facts land', columns: [
                { name: 'assessed_at', role: 'id', type: 'date', desc: 'One row per re-score — the history of the suggestion.' },
                { name: 'severity_and_lane', type: 'enum + score', desc: 'The suggested lane with its drivers — explainable, never binding.' },
              ] },
            ],
          },
          commands: ['Open the loss report', 'Match & merge submissions', 'Score severity & suggest the lane', 'Complete the report', 'Register the claim'],
          events: ['Loss reported', 'Report merged', 'Severity triaged', 'Report completed', 'Claim registered'],
          invariants: [
            { id: 'INV-INTAKE-one-loss-one-report', text: 'One loss, one report — phone, app, web, broker and police feeds are channels into the same record, never separate ones', fr: 'FR1' },
            { id: 'INV-INTAKE-severity-recalculated', text: 'Severity is recalculated as facts land — never frozen at intake', fr: 'FR2' },
            { id: 'INV-INTAKE-licensed-completion', text: 'Only the licensed intake role completes a report' },
            { id: 'INV-INTAKE-one-loss-one-claim', text: 'One loss, one claim — registration checks for an existing claim before a number is assigned', fr: 'FR1' },
          ],
        },
        {
          id: 'AGG-CLAIM', name: 'Claim file', context: 'CTX-ADJUD', ucs: ['UC3', 'UC4', 'UC6', 'UC8'],
          /* D-182: the STATE SHAPE — the logical model, in business language.
             No store is named on purpose: the physical schema (tables, indexes,
             document vs rows vs event stream) is each box's private Build
             decision, derived from this shape + packaging + NFRs. */
          shape: {
            description: 'One file, changed as a unit: the stage pointer, an immutable decision history, typed holds, reserves per line, and append-only credits. Everything another context needs travels as events by claim number — never as a join.',
            tables: [
              { name: 'claim_file', purpose: 'the root — one row per claim', columns: [
                { name: 'claim_number', role: 'id', type: 'string', desc: 'Assigned at registration; the identity everywhere — events, ledger, portals.' },
                { name: 'stage', type: 'enum', desc: 'The state machine\u2019s pointer — one of the seven lifecycle stages.' },
                { name: 'notice_date', type: 'date', desc: 'The statutory notice date — recorded, not inferred.' },
                { name: 'date_of_loss', type: 'date', desc: 'Anchors the coverage snapshot and every time-versioned rule.' },
                { name: 'loss_report', role: 'ref', refTo: 'Loss report (Intake & registration)', type: 'string', desc: 'The registered report this file was opened from.' },
                { name: 'fault_pct', type: 'pct', desc: 'The determined fault share under the applicable rules.' },
                { name: 'settlement_amount', type: 'money', desc: 'The calculated amount payable — deductible and limits applied.' },
                { name: 'estimate_of_record', role: 'ref', refTo: 'Repair case (Repair & estimate)', type: 'string', desc: 'The verified estimate the settlement stands on.' },
                { name: 'payment_instruction', role: 'ref', refTo: 'Payment ledger (Claim payments)', type: 'string', desc: 'Instructed-not-yet-settled until the outcome event returns.' },
              ] },
              { name: 'coverage_snapshot', owned: true, purpose: 'the mainframe extract as at date of loss — stored locally, read-only', columns: [
                { name: 'snapshot_id', role: 'id', type: 'string', desc: 'Keyed to policy and date of loss.' },
                { name: 'policy_number', type: 'string', desc: 'The policy as the mainframe knew it — never re-fetched live.' },
                { name: 'in_force', type: 'yes/no', desc: 'Whether the policy responds at the date of loss.' },
                { name: 'lines_and_limits', type: 'list', desc: 'Coverage lines with limits, deductibles and endorsement effects (OPCF 47R).' },
              ] },
              { name: 'decision_version', owned: true, purpose: 'append-only — a new version supersedes, never edits (the reopen rail)', columns: [
                { name: 'version_no', role: 'id', type: 'number', desc: 'Monotonic; the highest version is the effective decision.' },
                { name: 'kind', type: 'enum', desc: 'coverage \u00b7 denial \u00b7 settlement \u00b7 reopen.' },
                { name: 'outcome_and_reasons', type: 'text', desc: 'A denial never leaves without its reasons.' },
                { name: 'decided_by_at', type: 'who/when', desc: 'The deciding authority and moment, on the record.' },
              ] },
              { name: 'hold', owned: true, purpose: 'the pause flags — typed by origin; only the owner releases', columns: [
                { name: 'hold_id', role: 'id', type: 'string', desc: 'One row per hold, ever placed.' },
                { name: 'origin', type: 'enum', desc: 'fraud & SIU \u00b7 disputes — the owner who alone releases it.' },
                { name: 'placed_by_at', type: 'who/when', desc: 'Who said stop, and when.' },
                { name: 'released_at', type: 'date', desc: 'Empty = open — and open gates authorization and closure.' },
              ] },
              { name: 'reserve_line', owned: true, purpose: 'reserves per coverage line — every move evented for actuarial reads', columns: [
                { name: 'coverage_line', role: 'id', type: 'string', desc: 'The line this reserve stands against.' },
                { name: 'amount', type: 'money', desc: 'The current reserve; history lives in the events.' },
                { name: 'moved_by_at', type: 'who/when', desc: 'Every move has an author and a moment.' },
              ] },
              { name: 'credit', owned: true, purpose: 'money back after close — append-only; the closed file is never edited', columns: [
                { name: 'credit_id', role: 'id', type: 'string', desc: 'One row per credit received.' },
                { name: 'source', type: 'enum', desc: 'salvage \u00b7 recovery.' },
                { name: 'amount', type: 'money', desc: 'The amount credited against the claim.' },
                { name: 'ledger_entry', role: 'ref', refTo: 'Payment ledger (Claim payments)', type: 'string', desc: 'The ledger entry that carried the money in.' },
              ] },
            ],
          },
          commands: ['Create the claim file', 'Verify policy & coverage from the snapshot', 'Establish & move reserves', 'Determine fault', 'Calculate the settlement', 'Authorize payment', 'Apply & release holds', 'Close the file', 'Reopen with a new decision version', 'Apply post-close credits'],
          events: ['Claim opened', 'Policy verified', 'Coverage confirmed', 'Claim denied', 'Reserve established', 'Fault determined', 'Settlement calculated', 'Payment authorized', 'Claim closed', 'Claim reopened', 'Credit accepted after close', 'Hold applied'],
          invariants: [
            { id: 'INV-ADJUD-snapshot-basis', text: 'A claim adjudicates only against the stored coverage snapshot as at the date of loss — never a live policy call', fr: 'FR3' },
            { id: 'INV-ADJUD-coverage-carries-limits', text: 'Every coverage decision carries limits, deductibles and endorsement effects (OPCF 47R elections)', fr: 'FR4' },
            { id: 'INV-ADJUD-reserve-evented-authority', text: 'Every reserve move is evented, and authorization respects the handler\u2019s authority limit', fr: 'FR5' },
            { id: 'INV-ADJUD-instructed-not-settled', text: 'The money state is instructed-not-yet-settled until Claim payments\u2019 outcome event returns', fr: 'FR6' },
            { id: 'INV-ADJUD-holds-gate', text: 'No payment authorization and no closure while any hold is open' },
            { id: 'INV-ADJUD-closed-append-only', text: 'A closed file is never edited — late money lands as new credit entries' },
            { id: 'INV-ADJUD-decisions-append-only', text: 'Reopening appends a new decision version; every prior decision stays on record' },
          ],
        },
        {
          id: 'AGG-REPAIRCASE', name: 'Repair case', context: 'CTX-REPAIR', ucs: [],
          shape: {
            description: 'One case per appraisal request: the assignment, the estimate of record with its appended supplements, and the verification evidence. Over the total-loss line, the case ends in a handover, not a repair.',
            tables: [
              { name: 'repair_case', purpose: 'the root — one row per appraisal request', columns: [
                { name: 'case_id', role: 'id', type: 'string', desc: 'One per request from adjudication.' },
                { name: 'claim_number', role: 'ref', refTo: 'Claim file (Claim adjudication)', type: 'string', desc: 'The requesting file — referenced, never joined.' },
                { name: 'stage', type: 'enum', desc: 'The state machine\u2019s pointer.' },
                { name: 'shop', role: 'ref', refTo: 'Network shop (partner registry)', type: 'string', desc: 'Who has the vehicle.' },
                { name: 'coverage_ceiling', type: 'money', desc: 'The limit the estimate works under — from the request, not the reserve.' },
              ] },
              { name: 'estimate_line', owned: true, purpose: 'the estimate of record — lines priced against guide times and rates', columns: [
                { name: 'line_no', role: 'id', type: 'number', desc: 'One row per damage line.' },
                { name: 'work_and_parts', type: 'structured', desc: 'What is repaired or replaced, at what rate.' },
                { name: 'amount', type: 'money', desc: 'The line\u2019s price — the record\u2019s total is their sum.' },
              ] },
              { name: 'supplement', owned: true, purpose: 'hidden damage — appends to the estimate of record, never replaces', columns: [
                { name: 'supplement_no', role: 'id', type: 'number', desc: 'One per discovery, in order.' },
                { name: 'reason_and_amount', type: 'text + money', desc: 'What was found and what it adds.' },
                { name: 'approved_at', type: 'date', desc: 'Empty = found but not yet approved — work waits.' },
              ] },
              { name: 'verification', owned: true, purpose: 'the evidence the sign-off stands on', columns: [
                { name: 'evidence_refs', type: 'refs', desc: 'Photos, invoices, certification — by reference.' },
                { name: 'verified_by_at', type: 'who/when', desc: 'Who signed the completed work, and when.' },
              ] },
            ],
          },
          commands: ['Open the appraisal assignment', 'Accept the assignment', 'Price the estimate', 'Approve estimate & supplements', 'Verify the repair'],
          events: ['Appraisal requested', 'Assignment accepted', 'Estimate received', 'Threshold breach declared', 'Estimate approved', 'Supplement approved', 'Repair completed', 'Repair verified'],
          invariants: [
            { id: 'INV-REPAIR-one-estimate-of-record', text: 'One estimate of record per case — supplements append to it, never replace it' },
            { id: 'INV-REPAIR-threshold-hands-over', text: 'An estimate over the total-loss line hands the vehicle over — coordination never settles a total loss itself', fr: 'FR9' },
          ],
        },
        {
          id: 'AGG-PAYLEDGER', name: 'Payment ledger', context: 'CTX-PAYMENTS', ucs: [],
          shape: {
            description: 'One ledger per claim: instructions in, disbursements out, credits back — append-only, the single truth about the money. Every entry carries the thread back to who authorized and what executed.',
            tables: [
              { name: 'payment_ledger', purpose: 'the root — one row per claim', columns: [
                { name: 'claim_number', role: 'id', type: 'string', desc: 'One ledger per claim — the identity payments shares with everyone.' },
                { name: 'balance', type: 'money', desc: 'Instructed \u00b7 dispatched \u00b7 settled \u00b7 credited — derived from the entries, never edited.' },
              ] },
              { name: 'instruction', owned: true, purpose: 'one row per payment instruction — the exactly-once boundary', columns: [
                { name: 'instruction_id', role: 'id', type: 'string', desc: 'The idempotency key — a replay lands on this row and stops.' },
                { name: 'payee_amount_line', type: 'structured', desc: 'Who, how much, against which coverage line.' },
                { name: 'authority_ref', type: 'string', desc: 'Who authorized, under which limit — the audit thread.' },
                { name: 'status', type: 'enum', desc: 'instructed \u00b7 dispatched \u00b7 settled \u00b7 failed.' },
              ] },
              { name: 'disbursement', owned: true, purpose: 'the execution record per dispatch', columns: [
                { name: 'dispatched_at', role: 'id', type: 'date', desc: 'When it left for execution.' },
                { name: 'method_and_outcome', type: 'structured', desc: 'How it moved, and what execution reported back.' },
                { name: 'failure_reason', type: 'text', desc: 'Present only on a bounce — never silent.' },
              ] },
              { name: 'credit', owned: true, purpose: 'money back in — salvage and recovery, append-only', columns: [
                { name: 'credit_id', role: 'id', type: 'string', desc: 'One per receipt.' },
                { name: 'source_and_amount', type: 'enum + money', desc: 'salvage \u00b7 recovery, and what came back.' },
                { name: 'origin_ref', role: 'ref', refTo: 'Salvage case / Recovery case', type: 'string', desc: 'The case that produced the money.' },
              ] },
            ],
          },
          commands: ['Receive the instruction', 'Dispatch the payment', 'Confirm settlement', 'Record a failure', 'Book a credit'],
          events: ['Payment instruction received', 'Instruction dispatched', 'Payment failed', 'Settlement confirmed', 'Credit received'],
          invariants: [
            { id: 'INV-PAYMENTS-ledger-single-truth', text: 'The ledger is the single truth about the money — instructed, dispatched, settled and credited, per claim', fr: 'FR6' },
            { id: 'INV-PAYMENTS-append-only', text: 'Entries append; no entry is ever edited or deleted' },
          ],
        },
        {
          id: 'AGG-SALVAGECASE', name: 'Salvage case', context: 'CTX-TOTALLOSS', ucs: ['UC7'],
          shape: {
            description: 'One case per vehicle: the valuation the offer stands on, the settlement with liens read first, the title\u2019s movement, and the disposition that sends the proceeds home through the ledger.',
            tables: [
              { name: 'salvage_case', purpose: 'the root — one row per vehicle', columns: [
                { name: 'case_id', role: 'id', type: 'string', desc: 'One per threshold breach.' },
                { name: 'claim_number', role: 'ref', refTo: 'Claim file (Claim adjudication)', type: 'string', desc: 'The claim behind the vehicle.' },
                { name: 'vin', type: 'string', desc: 'The vehicle — one disposition, ever.' },
                { name: 'stage', type: 'enum', desc: 'The state machine\u2019s pointer.' },
                { name: 'acv_and_offer', type: 'money', desc: 'Actual cash value and the offer that stood on it.' },
              ] },
              { name: 'valuation', owned: true, purpose: 'the comparables the offer stands on', columns: [
                { name: 'comparable_refs', type: 'refs', desc: 'Market evidence for this vehicle and market.' },
                { name: 'method_and_at', type: 'structured', desc: 'How the value was reached, and when.' },
              ] },
              { name: 'lien', owned: true, purpose: 'registered interests — read before any funds move', columns: [
                { name: 'holder', role: 'id', type: 'string', desc: 'Who holds the interest.' },
                { name: 'amount_and_cleared', type: 'money + date', desc: 'What is owed, and when it cleared — empty gates settlement.' },
              ] },
              { name: 'disposition', owned: true, purpose: 'the sale — proceeds home through the ledger', columns: [
                { name: 'buyer_and_proceeds', type: 'structured + money', desc: 'Who bought, for how much.' },
                { name: 'ledger_entry', role: 'ref', refTo: 'Payment ledger (Claim payments)', type: 'string', desc: 'The credit the proceeds became.' },
              ] },
            ],
          },
          commands: ['Open from the threshold breach', 'Value the vehicle', 'Offer & accept the settlement', 'Brand & transfer title', 'Dispose the salvage'],
          events: ['Threshold breach received', 'Vehicle valued', 'Settlement offered & accepted', 'Title branded & transferred', 'Salvage disposed'],
          invariants: [
            { id: 'INV-TOTALLOSS-one-vehicle-one-disposition', text: 'One vehicle, one disposition — settlement to the owner and recovery from the asset are the same file, never two', fr: 'FR9' },
            { id: 'INV-TOTALLOSS-lien-before-funds', text: 'Funds move only after lien and title status are read' },
          ],
        },
        {
          id: 'AGG-RECOVERYCASE', name: 'Recovery case', context: 'CTX-RECOVERY', ucs: [],
          shape: {
            description: 'One case per referral: the frozen position from the closed claim, the demands built on it, and the receipts that go home through the ledger. The claim file itself is never touched.',
            tables: [
              { name: 'recovery_case', purpose: 'the root — one row per referral', columns: [
                { name: 'case_id', role: 'id', type: 'string', desc: 'One per referral from adjudication.' },
                { name: 'claim_number', role: 'ref', refTo: 'Claim file (Claim adjudication)', type: 'string', desc: 'The closed file behind the case — read-only by doctrine.' },
                { name: 'stage', type: 'enum', desc: 'The state machine\u2019s pointer.' },
                { name: 'fault_position', type: 'structured', desc: 'The determined fault and its basis, as referred — frozen.' },
                { name: 'quantum_paid', type: 'money', desc: 'What the file actually spent — the ceiling of every demand.' },
              ] },
              { name: 'demand', owned: true, purpose: 'one row per demand issued', columns: [
                { name: 'demand_id', role: 'id', type: 'string', desc: 'One per party demanded.' },
                { name: 'party_and_amount', type: 'structured + money', desc: 'Who owes, and how much is claimed — never above the ceiling.' },
                { name: 'issued_at_response_due', type: 'dates', desc: 'The clock the escalation policy watches.' },
              ] },
              { name: 'receipt', owned: true, purpose: 'money back — through the ledger, never directly', columns: [
                { name: 'receipt_id', role: 'id', type: 'string', desc: 'One per payment received.' },
                { name: 'amount', type: 'money', desc: 'What came back.' },
                { name: 'ledger_entry', role: 'ref', refTo: 'Payment ledger (Claim payments)', type: 'string', desc: 'The credit it became on the ledger.' },
              ] },
            ],
          },
          commands: ['Open from the referral', 'Build & issue the demand', 'Receive the recovery', 'Close the case'],
          events: ['Recovery referred', 'Demand issued', 'Recovery received', 'Recovery closed'],
          invariants: [
            { id: 'INV-RECOVERY-closed-claim-basis', text: 'A recovery case exists only against a closed claim\u2019s facts' },
            { id: 'INV-RECOVERY-credits-via-payments', text: 'Every receipt credits the claim through Claim payments, never directly' },
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
