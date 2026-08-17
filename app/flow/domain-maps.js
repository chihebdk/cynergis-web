"use client";

/* ============================================================
   Domain-level maps on the flow canvas (D-120) — the same visual
   language as the legacy product pages: the CONTEXT MAP (subdomains
   and the typed seams between them, externals behind ACLs) and the
   SYSTEM MAP (the domain as one expandable box in its world).
   One pair per domain, tree-shaped for the mapper; the facts mirror
   the D-113 member specs. Ids are prefixed per domain.
   ============================================================ */

const ctx = (id, summary, description, parentId, extra = {}) =>
  ({ id, type: 'SimpleNode', kind: 'context', summary, description, parentId, ...extra });
const seam = (id, summary, description, parentId, extra = {}) =>
  ({ id, type: 'SimpleNode', kind: 'seam', summary, description, parentId, ...extra });
const ext = (id, summary, description, parentId, extra = {}) =>
  ({ id, type: 'SimpleNode', kind: 'external', summary, description, parentId, ...extra });
const actor = (id, summary, description, parentId, extra = {}) =>
  ({ id, type: 'SimpleNode', kind: 'actor', summary, description, parentId, ...extra });

/* ── Claims ── */
const dmClaims = {
  id: 'dm-claims', name: 'Claims — context map', contextId: null,
  summary: 'The seven subdomains and the typed seams between them; externals behind ACLs.',
  nodes: [
    actor('cm-claimant', 'Claimant & channels', 'Every claim starts here — app, web, phone, broker or police feed — and the status stream reports back to the same person.', 'start'),
    ctx('cm-fnol', 'Notice of loss', 'Core — one loss event, one report, however many channels touch it; triage sets severity, reserves and assignment.', 'cm-claimant'),
    seam('cm-s-report', 'completed loss report', 'Customer–supplier (internal): the completed report + triage payload opens the claim downstream.', 'cm-fnol'),
    seam('cm-s-ablane', 'AB lane routing', 'Injury files route to accident benefits with the elections from the snapshot.', 'cm-fnol'),
    ext('cm-x-uw', 'Underwriting & Policy', 'Customer–supplier: CoverageSnapshot v3, recorded at intake keyed to date of loss — design-time coupling only.', 'cm-fnol', { isEndNode: true }),
    ctx('cm-cov', 'Coverage & adjudication', 'Core — decides whether the policy responds and for how much, against the immutable snapshot. The centre of gravity.', 'cm-s-report'),
    ctx('cm-ab', 'Accident benefits', 'Core — statutory benefits under the SABS in force at date of loss; the most regulated subdomain in the company.', 'cm-s-ablane'),
    ext('cm-x-hcai', 'HCAI (industry gateway)', 'Conformist behind ACL: OCF forms in their schema, our translation layer — drift converts to deemed-approval risk.', 'cm-ab', { isEndNode: true }),
    seam('cm-s-appraisal', 'appraisal requests', 'Customer–supplier (internal): coverage-approved appraisal requests; estimate of record and supplements flow back.', 'cm-cov'),
    seam('cm-s-payment', 'PaymentInstruction v2', 'Published events: approved payment instructions to Billing & Money Movement; void/reissue returns.', 'cm-cov'),
    ext('cm-x-fraud', 'Fraud & SIU (holds)', 'Customer–supplier (internal): investigation holds gate settlement on flagged files; findings return as facts — SIU never edits the claim model.', 'cm-cov', { isEndNode: true }),
    ctx('cm-est', 'Estimating & repair', 'Core — physical damage appraisal and the repair network: estimates, shop assignment, supplements, completion.', 'cm-s-appraisal'),
    seam('cm-s-threshold', 'threshold breach', 'Customer–supplier (internal): the threshold-breach event with the estimate of record hands the vehicle to salvage.', 'cm-est'),
    ctx('cm-tl', 'Total loss & salvage', 'Supporting — ACV determination, owner settlement, title branding, salvage disposal. One vehicle, one disposition.', 'cm-s-threshold'),
    seam('cm-s-salvage', 'salvage & fault facts', 'Customer–supplier (internal): salvage proceeds and fault-split facts seed the recovery file.', 'cm-tl'),
    ctx('cm-rec', 'Recovery & subrogation', 'Supporting — recovers what others owe: subrogation, DCPD positions, diminished-recovery facts.', 'cm-s-salvage', { isEndNode: true }),
  ],
};

