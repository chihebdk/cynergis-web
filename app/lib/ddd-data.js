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
          note: 'The scoring/block/step-up brain — the differentiating core. Spend the agentic budget here.',
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
            does: 'It scores every card authorization in real time, decides to approve, block, or step it up — within the network timeout — and emits the decision with a human-readable explanation. High-risk transactions are blocked and the customer is notified; medium-risk ones get a step-up challenge instead of a hard block.',
            value: ['Cut fraud losses ~55% (18 → 7 bps)', 'Halve false declines (6.2% → 2.5%)', 'Decide within the network timeout (p95 < 300 ms)'],
            skill: { id: 'decisioning-analyst', marketplace: 'https://marketplace.cynergis.ai/skills/decisioning-analyst', repo: 'https://github.com/cynergis/subdomain-analyst' },
            owns: ['Authorization', 'Step-up Challenge'],
            slice: { aggregates: 2, invariants: 5, events: 6, policies: 2 },
            sources: [
              { label: 'Fraud strategy memo', type: 'doc', href: 'https://docs.cynergis.ai/wealthgrow/fraud-strategy-memo' },
              { label: 'Auth-switch API spec', type: 'spec', href: 'https://docs.cynergis.ai/wealthgrow/auth-switch-api' },
              { label: 'Model-risk policy (SR 11-7)', type: 'policy', href: 'https://docs.cynergis.ai/wealthgrow/model-risk-policy' },
            ],
            assets: [
              { kind: 'skill',  name: 'decisioning.skill.md',   note: 'Charter · language · procedures' },
              { kind: 'script', name: 'score_transaction.py',   note: 'Realizes UC1 — LLM-function workflow' },
              { kind: 'script', name: 'apply_decision.py',      note: 'Realizes UC2 — deterministic' },
              { kind: 'ref',    name: 'ACL · Auth Vendor',      note: 'Published-language contract at the boundary' },
            ],
            drives: ['Extend scoring features', 'Tune thresholds (gated)', 'Propose new capabilities in this context'],
            guardrails: ['Cannot redraw its own boundary — that is a system-level call', 'Model / invariant changes need a human gate', 'Reads neighbouring contexts only via published language'],
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
          note: 'Analyst workflow over flagged cases. Important but not the differentiator.',
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
            slice: { aggregates: 1, invariants: 3, events: 3, policies: 1 },
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
          } },
        { id: 'BC-NOTIFY', name: 'Customer Notification', classification: 'generic',
          language: [
            { term: 'notification', def: 'A customer-facing alert about a decision (e.g. a block).' },
            { term: 'channel', def: 'The delivery medium — push / SMS / in-app.' },
            { term: 'template', def: 'The reusable message format for a notification type.' },
          ],
          capabilities: [],
          note: 'Generic — use an off-the-shelf notification service; no bespoke build.',
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
        { ucId: 'UC1', context: 'BC-DEC', form: 'llm-function', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'An authorization arrives on the card-auth bus (real-time stream) — synchronous, within the network timeout.',
          nodes: ['code · fetch features', 'llm-function · risk band', 'code · threshold gate'],
          testStrategy: 'Eval set of labelled transactions + p95<300ms latency regression; unit tests on the threshold gate.',
          rationale: 'Repeatable shape, bounded judgment per transaction, tight latency → a typed workflow, not an agent. Least-agentic that fits.',
          enforces: [{ inv: 'Every decision carries a risk band + explanation', by: 'typed output schema + eval assertion' }] },
        { ucId: 'UC2', context: 'BC-DEC', form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated',
          trigger: 'Domain event "Authorization scored = high" — fired by UC1 within the same decision flow.',
          nodes: ['code · apply block', 'llm-function · customer explanation', 'service · notification (generic)'],
          testStrategy: 'Unit tests on block rules; contract test against the Notification service; small eval on explanation text.',
          rationale: 'Mostly deterministic action plus an off-the-shelf notification. Build the minimum; reuse the generic context.',
          enforces: [
            { inv: 'A decision cannot be both approved and blocked', by: 'aggregate validation (code)' },
            { inv: 'An authorization is decided exactly once', by: 'idempotent command handler (code)' },
          ] },
        { ucId: 'UC3', context: 'BC-CASE', form: 'agent', composition: 'workflow', surface: 'cowork', agency: 'human-in-loop',
          trigger: 'Policy POL-2: "Authorization blocked" → a case is opened on the analyst queue (cross-context, from Decisioning).',
          nodes: ['agent · assemble case + evidence', 'human · disposition decision', 'code · record disposition'],
          testStrategy: 'Trajectory/guardrail harness for the assist agent; decision-quality review on dispositions; audit-completeness checks.',
          rationale: 'Open-ended evidence-gathering, but the disposition is irreducible human judgment + accountability → agent assist + human-in-loop via Cowork, not full autonomy.',
          enforces: [
            { inv: 'A disposition requires a recorded rationale', by: 'human checklist + required UI field' },
            { inv: 'Only the assigned analyst can dispose a case', by: 'authz policy + agent guardrail' },
          ] },
        { ucId: 'UC4', context: 'BC-DEC', form: 'code', composition: 'workflow', surface: 'verb', agency: 'automated', provisional: true,
          trigger: 'Policy POL-1: "Authorization scored = medium" → issue a step-up challenge (in the same decision flow).',
          nodes: ['code · risk-band gate', 'service · step-up auth (external vendor, ACL)', 'code · record outcome'],
          testStrategy: 'Integration/contract tests against the auth vendor sandbox; unit tests on the gate.',
          rationale: 'Deterministic integration with a generic external provider — no bespoke app, no agent. (Provisional: gated on the vendor contract — see Delivery board blocker.)',
          enforces: [
            { inv: 'Step-up is issued only on a medium risk band', by: 'risk-band gate (code)' },
            { inv: 'A challenge expires after its timeout', by: 'workflow timer (code)' },
          ] },
      ],
    },
  },
};
