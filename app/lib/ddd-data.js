/* ============================================================
   Cynergis — Strategic DDD + Realization decisions (window.__DDD__).
   The opening move of Design (D-026): bounded contexts + ubiquitous
   language + distillation (core|supporting|generic) + context map,
   then a per-capability REALIZATION decision on three axes —
   form × composition × surface — preferring the least-agentic
   combination that satisfies the capability.

   Shaped as knowledge-graph nodes/edges:
     BoundedContext  groups→  UseCase (capability ≈ UC*)
     Realization     realizes→ UseCase  (form, composition, surface, testStrategy)
   Capability skills (atomic) compose into the subdomain (compound) skill.
   ============================================================ */
window.__DDD__ = {
  byProduct: {
    fraud: {
      // ---- strategic DDD: bounded contexts (subdomains) ----
      contexts: [
        { id: 'BC-DEC', name: 'Decisioning', classification: 'core',
          language: [
            { term: 'score', def: 'The model’s real-time risk score for an authorization (0–1).' },
            { term: 'risk band', def: 'The low / medium / high bucket a score falls into — it drives the decision.' },
            { term: 'threshold', def: 'The score cut-offs that map a score to a risk band and an action.' },
            { term: 'decision', def: 'The block / approve / step-up outcome this context commits for an authorization.' },
            { term: 'step-up', def: 'An extra verification challenge issued on medium risk instead of a hard block.' },
          ],
          capabilities: ['UC1', 'UC2', 'UC4'],
          note: 'Decides every card authorization in real time — scores the risk, then approves, blocks, or issues a step-up within the network timeout, with an explanation for every decision. The Core subdomain: the scoring model, thresholds and step-up logic live here, and everything downstream reacts to its decisions.',
          summary: 'Decisioning is the real-time brain of fraud control: for every card authorization it scores risk, then approves, blocks, or steps-up within the network timeout — and emits the decision with an explanation. As the Core subdomain it owns the scoring model, the thresholds, and the step-up logic, and earns the deepest investment. Everything downstream — cases, customer alerts — is a reaction to a decision made here.',
          // inbound data this context needs (its own — not the product-wide list)
          needs: [
            { from: 'Card Authorization Switch', data: 'the real-time authorization stream + the decision callback that holds or approves a transaction' },
            { from: 'Feature Store', data: 'low-latency features + lineage feeding the scoring model' },
            { from: 'Model Registry', data: 'the active, versioned scoring model' },
            { from: 'Auth Vendor', data: 'the step-up challenge result (via the ACL)' },
          ],
          // Context Owner Agent (D-029) — rich, because this is the Core context
          agent: {
            name: 'Decisioning Context Owner',
            tier: 'Supervised',
            charter: 'I own the real-time fraud Decisioning context — scoring, the block/approve decision, and step-up. I keep its model consistent, enforce its invariants, and drive its development.',
            does: 'It scores every card authorization in real time, decides to approve, block, or step it up — within the network timeout — and emits the decision with a human-readable explanation. High-risk transactions are blocked and the customer is notified; medium-risk ones get a step-up challenge instead of a hard block. A customer “it was me” releases the hold, and analyst dispositions flow back as labelled outcomes that keep the model honest.',
            value: ['Cut fraud losses ~55% (18 → 7 bps)', 'Halve false declines (6.2% → 2.5%)', 'Decide within the network timeout (p95 < 300 ms)'],
            skill: { id: 'decisioning-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/decisioning-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Authorization', 'Step-up Challenge'],
            /* D-029 via the extractor (D-086): the domain agent is the context's
               compound skill — it composes the built capability skills */
            composes: ['SKL-DEC-explain', 'SKL-DEC-reverse', 'SKL-DEC-tune', 'SKL-DEC-shadow'],
            slice: { aggregates: 2, invariants: 5, events: 7, policies: 4 },
            sources: [
              { label: 'Fraud strategy memo', type: 'doc', href: 'https://docs.cynergis.ai/wealthgrow/fraud-strategy-memo' },
              { label: 'Auth-switch API spec', type: 'spec', href: 'https://docs.cynergis.ai/wealthgrow/auth-switch-api' },
              { label: 'Model-risk policy (SR 11-7)', type: 'policy', href: 'https://docs.cynergis.ai/wealthgrow/model-risk-policy' },
            ],
            assets: [
              { kind: 'skill',  name: 'decisioning.skill.md',   note: 'Charter · language · procedures' },
              { kind: 'script', name: 'score_transaction.py',   note: 'Realizes UC1 — LLM-function workflow' },
              { kind: 'script', name: 'apply_decision.py',      note: 'Realizes UC2 — deterministic' },
              { kind: 'script', name: 'stepup_saga.py',         note: 'Realizes UC4 — the Step-up Process Manager (C6)' },
              { kind: 'ref',    name: 'ACL · Auth Vendor',      note: 'Published-language contract at the boundary' },
            ],
            drives: ['Extend scoring features', 'Tune thresholds (gated)', 'Propose new capabilities in this context'],
            guardrails: ['Cannot redraw its own boundary — that is a system-level call', 'Model / invariant changes need a human gate', 'Reads neighbouring contexts only via published language'],
          },
          /* The subdomain's second agent (D-065): the OPERATIONS agent — used by
             humans in live operation. Defined here in Design; its as-built form
             (MCP toolset, evals, trust ladder) is the Build › Agents register. */
          opsAgent: {
            name: 'Decisioning Agent',
            asBuilt: 'AGT-DEC',
            charter: 'Used by the fraud-ops humans in live operation — it assists, executes reversible actions, investigates, and responds, always through the product\u2019s own role-scoped surfaces.',
            permissions: [
              'Role-scoped production MCP only — acts + observes, never the event path',
              'No repository or code access — building belongs to the domain agent',
              'Governance acts stay human (D-056)',
            ],
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Autonomous', shared: true },
              { ref: 'SKL-DEC-explain', name: 'Explain a decision', tier: 'Autonomous' },
              { ref: 'SKL-DEC-reverse', name: 'Release a soft-hold', tier: 'Supervised' },
              { ref: 'SKL-DEC-tune', name: 'Propose a threshold change', tier: 'Suggest' },
              { ref: 'SKL-DEC-shadow', name: 'Run a shadow evaluation', tier: 'Suggest', planned: true },
            ],
          } },
        { id: 'BC-CASE', name: 'Case Management', classification: 'supporting',
          language: [
            { term: 'case', def: 'A flagged authorization queued for an analyst to resolve.' },
            { term: 'triage', def: 'The analyst’s review of a case to confirm or clear fraud.' },
            { term: 'disposition', def: 'The recorded outcome of a case (confirmed / cleared) with a rationale.' },
            { term: 'hold', def: 'A reversible block an analyst places or releases across linked cards.' },
            { term: 'evidence', def: 'The score explanation + linked transactions assembled for the case.' },
          ],
          capabilities: ['UC3'],
          note: 'Runs the analyst workflow over the authorizations Decisioning flags — each case is opened, triaged and dispositioned, and the labelled outcome feeds back to improve the model. A Supporting subdomain: essential to close the loop, but not the differentiator.',
          summary: 'Case Management runs the analyst workflow over the authorizations Decisioning flags or blocks. It owns the case lifecycle — open, assign, triage, dispose — and the evidence assembled for each case, and feeds labelled outcomes back to the model. A Supporting subdomain: essential to closing the loop, but not the differentiator, so it gets solid tooling rather than the deepest agentic investment.',
          // inbound data this context needs (its own — different from Decisioning's)
          needs: [
            { from: 'Decisioning', data: 'the flagged case — the score explanation + the linked transactions' },
            { from: 'Case Manager', data: 'the case store + the disposition / hold API' },
          ],
          // Context Owner Agent — moderate (Supporting context)
          agent: {
            name: 'Case Management Context Owner',
            tier: 'Assisted',
            charter: 'I own the analyst case context — triage, disposition, and holds over flagged authorizations. I keep its model consistent and drive its tooling.',
            does: 'It runs the analyst workflow over flagged authorizations: a case is opened, assigned, triaged with the score explanation and linked transactions, and dispositioned — confirmed fraud or cleared, with a recorded rationale — feeding labelled outcomes back to the model.',
            value: ['Higher confirmed-fraud rate', 'Fewer false referrals', 'Defensible, audited dispositions'],
            skill: { id: 'case-management-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/case-management-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Case'],
            composes: ['SKL-CASE-assemble', 'SKL-CASE-draft'],
            slice: { aggregates: 1, invariants: 3, events: 4, policies: 1 },
            sources: [
              { label: 'Analyst ops runbook', type: 'doc', href: 'https://docs.cynergis.ai/wealthgrow/analyst-ops-runbook' },
              { label: 'Case Manager API v2 (pending)', type: 'spec', href: 'https://docs.cynergis.ai/wealthgrow/case-manager-api-v2' },
              { label: 'Analyst interview — triage pain points', type: 'capture', href: '#sources' },
            ],
            assets: [
              { kind: 'skill',  name: 'case-management.skill.md', note: 'Charter · language · procedures' },
              { kind: 'script', name: 'assemble_case.py',         note: 'Realizes UC3 — agent assist + human-in-loop' },
            ],
            drives: ['Improve triage assist', 'Propose disposition policies (gated)'],
            guardrails: ['Boundary owned at the system level', 'Disposition logic changes need a human gate'],
          },
          opsAgent: {
            name: 'Case Agent',
            asBuilt: 'AGT-CASE',
            charter: 'Used by the analysts in live operation — it assembles evidence, drafts dispositions for human confirmation, and answers case questions.',
            permissions: [
              'Role-scoped production MCP only — the analyst console\u2019s own surfaces',
              'No repository or code access — building belongs to the domain agent',
              'Governance acts stay human (D-056)',
            ],
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Supervised', shared: true },
              { ref: 'SKL-CASE-assemble', name: 'Assemble case evidence', tier: 'Supervised' },
              { ref: 'SKL-CASE-draft', name: 'Draft a disposition', tier: 'Suggest' },
            ],
          } },
        { id: 'BC-NOTIFY', name: 'Customer Notification', classification: 'generic',
          language: [
            { term: 'notification', def: 'A customer-facing alert about a decision (e.g. a block).' },
            { term: 'channel', def: 'The delivery medium — push / SMS / in-app.' },
            { term: 'template', def: 'The reusable message format for a notification type.' },
          ],
          capabilities: [],
          note: 'Turns a block into a customer-facing alert — push, SMS or in-app, with a confirm-or-deny action — and relays the customer’s response back. A Generic subdomain: it owns nothing of the fraud domain, so buy an off-the-shelf service behind a thin adapter.',
          summary: 'Customer Notification turns a decision into a customer-facing alert across push, SMS, and in-app. It owns nothing of the fraud domain — no scoring, no cases — only the delivery of a message. A Generic subdomain: an off-the-shelf notification service behind a thin adapter, driven entirely by Decisioning’s published alert contract.',
          // Generic context → no bespoke owner agent (scale richness with coreness)
          agent: null },
      ],

      // ---- context map: relationships between contexts (DDD context mapping) ----
      // each edge carries the integration PATTERN, the UPSTREAM end, what it carries, and how the flow works
      relations: [
        { from: 'BC-DEC', to: 'BC-CASE', pattern: 'customer-supplier', upstream: 'BC-DEC', label: 'flagged cases',
          flow: 'When Decisioning blocks or escalates an authorization it publishes a case onto the queue. Decisioning is the upstream supplier — it owns the decision and the case event; Case Management is the downstream customer and negotiates what each case must carry (score explanation, linked transactions). No model is shared — only the case event crosses the boundary.' },
        { from: 'BC-DEC', to: 'BC-NOTIFY', pattern: 'open-host-service', upstream: 'BC-DEC', label: 'customer alert',
          flow: 'On a block, Decisioning calls the generic Notification service through a stable, published alert contract. Decisioning exposes an open-host interface and knows nothing about channels or templates — Notification translates the alert into push / SMS / in-app. The call is one-way and fire-and-forget.' },
        { from: 'EXT-AUTH', to: 'BC-DEC', pattern: 'anti-corruption-layer', upstream: 'EXT-AUTH', label: 'step-up challenge',
          flow: 'The external Auth Vendor performs the step-up challenge. Decisioning is downstream but refuses to conform: an anti-corruption layer translates the vendor’s API and model into Decisioning’s own “step-up” concept, so a vendor change is absorbed at the boundary and never leaks into the core model.' },
      ],
      externals: [{ id: 'EXT-AUTH', name: 'Auth Vendor', note: 'External step-up auth provider (anti-corruption layer).' }],

      // ---- per-capability realization decisions (form × composition × surface) ----
      realizations: [
        { ucId: 'UC1', context: 'BC-DEC', components: ['C1', 'C2', 'C5'], form: 'llm-function', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'An authorization arrives on the card-auth bus (real-time stream) — synchronous, within the network timeout.',
          nodes: ['code · fetch features', 'llm-function · risk band', 'code · threshold gate'],
          testStrategy: 'Eval set of labelled transactions + p95<300ms latency regression; unit tests on the threshold gate.',
          rationale: 'Repeatable shape, bounded judgment per transaction, tight latency → a typed workflow, not an agent. Least-agentic that fits.',
          enforces: [{ inv: 'Every decision carries a risk band + explanation', by: 'typed output schema + eval assertion' }] },
        { ucId: 'UC2', context: 'BC-DEC', components: ['C1', 'C4'], form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'Domain event "Authorization scored = high" — fired by UC1 within the same decision flow.',
          nodes: ['code · apply block', 'llm-function · customer explanation', 'service · notification (generic)'],
          testStrategy: 'Unit tests on block rules; contract test against the Notification service; small eval on explanation text.',
          rationale: 'Mostly deterministic action plus an off-the-shelf notification. Build the minimum; reuse the generic context.',
          enforces: [
            { inv: 'A decision cannot be both approved and blocked', by: 'aggregate validation (code)' },
            { inv: 'An authorization is decided exactly once', by: 'idempotent command handler (code)' },
          ] },
        { ucId: 'UC3', context: 'BC-CASE', components: ['C3'], form: 'agent', composition: 'workflow', surface: 'cowork', agency: 'human-in-loop',
          trigger: 'Policy POL-2: "Authorization blocked" → a case is opened on the analyst queue (cross-context, from Decisioning).',
          nodes: ['agent · assemble case + evidence', 'human · disposition decision', 'code · record disposition'],
          testStrategy: 'Trajectory/guardrail harness for the assist agent; decision-quality review on dispositions; audit-completeness checks.',
          rationale: 'Open-ended evidence-gathering, but the disposition is irreducible human judgment + accountability → agent assist + human-in-loop via Cowork, not full autonomy.',
          enforces: [
            { inv: 'A disposition requires a recorded rationale', by: 'human checklist + required UI field' },
            { inv: 'Only the assigned analyst can dispose a case', by: 'authz policy + agent guardrail' },
          ] },
        { ucId: 'UC4', context: 'BC-DEC', components: ['C6'], form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated', provisional: true,
          trigger: 'Event stepup.requested — the Decision Service hands a medium-risk hold to the Step-up Process Manager (saga).',
          nodes: ['code · risk-band gate', 'saga · Step-up Process Manager (owns AGG-STEPUP)', 'service · step-up auth vendor (ACL)', 'code · record outcome'],
          testStrategy: 'Integration/contract tests against the auth vendor sandbox; saga timeout tests (resolve vs expire); unit tests on the gate.',
          rationale: 'Deterministic integration behind an ACL, coordinated by a small process manager that owns the challenge lifecycle — no bespoke app, no agent. (Provisional: gated on the vendor contract — see Delivery board blocker.)',
          enforces: [
            { inv: 'Step-up is issued only on a medium risk band', by: 'risk-band gate (code)' },
            { inv: 'A challenge expires after its timeout', by: 'workflow timer (code)' },
          ] },
      ],
    },

    /* ════════ ClaimsCore (Meridian, R2 — D-105) ════════
       The product PACKAGES four pre-existing walls (D-090): these BC entries
       mirror kg/org/domains/claims.js — the member graph is the source of
       truth; this seed is its Design-surface projection. canvas:false —
       the storming flows / interactive maps arrive in a later R2 pass. */
    'PROD-CLAIMSCORE': {
      /* D-153: the accepted cut supersedes the D-108 map (cc-contextmap stays registered) */
      contextMapId: 'cm-claims-v2',
      systemMapId: 'cc-systemmap',
      contexts: [
        /* ── D-154: the ACCEPTED CUT arrives wall by wall; the D-090 walls
           below remain during the migration (rehome, never remove) ── */
        { id: 'CTX-INTAKE', name: 'Intake & registration', classification: 'core',
          language: [
            { term: 'loss report', def: 'The record of the event as reported — circumstances, parties, vehicles. Not yet a claim.' },
            { term: 'door', def: 'A contract into the same action: the portal pane, the workbench intake, the police topic. Split by spec, never by caller.' },
            { term: 'merge', def: 'A later channel touching the same loss is absorbed — never a duplicate, nothing lost, provenance kept.' },
            { term: 'notice date', def: 'The official date the loss reached us. Legal weight; recorded, not inferred.' },
            { term: 'registration', def: 'The moment the completed report becomes a numbered claim — the seam to adjudication.' },
          ],
          capabilities: [],
          note: 'The accepted cut\u2019s front door: the doors and the moment a request becomes a numbered claim (D-152/D-153).',
          summary: 'One aggregate from the first word of a loss to a numbered claim. Every door triggers the same action with the same parameter schema; a licensed person closes intake; registration publishes the claim-opened seam that adjudication consumes. Design-level storm authored — every \u26a0 on its cards is an unmined industry assertion, which is the legacy-mining backlog.',
          needs: [
            { from: 'Mainframe policy system (ACL)', data: 'the coverage snapshot request keyed to date of loss — the strangler seam' },
            { from: 'Claims Workbench (product to be recorded)', data: 'the licensed intake surface for phone and broker doors' },
          ] },
        { id: 'CTX-ADJUD', name: 'Claim adjudication', classification: 'core',
          language: [
            { term: 'claim', def: 'The adjudication file: coverages engaged, reserves, fault, decisions, lifecycle state. Born from the claim-opened seam.' },
            { term: 'snapshot', def: 'The immutable coverage picture as at date of loss — adjudication\u2019s only meaning of \u201cpolicy\u201d.' },
            { term: 'decision version', def: 'Decisions are appended, never edited — reopen supersedes, the history is the audit trail.' },
            { term: 'hold', def: 'A typed stop on the file (SIU, dispute, litigation). While one stands, nothing pays. Released only by its owner.' },
            { term: 'authority band', def: 'What an adjuster may approve; breaches are prevented in-flow, not audited after.' },
            { term: 'closed', def: 'A lifecycle state, not a tombstone: a closed file still accepts credits and can reopen.' },
          ],
          capabilities: [],
          note: 'The accepted cut\u2019s centre of gravity: verification, reserves, fault, settlement, authorization — and the claim lifecycle (D-152/D-153).',
          summary: 'One aggregate from the claim-opened seam to a closed file that still listens. The sketch-facts are first-class events here: holds gate payment authorization in-flow, reopen appends a new decision version over an immutable history, and post-close credits land without re-adjudication. Publishes the appraisal-request, payment-instruction and recovery-referred seams.',
          needs: [
            { from: 'Intake & registration', data: 'the claim-opened seam — the registered claim with the triage payload (customer\u2013supplier)' },
            { from: 'Repair & estimate coordination', data: 'the repair-verified seam with the estimate of record' },
            { from: 'Claim payments', data: 'payment-settled confirmations and post-close credits' },
            { from: 'Fraud & SIU / Disputes', data: 'typed holds in; findings and outcomes back as facts' },
          ] },
        { id: 'CTX-REPAIR', name: 'Repair & estimate coordination', classification: 'supporting',
          language: [
            { term: 'repair case', def: 'The file for one vehicle\u2019s pricing and repair — assignment through verification.' },
            { term: 'estimate of record', def: 'The approved estimate plus approved supplements — the number everything downstream trusts.' },
            { term: 'supplement', def: 'Hidden damage priced mid-repair; bounded by its own authority band.' },
            { term: 'threshold', def: 'Estimate vs actual cash value — breach hands the vehicle to the write-off path.' },
          ],
          capabilities: [],
          note: 'The claims-side authority over an externally executed repair (D-152/D-153).',
          summary: 'From the appraisal request to a verified repair: the shops execute through the partner portal, coordination approves — assignment, pricing, approval, supplements, verification. Publishes repair-verified back to adjudication and threshold-breach to Total loss.',
          needs: [
            { from: 'Claim adjudication', data: 'the appraisal-request seam (customer\u2013supplier)' },
            { from: 'Repair Network Portal', data: 'the partner surface: acceptance, estimates, completion' },
          ] },
        { id: 'CTX-PAYMENTS', name: 'Claim payments', classification: 'supporting',
          language: [
            { term: 'owed', def: 'Instructed-not-yet-settled — the ledger state between the decision and the money moving.' },
            { term: 'settled', def: 'Confirmation returned; the money verifiably landed.' },
            { term: 'credit', def: 'Money in — salvage proceeds, recoveries — booked against the claim, even after close.' },
            { term: 'void & reissue', def: 'The failed-payment doctrine: owed stays owed until settled; nothing orphans.' },
          ],
          capabilities: [],
          note: 'THE extracted context (D-152): the owed/settled ledger with one owner.',
          summary: 'Adjudication decides; this ledger keeps the truth about the money. Instruction in over the new seam, dispatch over the execution contract (legacy today, modernized later, unnoticed), settlement confirmations back, credits in from salvage and recovery. Reconciliation has one owner: this ledger.',
          needs: [
            { from: 'Claim adjudication', data: 'the payment-instruction seam (customer\u2013supplier)' },
            { from: 'Legacy payment execution', data: 'settlement confirmations — conformist behind the contract' },
            { from: 'Total loss & Recovery', data: 'credits in: salvage proceeds and recovered amounts' },
          ] },
        { id: 'CTX-TOTALLOSS', name: 'Total loss & salvage', classification: 'supporting',
          language: [
            { term: 'actual cash value', def: 'What the car was worth the day of the loss — the market\u2019s number, not the estimate\u2019s.' },
            { term: 'branding', def: 'The regulated title outcome: salvage, rebuilt, irreparable.' },
            { term: 'disposition', def: 'One vehicle, one outcome: settled with the owner, branded, disposed, proceeds booked.' },
          ],
          capabilities: [],
          note: 'The write-off path: valuation, settlement, title, disposal (D-152/D-153).',
          summary: 'Entered on the threshold-breach seam with the estimate of record. Valuation is vendor-conformist behind an ACL; the settlement travels the normal adjudication path; disposal proceeds return as credits to Claim payments.',
          needs: [
            { from: 'Repair & estimate coordination', data: 'the threshold-breach seam with the estimate of record' },
            { from: 'Valuation vendors / auction network', data: 'market valuations and disposal results, behind ACLs' },
          ] },
        { id: 'CTX-RECOVERY', name: 'Recovery & subrogation', classification: 'supporting',
          language: [
            { term: 'recovery case', def: 'The pursuit of what others owe — opened from a closed claim\u2019s facts.' },
            { term: 'demand', def: 'The inter-company ask, under the arbitration process.' },
            { term: 'deductible return', def: 'The claimant\u2019s share comes back first when a recovery lands.' },
          ],
          capabilities: [],
          note: 'Recovers what others owe, against a closed claim, on its own clock (D-152/D-153).',
          summary: 'Opened on the post-close recovery-referred seam. It reads the closed file, never reopens it; recovered money returns as credits through Claim payments, deductible first.',
          needs: [
            { from: 'Claim adjudication', data: 'the recovery-referred seam (customer\u2013supplier, post-close)' },
            { from: 'Other carriers', data: 'inter-company settlements' },
          ] },
        { id: 'CTX-FNOL', name: 'Notice of loss', classification: 'core',
          superseded: 'Intake & registration',
          language: [
            { term: 'loss report', def: 'The record of the event as reported: circumstances, parties, vehicles, injuries alleged. Not yet a claim.' },
            { term: 'first notice', def: 'The judgement-heavy intake conversation that shapes the entire claim — not a call-centre transaction.' },
            { term: 'severity score', def: 'Model-assisted triage estimate driving assignment and initial reserve; recalculated as facts land.' },
            { term: 'assignment', def: 'Routing of the report to desk, field, AB or fast-track lanes based on severity and coverage shape.' },
            { term: 'channel', def: 'Phone, app, web, broker or police feed — ways INTO the same model, never separate models.' },
          ],
          capabilities: ['UC1', 'UC2', 'UC8'],
          note: 'Owns the moment a loss enters the company, through any channel, and the triage that sets severity, reserves and assignment.',
          summary: 'The front door of the domain: one loss event, one report, however many channels touch it. Its triage decision shapes everything downstream — which is why the intake conversation is licensed judgment, not scripting, and why the severity model only ASSISTS it (promoted to Operate by APR-2, audited at a 10% sample).',
          needs: [
            { from: 'Underwriting & Policy', data: 'policy-in-force check + the coverage snapshot request keyed to date of loss' },
            { from: 'Party, vehicle & driver platform', data: 'party resolution for insureds, claimants and third parties at intake' },
            { from: 'Telephony platform (vendor)', data: 'ACD/IVR routing into the intake workbench — bought, thin' },
          ],
          agent: {
            name: 'Notice-of-loss Builder', tier: 'PR-gated',
            charter: 'I own the Loss report model — its one-report invariant, the four intake channels, and the snapshot-request seam. I design and implement with the team; my writes travel the gated path into this context\u2019s spec.',
            does: 'Knows the model, the invariant and every seam on this wall; drafts spec changes, module code and contract updates as pull requests the team reviews.',
            value: ['Digital first notice 22% → 60%', 'Report completeness at handoff', 'Time from loss to report'],
            skill: { id: 'fnol-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/fnol-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Loss report'],
            composes: ['SKL-FNOL-triage'],
            slice: { aggregates: 1, invariants: 1, events: 3, policies: 1 },
            sources: [{ label: 'Auto-insurer org site — Notice of loss page', type: 'doc', href: 'ddd/auto-insurer-org-site_3.html' }],
            assets: [
              { kind: 'skill', name: 'fnol.skill.md', note: 'Charter · language · procedures' },
              { kind: 'script', name: 'triage_score.py', note: 'Realizes UC2 — the severity model behind SKL-FNOL-triage' },
              { kind: 'ref', name: 'Snapshot request contract', note: 'Customer–supplier seam to Underwriting & Policy' },
            ],
            drives: ['Channel coverage', 'Triage-model features', 'Report-completeness rules'],
            guardrails: ['Cannot redraw its own boundary — a system-level call', 'Model and invariant changes need a human gate', 'No production access — the operations profile acts in production'],
          },
          opsAgent: {
            name: 'Notice-of-loss Operator', asBuilt: 'AGT-FNOL-OPS',
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Autonomous', shared: true },
              { ref: 'SKL-INTAKE-merge', name: 'Match & merge a multi-channel report', tier: 'Supervised' },
              { ref: 'SKL-INTAKE-lane', name: 'Set severity & suggest the lane', tier: 'Autonomous' },
              { ref: 'SKL-INTAKE-chase', name: 'Chase an incomplete report', tier: 'Suggest', planned: true },
            ],
            charter: 'Deployed at Operate (APR-2): sets initial severity and lane without per-file confirmation; adjusters audit a 10% sample.',
            permissions: ['Role-scoped production MCP — acts + observes only', 'No repository or code access', 'Governance acts stay human (D-056)'],
          } },
        { id: 'CTX-COVERAGE', name: 'Coverage & adjudication', classification: 'core',
          superseded: 'Claim adjudication + Claim payments',
          language: [
            { term: 'claim', def: 'The adjudication file: coverages engaged, reserves, liability position, payments, status. Distinct from the loss report that opened it.' },
            { term: 'snapshot', def: 'The immutable coverage picture as at date of loss — the Claims meaning of \u201cpolicy\u201d. Later policy changes never alter an open claim.' },
            { term: 'coverage decision', def: 'The determination that a coverage responds, with limits, deductibles and endorsement effects (OPCF 47R elections) applied.' },
            { term: 'reserve', def: 'Best estimate of ultimate cost, by coverage. Moves as facts develop; every move is evented for actuarial consumption.' },
            { term: 'authority', def: 'The band an adjuster may settle within; breaches are prevented in-flow, not audited after.' },
            { term: 'liability split', def: 'Fault determination under the Ontario fault rules, driving DCPD and recovery positions.' },
          ],
          capabilities: ['UC3', 'UC4', 'UC6'],
          note: 'Decides whether the policy responds and for how much — the centre of gravity of the domain.',
          summary: 'The centre of gravity: reserves, coverage determinations, liability and settlement authority against one model. Its defining move is TEMPORAL correctness — adjudicating against the immutable snapshot removes the run-time dependency on Underwriting entirely (the reference doc\u2019s canonical design-time-versus-run-time seam).',
          needs: [
            { from: 'Underwriting & Policy', data: 'the coverage snapshot event, recorded at intake, adjudicated against locally' },
            { from: 'Notice of loss', data: 'the completed loss report event that opens the claim, with triage payload' },
            { from: 'Fraud & SIU', data: 'investigation holds and findings that gate settlement on flagged files' },
          ],
          agent: {
            name: 'Claim Builder', tier: 'PR-gated',
            charter: 'I own the Claim model — the snapshot invariant, the reserve-eventing contract and every seam on this wall.',
            does: 'Keeps the adjudication model consistent; drafts coverage-rule changes, reserve-eventing updates and contract revisions as PRs.',
            value: ['Leakage 3.1% → 2.0%', 'Reserve adequacy drift', 'Settlement cycle time by lane'],
            skill: { id: 'claim-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/claim-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Claim'],
            composes: [],
            slice: { aggregates: 1, invariants: 3, events: 4, policies: 2 },
            sources: [{ label: 'Auto-insurer org site — Coverage & adjudication page', type: 'doc', href: 'ddd/auto-insurer-org-site_3.html' }],
            assets: [
              { kind: 'skill', name: 'claim.skill.md', note: 'Charter · language · procedures' },
              { kind: 'ref', name: 'CoverageSnapshot v3', note: 'The consumed customer–supplier contract' },
              { kind: 'ref', name: 'PaymentInstruction v2', note: 'The published event to Billing' },
            ],
            drives: ['Coverage-rule versions', 'Reserve suggestion features', 'Authority-band tuning (gated)'],
            guardrails: ['Coverage decisions are the adjuster\u2019s — never the agent\u2019s', 'Model and invariant changes need a human gate', 'No production access'],
          },
          opsAgent: {
            name: 'Coverage Operator', asBuilt: 'AGT-CLM-OPS',
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Autonomous', shared: true },
              { ref: 'SKL-ADJ-reserve', name: 'Suggest a reserve, drivers shown', tier: 'Suggest' },
              { ref: 'SKL-ADJ-authority', name: 'Flag an authority breach before it happens', tier: 'Autonomous' },
              { ref: 'SKL-ADJ-payprep', name: 'Prepare a payment instruction (never issue)', tier: 'Supervised' },
              { ref: 'SKL-ADJ-closure', name: 'Run the closure checklist & report the reds', tier: 'Suggest', planned: true },
            ],
            charter: 'Deployed at Assist: suggests reserves with drivers shown, flags authority breaches before they happen, prepares payment instructions — the adjuster decides.',
            permissions: ['Role-scoped production MCP — acts + observes only', 'Prepares payment instructions, never issues them', 'Governance acts stay human (D-056)'],
          } },
        { id: 'CTX-AB', name: 'Accident benefits', classification: 'core',
          deferredForward: true,
          language: [
            { term: 'benefit', def: 'A statutory entitlement stream (IRB, med/rehab, attendant care) with its own limits, waiting periods and offsets.' },
            { term: 'election', def: 'The insured\u2019s optional-benefit choices recorded via OPCF 47R at bind; consumed here as coverage facts.' },
            { term: 'offset', def: 'Collateral benefits (employer plans, CPP-D) netted against IRB — a calculation context of its own inside the model.' },
            { term: 'OCF form', def: 'The statutory form family (OCF-18 treatment plan, OCF-21 invoice) flowing through HCAI.' },
            { term: 'adjournment clock', def: 'SABS response timelines; missing one converts a decision into a deemed approval.' },
          ],
          capabilities: ['UC5'],
          note: 'Statutory accident benefits under the SABS — the most regulated subdomain in the company.',
          summary: 'The statutory heart of Ontario auto: benefits adjudicate against the SABS in force at the DATE OF LOSS plus the insured\u2019s elections, never current wording — statute as versioned data. The first-line risk seat is a team member here, not a reviewer: SABS clocks, LAT exposure and FSRA conduct are in-flow controls.',
          needs: [
            { from: 'Underwriting & Policy', data: '47R election facts inside the coverage snapshot — the reform seam' },
            { from: 'HCAI (industry gateway)', data: 'OCF forms and invoices; their schema, our translation layer (conformist behind ACL)' },
          ],
          agent: {
            name: 'AB Builder', tier: 'PR-gated',
            charter: 'I own the AB claim and Treatment plan models — SABS-as-versioned-data keyed by date of loss, and the HCAI conformance boundary.',
            does: 'Ships SABS rule-set versions as content, keeps the ACL translation exact, drafts clock-logic changes as PRs.',
            value: ['Deemed approvals 11 → 0 per quarter', 'Med/rehab cycle time', 'IRB accuracy'],
            skill: { id: 'ab-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/ab-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['AB claim', 'Treatment plan'],
            composes: ['SKL-AB-clockwatch'],
            slice: { aggregates: 2, invariants: 2, events: 4, policies: 2 },
            sources: [{ label: 'Auto-insurer org site — Accident benefits page', type: 'doc', href: 'ddd/auto-insurer-org-site_3.html' }],
            assets: [
              { kind: 'skill', name: 'ab.skill.md', note: 'Charter · language · procedures' },
              { kind: 'script', name: 'clock_watch.py', note: 'Realizes UC5\u2019s guard — SKL-AB-clockwatch (Operate)' },
              { kind: 'ref', name: 'HCAI ACL', note: 'Conformist boundary — their schema in, our verified-fact model out' },
            ],
            drives: ['SABS rule-set versions', 'Clock-escalation policy', 'HCAI conformance burn-down'],
            guardrails: ['Treatment plan decisions are human — SABS adjudication is never delegated', 'Clock escalations cannot be muted', 'No production access'],
          },
          opsAgent: {
            name: 'AB Clock Operator',
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Autonomous', shared: true },
              { ref: 'SKL-AB-clock', name: 'Watch the SABS clocks & escalate at 80%', tier: 'Autonomous' },
              { ref: 'SKL-AB-ocf', name: 'Pre-fill an OCF decision for review', tier: 'Suggest' },
            ], asBuilt: 'AGT-AB-OPS',
            charter: 'Deployed at Operate: watches every adjournment clock, escalates at 80%, classifies OCF intake, prepares payments on approved plans.',
            permissions: ['Role-scoped production MCP — acts + observes only', 'Clock escalations cannot be muted', 'Governance acts stay human (D-056)'],
          } },
        { id: 'CTX-TOTAL-LOSS', name: 'Total loss & salvage', classification: 'supporting',
          superseded: 'Total loss & salvage (D-152 cut)',
          language: [
            { term: 'actual cash value', def: 'Market valuation of the vehicle at date of loss; the settlement anchor and the argument to get right.' },
            { term: 'brand', def: 'Provincial title branding (irreparable, salvage, rebuilt) that follows the VIN.' },
            { term: 'salvage return', def: 'Net proceeds from auction disposal, a recovery credited against indemnity.' },
            { term: 'threshold', def: 'The point where repair cost against ACV tips the file from repair to write-off.' },
          ],
          capabilities: ['UC7'],
          note: 'The write-off path: ACV determination, owner settlement, title branding, salvage disposal.',
          summary: 'One vehicle, one disposition: settlement to the owner and recovery from the asset are the same file, never two. A Supporting subdomain kept lean — valuation is bought data behind an ACL, and the invariant does the governing.',
          needs: [
            { from: 'Estimating & repair', data: 'the threshold-breach event with estimate of record and teardown facts' },
            { from: 'Valuation data (vendors)', data: 'market valuation feeds for ACV (conformist behind ACL)' },
          ],
          agent: {
            name: 'Salvage Builder', tier: 'PR-gated',
            charter: 'I own the Salvage disposition model and its one-file invariant; the valuation-vendor ACL.',
            does: 'Keeps the disposition model and the vendor ACL exact; drafts changes as PRs.',
            value: ['ACV dispute rate', 'Days from threshold to settlement', 'Salvage return rate'],
            skill: { id: 'salvage-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/salvage-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Salvage disposition'],
            composes: [],
            slice: { aggregates: 1, invariants: 1, events: 3, policies: 1 },
            sources: [{ label: 'Auto-insurer org site — Total loss & salvage page', type: 'doc', href: 'ddd/auto-insurer-org-site_3.html' }],
            assets: [
              { kind: 'skill', name: 'salvage.skill.md', note: 'Charter · language · procedures' },
              { kind: 'ref', name: 'Valuation ACL', note: 'Two vendor switches in a decade is the norm; the model must survive both' },
            ],
            drives: ['ACV comparables features', 'Auction-network integration'],
            guardrails: ['Settlement offers are human', 'No production access'],
          },
          opsAgent: {
            name: 'Total-loss Operator',
            skills: [
              { ref: 'SKL-SHARED-kg-answers', name: 'Answer subdomain questions, grounded in the KG', tier: 'Autonomous', shared: true },
              { ref: 'SKL-TL-comps', name: 'Assemble valuation comparables', tier: 'Autonomous' },
              { ref: 'SKL-TL-offer', name: 'Draft the settlement offer', tier: 'Supervised' },
            ], asBuilt: 'AGT-TL-OPS',
            charter: 'Deployed at Suggest: compares valuations against comparables with evidence attached — humans settle.',
            permissions: ['Role-scoped production MCP — observes + suggest-level acts', 'Governance acts stay human (D-056)'],
          } },
      ],

      // ---- context map: the product's seams, typed (mirrors the claims member graph) ----
      relations: [
        { from: 'Underwriting & Policy', to: 'CTX-COVERAGE', pattern: 'Customer–supplier', label: 'CoverageSnapshot v3 (evented, immutable)', upstream: 'Underwriting & Policy',
          flow: 'The snapshot as at date of loss is recorded at intake and adjudicated against locally — design-time coupling only; no live calls at adjudication time.' },
        { from: 'CTX-FNOL', to: 'CTX-COVERAGE', pattern: 'Customer–supplier (internal)', label: 'completed loss report event + triage payload', upstream: 'CTX-FNOL',
          flow: 'The loss report event opens the claim; severity and reserve suggestions ride along.' },
        { from: 'CTX-COVERAGE', to: 'Billing & Money Movement', pattern: 'Published events', label: 'PaymentInstruction v2', upstream: 'CTX-COVERAGE',
          flow: 'Approved payment instructions publish to Billing; void/reissue flows back as events.' },
        { from: 'HCAI (industry gateway)', to: 'CTX-AB', pattern: 'Conformist behind ACL', label: 'OCF forms + invoices', upstream: 'HCAI (industry gateway)',
          flow: 'Their schema, our translation layer — conformance drift converts to deemed-approval risk, so the ACL is watched by SLO3.' },
        { from: 'Estimating & repair', to: 'CTX-TOTAL-LOSS', pattern: 'Customer–supplier (internal)', label: 'threshold-breach event + estimate of record', upstream: 'Estimating & repair',
          flow: 'The repair file hands the vehicle to salvage disposition when repair cost tips past ACV.' },
        { from: 'Fraud & SIU', to: 'CTX-COVERAGE', pattern: 'Customer–supplier (internal)', label: 'investigation holds + findings', upstream: 'Fraud & SIU',
          flow: 'Holds gate settlement on flagged files; findings flow back as facts adjudication acts on — SIU never edits the claim model.' },
      ],

      // ---- realization decisions (form × composition × surface, least-agentic that fits) ----
      realizations: [
        { ucId: 'UC1', capId: 'CAP-INTAKE-capture-loss-reports', context: 'CTX-FNOL', components: ['C1'], form: 'code', composition: 'workflow', surface: 'app', agency: 'automated',
          trigger: 'A claimant or broker opens digital FNOL in the portal pane (web/app).',
          nodes: ['app · guided intake', 'code · channel merge (one report)', 'code · snapshot request'],
          testStrategy: 'AT1 dedupe acceptance; intake completeness checks; contract test on the snapshot request.',
          rationale: 'A guided form over one model — deterministic capture, no judgment to delegate. Least-agentic that fits.',
          enforces: [{ inv: 'One loss event, one report, however many channels touch it', by: 'channel-merge dedupe (code) + AT1' }] },
        { ucId: 'UC2', capId: 'CAP-INTAKE-triage-severity', context: 'CTX-FNOL', components: ['C1'], form: 'llm-function', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'A first-notice conversation completes (phone or digital) — the report needs severity and a lane.',
          nodes: ['llm-function · severity score', 'code · lane rules', 'code · initial reserve suggestion'],
          testStrategy: 'Eval suite (96.4% pass over three runs) + severity-band agreement with senior adjusters (93%); the 10% audit sample is the APR-2 condition.',
          rationale: 'Bounded judgment per report at intake volume — a typed LLM function inside a workflow. Promoted Assist → Operate by APR-2, with the audit condition in the operator\u2019s guardrails.',
          enforces: [{ inv: 'Severity is recalculated as facts land — never frozen at intake', by: 'event-driven rescore (code)' }] },
        { ucId: 'UC8', capId: 'CAP-ADJUD-publish-status', context: 'CTX-FNOL', components: ['C5'], form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'Any module changes file state — the status stream feeds the portal panes.',
          nodes: ['code · status projection', 'service · event backbone (platform)'],
          testStrategy: 'AT7 freshness acceptance; contract tests on the status event.',
          rationale: 'A projection over published events — pure code on platform rails.',
          enforces: [{ inv: 'Status reaches the portal within its freshness SLO', by: 'AT7 + the event backbone\u2019s delivery guarantees' }] },
        { ucId: 'UC3', capId: 'CAP-ADJUD-verify-coverage', context: 'CTX-COVERAGE', components: ['C2'], form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'The loss report event arrives — the claim opens against the stored snapshot.',
          nodes: ['code · consume snapshot event', 'code · open claim', 'code · engage coverages'],
          testStrategy: 'AT3 temporal-correctness acceptance (post-loss endorsement has no effect); snapshot-lag SLO2.',
          rationale: 'The canonical design-time seam: consume the immutable snapshot, never call live policy. Deterministic by doctrine.',
          enforces: [{ invId: 'INV-ADJUD-snapshot-basis', inv: 'A claim exists only against a snapshot fixed as at date of loss', by: 'snapshot-only adjudication path (code) + AT3' }] },
        { ucId: 'UC4', capId: 'CAP-ADJUD-set-reserves', context: 'CTX-COVERAGE', components: ['C2'], form: 'agent', composition: 'workflow', surface: 'cowork', agency: 'human-in-loop',
          trigger: 'Facts land on an open claim — coverage response and reserves need the desk adjuster\u2019s judgment.',
          nodes: ['agent · reserve.suggest (drivers shown)', 'human · coverage decision + reserve move', 'code · event the move'],
          testStrategy: 'AT8 election-effects acceptance; reserve-adequacy drift watched by actuarial consumption; authority.check in-flow.',
          rationale: 'Coverage response is irreducible human judgment with money and conduct on the line — agent assist at Assist tier, decision stays human.',
          enforces: [
            { invId: 'INV-ADJUD-reserve-evented-authority', inv: 'Every reserve move is evented for actuarial consumption', by: 'append-only reserve events (code)' },
            { invId: 'INV-ADJUD-reserve-evented-authority', inv: 'Payments beyond the authority band are prevented in-flow', by: 'authority.check gate (code) + operator flag' },
          ] },
        { ucId: 'UC6', capId: 'CAP-ADJUD-authorize-payments', context: 'CTX-COVERAGE', components: ['C2'], form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'An approved indemnity payment on the claim — the instruction publishes to Claim payments over the payment-instruction seam.',
          nodes: ['code · build instruction', 'service · publish PaymentInstruction v2', 'code · ledger state instructed-not-settled'],
          testStrategy: 'AT5 acknowledge-and-return acceptance; contract test with Billing.',
          rationale: 'A published-language event across a domain seam — deterministic, contract-tested.',
          enforces: [{ invId: 'INV-ADJUD-instructed-not-settled', inv: 'The claim ledger reflects instructed-not-yet-settled until the outcome returns', by: 'state machine (code) + AT5' }] },
        { ucId: 'UC5', context: 'CTX-AB', components: ['C3'], form: 'code', composition: 'workflow', surface: 'cowork', agency: 'human-in-loop',
          trigger: 'An OCF-18 arrives via the HCAI ACL — the plan needs a decision inside the adjournment clock.',
          nodes: ['code · OCF intake + classify', 'code · SKL-AB-clockwatch (escalate at 80%)', 'human · plan decision', 'code · authorize payment'],
          testStrategy: 'AT4 clock-guard acceptance (escalation before any deemed approval); HCAI round-trip SLO3; deemed-approval count on the domain scoreboard.',
          rationale: 'The statute decides the shape: decisions are human, clocks are code, and the clock guard runs at Operate because missing one IS the loss event.',
          enforces: [
            { inv: 'No payment without an approved plan or a statutory exception', by: 'authorization gate (code)' },
            { inv: 'Every plan decision is timestamped against SABS clocks', by: 'clock ledger (code) + AT4' },
          ] },
        { ucId: 'UC7', capId: 'CAP-TOTALLOSS-settle-owners', context: 'CTX-TOTAL-LOSS', components: ['C4'], form: 'code', composition: 'workflow', surface: 'cowork', agency: 'human-in-loop',
          trigger: 'The threshold-breach event hands the vehicle over with the estimate of record.',
          nodes: ['code · ACV from valuation ACL', 'agent · acv.compare (comparables, Suggest)', 'human · settlement offer', 'code · brand filing + salvage disposal'],
          testStrategy: 'AT6 handoff acceptance; ACV dispute rate on the context scoreboard; vendor-ACL contract tests.',
          rationale: 'Bought valuation data behind an ACL, a human settlement, and deterministic disposal — the supporting-subdomain shape.',
          enforces: [{ inv: 'One vehicle, one disposition — settlement and recovery are the same file', by: 'single-disposition aggregate (code) + AT6' }] },
      ],
    },
  },
};