const dsClaims = {
  id: 'ds-claims', name: 'Claims — system map', contextId: null,
  summary: 'The domain in its world: who acts on it and which systems feed and consume it. Expand the box for the subdomains.',
  nodes: [
    actor('sm-claimant', 'Claimant', 'Reports once through any channel; receives honest status at every milestone.', 'start'),
    ctx('sm-fnol', 'Notice of loss', 'The front door: intake and triage.', 'sm-claimant', { submapId: 'sub-ds-claims' }),
    ctx('sm-cov', 'Coverage & adjudication', 'The centre of gravity: snapshot, reserves, authority.', 'sm-fnol', { submapId: 'sub-ds-claims' }),
    ctx('sm-est', 'Estimating & repair', 'Appraisal and the repair network.', 'sm-cov', { submapId: 'sub-ds-claims' }),
    ctx('sm-ab', 'Accident benefits', 'SABS adjudication under statutory clocks.', 'sm-est', { submapId: 'sub-ds-claims' }),
    ctx('sm-tl', 'Total loss & salvage', 'The write-off path on one file.', 'sm-ab', { submapId: 'sub-ds-claims' }),
    ctx('sm-rec', 'Recovery & subrogation', 'Recovers what others owe.', 'sm-tl', { submapId: 'sub-ds-claims' }),
    ctx('sm-fraud', 'Fraud & SIU', 'Signals and investigations — never verdicts.', 'sm-rec', { submapId: 'sub-ds-claims' }),
    ext('sm-x-uw', 'Underwriting & Policy', 'Inbound — CoverageSnapshot v3, immutable, keyed to date of loss.', 'sm-fraud'),
    ext('sm-x-hcai', 'HCAI (industry gateway)', 'Bidirectional — OCF forms in, adjudication outcomes back, behind the ACL.', 'sm-fraud'),
    ext('sm-x-billing', 'Billing & Money Movement', 'Outbound — PaymentInstruction v2; settlement outcomes return.', 'sm-fraud', { isEndNode: true }),
    actor('sm-adjuster', 'Adjusters (desk · AB · total loss)', 'The ~600-person operations leg lives on these modules eight hours a day.', 'sm-fraud', { isEndNode: true }),
  ],
};
const dsClaimsSub = { id: 'sub-ds-claims', name: 'Claims · the domain', startNodeId: 'sm-fnol', endNodeId: 'sm-fraud', colorIndex: 0, mapIds: ['ds-claims'] };

/* ── Product & Pricing ── */
const dmPricing = {
  id: 'dm-pricing', name: 'Product & Pricing — context map', contextId: null,
  summary: 'Catalogue, rating, actuarial and filings — and the filed-rate gate binding them.',
  nodes: [
    ctx('pm-pdef', 'Product definition', 'Core — the catalogue: immutable product versions, endorsement forms, eligibility, wordings.', 'start'),
    seam('pm-s-wordings', 'draft wordings & rules', 'Customer–supplier (internal): draft wordings and rule changes enter the filing calendar.', 'pm-pdef'),
    seam('pm-s-structure', 'product structure', 'Customer–supplier (internal): product structure constrains rate-table shape; compatibility checked at staging.', 'pm-pdef'),
    ctx('pm-fil', 'Rate & rule filings', 'Supporting — the regulatory interface: packs, calendar, and the append-only filed-rate register.', 'pm-s-wordings'),
    ext('pm-x-fsra', 'FSRA (regulator)', 'Conformist: their filing process and formats; our calendar absorbs their cadence.', 'pm-fil', { isEndNode: true }),
    seam('pm-s-approval', 'approval records', 'Customer–supplier (internal): approvals unlock table promotion — the conformance gate reads the register.', 'pm-fil'),
    ctx('pm-rating', 'Rating & pricing engine', 'Core — deterministic, versioned pricing; the workbench stages every change through impact runs.', 'pm-s-approval'),
    ext('pm-x-dist', 'Distribution & Quoting', 'Open host: rate execution for every quote — premium by coverage, rate version recorded.', 'pm-rating', { isEndNode: true }),
    ctx('pm-act', 'Actuarial & pricing analytics', 'Supporting — indications, factor analyses, monitoring; proposes, never decides.', 'start'),
    ext('pm-x-claims', 'Claims (loss experience)', 'Published events: reserve movements and closed-claim outcomes feed the models.', 'pm-act'),
    seam('pm-s-indications', 'indicated rates', 'Customer–supplier (internal): indications and factor analyses into the staging workbench.', 'pm-act', { isEndNode: true }),
  ],
};
const dsPricing = {
  id: 'ds-pricing', name: 'Product & Pricing — system map', contextId: null,
  summary: 'The domain in its world.',
  nodes: [
    actor('ps-analyst', 'Pricing analyst', 'Stages tables, runs impacts, schedules effective dates.', 'start'),
    ctx('ps-pdef', 'Product definition', 'The catalogue of record.', 'ps-analyst', { submapId: 'sub-ds-pricing' }),
    ctx('ps-rating', 'Rating & pricing engine', 'Deterministic pricing behind the open host.', 'ps-pdef', { submapId: 'sub-ds-pricing' }),
    ctx('ps-act', 'Actuarial & pricing analytics', 'The analytical engine behind the rates.', 'ps-rating', { submapId: 'sub-ds-pricing' }),
    ctx('ps-fil', 'Rate & rule filings', 'The regulatory interface and the filed-rate register.', 'ps-act', { submapId: 'sub-ds-pricing' }),
    ext('ps-x-fsra', 'FSRA', 'Filings in, approvals out, conduct oversight always.', 'ps-fil'),
    ext('ps-x-dist', 'Distribution & Quoting', 'Consumes rate execution on every quote.', 'ps-fil'),
    ext('ps-x-claims', 'Claims', 'Feeds loss experience into the actuarial models.', 'ps-fil', { isEndNode: true }),
  ],
};
const dsPricingSub = { id: 'sub-ds-pricing', name: 'Product & Pricing · the domain', startNodeId: 'ps-pdef', endNodeId: 'ps-fil', colorIndex: 1, mapIds: ['ds-pricing'] };

/* ── Distribution & Quoting ── */
const dmDistribution = {
  id: 'dm-distribution', name: 'Distribution & Quoting — context map', contextId: null,
  summary: 'Channels into one quote model; agreements pay the channel.',
  nodes: [
    ext('dm-x-agg', 'Aggregators', 'Conformist behind ACL: comparison-site quote traffic in their own schemas.', 'start'),
    ctx('dm-chan', 'Broker & aggregator channels', 'Supporting — channel identity, entitlements, ACLs, and the shell surfaces the portals share.', 'dm-x-agg'),
    seam('dm-s-channel', 'channel context', 'Customer–supplier (internal): channel identity and entitlements shape the quote experience.', 'dm-chan'),
    seam('dm-s-partner', 'partner identity', 'Customer–supplier (internal): partner identity and status into agreement management.', 'dm-chan'),
    ctx('dm-quote', 'Quote', 'Core — one quote model behind every channel: capture, selection, premium, requote-and-retrieve.', 'dm-s-channel'),
    seam('dm-s-accepted', 'AcceptedQuote v1', 'Customer–supplier: the accepted package — facts, selections, premium, rate version — hands to bind.', 'dm-quote'),
    ext('dm-x-rating', 'Rating API', 'Open host consumed: premium by coverage on every material change.', 'dm-quote', { isEndNode: true }),
    ext('dm-x-uw', 'Underwriting & Policy', 'Downstream customer of the accepted quote.', 'dm-s-accepted'),
    ctx('dm-funnel', 'Acquisition & funnel', 'Supporting — analytics and experiments over the quote event stream; observes, never entangles.', 'dm-s-accepted', { isEndNode: true }),
    ctx('dm-cagr', 'Commission agreements', 'Supporting — the commercial terms of record; effective-dated versions the payout executes against.', 'dm-s-partner'),
    ext('dm-x-billing', 'Billing & Money Movement', 'Customer–supplier: agreement versions consumed by commission payout.', 'dm-cagr', { isEndNode: true }),
  ],
};
const dsDistribution = {
  id: 'ds-distribution', name: 'Distribution & Quoting — system map', contextId: null,
  summary: 'The domain in its world.',
  nodes: [
    actor('dds-shopper', 'Shopper · broker', 'Direct shoppers and broker producers, through every channel.', 'start'),
    ctx('dds-chan', 'Broker & aggregator channels', 'Channel identity and the shells.', 'dds-shopper', { submapId: 'sub-ds-dist' }),
    ctx('dds-quote', 'Quote', 'The one quote model.', 'dds-chan', { submapId: 'sub-ds-dist' }),
    ctx('dds-funnel', 'Acquisition & funnel', 'Conversion analytics and experiments.', 'dds-quote', { submapId: 'sub-ds-dist' }),
    ctx('dds-cagr', 'Commission agreements', 'The channel’s commercial terms.', 'dds-funnel', { submapId: 'sub-ds-dist' }),
    ext('dds-x-agg', 'Aggregators', 'Quote traffic behind ACLs.', 'dds-cagr'),
    ext('dds-x-rating', 'Rating API', 'Prices every quote.', 'dds-cagr'),
    ext('dds-x-uw', 'Underwriting & Policy', 'Receives the accepted quote package.', 'dds-cagr', { isEndNode: true }),
  ],
};
const dsDistributionSub = { id: 'sub-ds-dist', name: 'Distribution & Quoting · the domain', startNodeId: 'dds-chan', endNodeId: 'dds-cagr', colorIndex: 2, mapIds: ['ds-distribution'] };