/* ── D-159 · Phase B of the old-wall retirement: REHOME THE CARGO ──
   The superseded walls' agents and capabilities move to their successors
   (the deferred AB wall keeps its own). Done as a visible post-pass, not a
   rewrite of the seed above — the migration is auditable and reversible
   until Phase C retires the old entries. UC judgment calls: UC8 (status
   tracking) follows the status stream to Claim adjudication (its open-host
   publisher); UC6 (issue an indemnity payment) stays with adjudication —
   it authorizes and instructs; Claim payments executes the ledger. */
{
  const _cc = window.__DDD__.byProduct['PROD-CLAIMSCORE'].contexts;
  const _by = (id) => _cc.find((c) => c.id === id);
  const _move = (fromId, toId) => {
    const f = _by(fromId), t = _by(toId);
    if (!f || !t) return;
    if (f.agent && !t.agent) { t.agent = f.agent; delete f.agent; }
    if (f.opsAgent && !t.opsAgent) { t.opsAgent = f.opsAgent; delete f.opsAgent; }
  };
  _move('CTX-FNOL', 'CTX-INTAKE');
  _move('CTX-COVERAGE', 'CTX-ADJUD');
  _move('CTX-TOTAL-LOSS', 'CTX-TOTALLOSS');
  _by('CTX-INTAKE').capabilities = ['UC1', 'UC2'];
  _by('CTX-ADJUD').capabilities = ['UC3', 'UC4', 'UC6', 'UC8'];
  _by('CTX-TOTALLOSS').capabilities = ['UC7'];
  for (const id of ['CTX-FNOL', 'CTX-COVERAGE', 'CTX-TOTAL-LOSS']) _by(id).capabilities = [];
  /* D-186: the realization decisions follow their capabilities to the
     successor walls (same UC judgment calls as above) */
  const _re = { UC1: 'CTX-INTAKE', UC2: 'CTX-INTAKE', UC3: 'CTX-ADJUD', UC4: 'CTX-ADJUD',
    UC6: 'CTX-ADJUD', UC8: 'CTX-ADJUD', UC7: 'CTX-TOTALLOSS' };
  for (const r of window.__DDD__.byProduct['PROD-CLAIMSCORE'].realizations) if (_re[r.ucId]) r.context = _re[r.ucId];
  /* D-161 · Phase C: the superseded walls retire from the product LIST.
     Equal-or-better is demonstrated (D-159/D-160: agents, capabilities,
     grounds and all projections live on the successors). The entries stay
     in the data — deep links and the org-altitude subdomain pages keep
     resolving them, with the supersession banner explaining the state.
     The ORG-level walls (team ownership, packaging) are untouched: their
     restructure is its own decision on its own timeline. */
  for (const id of ['CTX-FNOL', 'CTX-COVERAGE', 'CTX-TOTAL-LOSS']) _by(id).retired = true;
}