/* ── Underwriting & Policy ── */
const dmUwPolicy = {
  id: 'dm-uw-policy', name: 'Underwriting & Policy — context map', contextId: null,
  summary: 'Risk selection through bind to the policy of record — and the snapshot seam the company stands on.',
  nodes: [
    ext('um-x-dist', 'Distribution & Quoting', 'Customer–supplier: the accepted quote package with facts, selections, premium.', 'start'),
    ctx('um-risk', 'Risk selection & rules', 'Core — versioned, deterministic rules; the referral queue for the edge cases humans decide.', 'um-x-dist'),
    seam('um-s-accept', 'acceptance decision', 'Customer–supplier (internal): the decision bind requires, with its rule version — re-evaluated at bind.', 'um-risk'),
    ctx('um-extd', 'External risk data', 'Generic — MVR, prior claims, credit: ordered, cached, normalized into verified facts behind ACLs.', 'start'),
    ext('um-x-mvr', 'Risk data vendors', 'Conformist behind ACL: vendor schemas never leak — verified facts only.', 'um-extd'),
    seam('um-s-facts', 'verified facts', 'Customer–supplier (internal): decision inputs with provenance and order date.', 'um-extd', { isEndNode: true }),
    ctx('um-bind', 'Bind & issuance', 'Core — the atomic bind and the snapshot publisher: one immutable coverage snapshot per policy version.', 'um-s-accept'),
    seam('um-s-snapshot', 'CoverageSnapshot v3', 'Customer–supplier: the immutable as-at-date-of-loss coverage picture — the seam Claims adjudicates against.', 'um-bind'),
    ext('um-x-claims', 'Claims', 'Downstream customer of the snapshot; never calls live policy at run time.', 'um-s-snapshot'),
    ctx('um-padm', 'Policy administration', 'Supporting — lifecycle transactions versioning the policy; the legacy ACL strangles the old system.', 'um-bind'),
    ext('um-x-legacy', 'Legacy policy admin', 'Anti-corruption layer: the old system reached only through the ACL; burn-down is the measure.', 'um-padm', { isEndNode: true }),
    seam('um-s-billing', 'policy transactions', 'Customer–supplier: transactions with billing effects to Billing & Money Movement.', 'um-padm', { isEndNode: true }),
  ],
};
const dsUwPolicy = {
  id: 'ds-uw-policy', name: 'Underwriting & Policy — system map', contextId: null,
  summary: 'The domain in its world.',
  nodes: [
    actor('us-uw', 'Referral underwriter', 'Decides the edge cases the rules refer.', 'start'),
    ctx('us-risk', 'Risk selection & rules', 'Accept, refer or decline.', 'us-uw', { submapId: 'sub-ds-uw' }),
    ctx('us-bind', 'Bind & issuance', 'The atomic bind + the snapshot publisher.', 'us-risk', { submapId: 'sub-ds-uw' }),
    ctx('us-padm', 'Policy administration', 'The policy across its life.', 'us-bind', { submapId: 'sub-ds-uw' }),
    ctx('us-extd', 'External risk data', 'Verified facts behind vendor ACLs.', 'us-padm', { submapId: 'sub-ds-uw' }),
    ext('us-x-dist', 'Distribution & Quoting', 'Sends the accepted quote package.', 'us-extd'),
    ext('us-x-claims', 'Claims', 'Consumes the coverage snapshot.', 'us-extd'),
    ext('us-x-legacy', 'Legacy policy admin', 'Strangled through the ACL.', 'us-extd', { isEndNode: true }),
  ],
};
const dsUwPolicySub = { id: 'sub-ds-uw', name: 'Underwriting & Policy · the domain', startNodeId: 'us-risk', endNodeId: 'us-extd', colorIndex: 0, mapIds: ['ds-uw-policy'] };

/* ── Billing & Money Movement ── */
const dmBilling = {
  id: 'dm-billing', name: 'Billing & Money Movement — context map', contextId: null,
  summary: 'The premium ledger, the overdue path, and every dollar in motion.',
  nodes: [
    ext('bm-x-policy', 'Underwriting & Policy', 'Customer–supplier: policy transactions with their billing effects.', 'start'),
    ctx('bm-bill', 'Billing & instalments', 'Supporting — the append-only premium ledger and the plan engine.', 'bm-x-policy'),
    seam('bm-s-collect', 'collection requests', 'Customer–supplier (internal): collections per the instalment schedule.', 'bm-bill'),
    seam('bm-s-overdue', 'overdue transitions', 'Customer–supplier (internal): overdue state transitions feed dunning.', 'bm-bill'),
    ctx('bm-pay', 'Payments in & out', 'Generic — orchestration over providers with retries, declared failover and three-way reconciliation.', 'bm-s-collect'),
    ext('bm-x-psp', 'Payment providers & banks', 'Conformist behind ACL: one ACL per provider; their schemas stay outside.', 'bm-pay'),
    ext('bm-x-claims', 'Claims (PaymentInstruction v2)', 'Published events consumed: indemnity disbursements; settlement outcomes return.', 'bm-pay', { isEndNode: true }),
    ctx('bm-coll', 'Collections & receivables', 'Supporting — dunning under statutory notice clocks; arrangements; the cancellation handoff.', 'bm-s-overdue'),
    ext('bm-x-cancel', 'Underwriting & Policy (cancellation)', 'Customer–supplier: cancellation-for-non-payment requests with the notice trail complete.', 'bm-coll', { isEndNode: true }),
    ctx('bm-cpay', 'Commission payout & reconciliation', 'Supporting — computes against the agreement version in force; statements; clawbacks.', 'start'),
    ext('bm-x-agr', 'Distribution (agreements)', 'Customer–supplier: effective-dated agreement versions.', 'bm-cpay'),
    seam('bm-s-batches', 'payout batches', 'Customer–supplier (internal): batches for execution on the payments hub.', 'bm-cpay', { isEndNode: true }),
  ],
};
const dsBilling = {
  id: 'ds-billing', name: 'Billing & Money Movement — system map', contextId: null,
  summary: 'The domain in its world.',
  nodes: [
    actor('bs-holder', 'Policyholder', 'Pays premium; receives refunds and claim payments.', 'start'),
    ctx('bs-bill', 'Billing & instalments', 'The premium ledger.', 'bs-holder', { submapId: 'sub-ds-bill' }),
    ctx('bs-coll', 'Collections & receivables', 'The overdue path.', 'bs-bill', { submapId: 'sub-ds-bill' }),
    ctx('bs-pay', 'Payments in & out', 'Money movement itself.', 'bs-coll', { submapId: 'sub-ds-bill' }),
    ctx('bs-cpay', 'Commission payout', 'Paying the channel.', 'bs-pay', { submapId: 'sub-ds-bill' }),
    ext('bs-x-psp', 'Providers & banks', 'The rails, behind ACLs.', 'bs-cpay'),
    ext('bs-x-policy', 'Underwriting & Policy', 'Transactions in; cancellations out.', 'bs-cpay'),
    ext('bs-x-claims', 'Claims', 'Disbursement instructions in; outcomes back.', 'bs-cpay', { isEndNode: true }),
  ],
};
const dsBillingSub = { id: 'sub-ds-bill', name: 'Billing & Money Movement · the domain', startNodeId: 'bs-bill', endNodeId: 'bs-cpay', colorIndex: 1, mapIds: ['ds-billing'] };

/* ── Platform band ── */
const dmPlatform = {
  id: 'dm-platform', name: 'Platform band — context map', contextId: null,
  summary: 'Six internal products, consumed as services by every stream domain.',
  nodes: [
    ctx('lm-int', 'Integration & API platform', 'The rails: backbone, gateway, contract registry — delivery, never content.', 'start'),
    seam('lm-s-lake', 'every topic lands', 'Open host: every backbone topic lands in the event lake.', 'lm-int'),
    ctx('lm-data', 'Data platform', 'The analytical substrate: lake, governed marts, lineage — the boundary analytics reads from.', 'lm-s-lake', { isEndNode: true }),
    ctx('lm-party', 'Party, vehicle & driver', 'Golden records and resolution APIs — one identity per real-world thing.', 'start'),
    seam('lm-s-resolve', 'resolution API', 'Open host: identify-or-create for parties, vehicles, drivers — consumed at intake, quote and bind.', 'lm-party', { isEndNode: true }),
    ctx('lm-docs', 'Document & correspondence', 'Rendered communication: templates, delivery, the append-only record — filed wordings verbatim.', 'start'),
    seam('lm-s-issue', 'issuance & notices', 'Open host: policy documents and statutory notices for the stream domains.', 'lm-docs', { isEndNode: true }),
    ctx('lm-dev', 'Developer platform', 'The paved road: CI/CD, environments-as-service, golden paths.', 'start'),
    ctx('lm-iam', 'Identity & access', 'Customer and workforce identity, sessions, entitlements — bought where possible.', 'start'),
    ext('lm-x-idp', 'Identity provider', 'Conformist: the bought IdP behind a thin integration.', 'lm-iam', { isEndNode: true }),
  ],
};
const dsPlatform = {
  id: 'ds-platform', name: 'Platform band — system map', contextId: null,
  summary: 'The band under every stream domain.',
  nodes: [
    actor('ls-team', 'Stream teams', 'The customers of every platform product.', 'start'),
    ctx('ls-int', 'Integration & API', 'The rails.', 'ls-team', { submapId: 'sub-ds-plat' }),
    ctx('ls-party', 'Party, vehicle & driver', 'Golden records.', 'ls-int', { submapId: 'sub-ds-plat' }),
    ctx('ls-docs', 'Document & correspondence', 'Rendered communication.', 'ls-party', { submapId: 'sub-ds-plat' }),
    ctx('ls-dev', 'Developer platform', 'The paved road.', 'ls-docs', { submapId: 'sub-ds-plat' }),
    ctx('ls-data', 'Data platform', 'Lake and marts.', 'ls-dev', { submapId: 'sub-ds-plat' }),
    ctx('ls-iam', 'Identity & access', 'Who may do what.', 'ls-data', { submapId: 'sub-ds-plat' }),
    ext('ls-x-idp', 'Identity provider', 'The bought IdP.', 'ls-iam'),
    ext('ls-x-cloud', 'Cloud provider', 'Third party under the platform team — the vendor is not the platform.', 'ls-iam', { isEndNode: true }),
  ],
};
const dsPlatformSub = { id: 'sub-ds-plat', name: 'Platform band · the band', startNodeId: 'ls-int', endNodeId: 'ls-iam', colorIndex: 2, mapIds: ['ds-platform'] };

export const domainMaps = [dmClaims, dsClaims, dmPricing, dsPricing, dmDistribution, dsDistribution, dmUwPolicy, dsUwPolicy, dmBilling, dsBilling, dmPlatform, dsPlatform];
export const domainSubmaps = [dsClaimsSub, dsPricingSub, dsDistributionSub, dsUwPolicySub, dsBillingSub, dsPlatformSub];
