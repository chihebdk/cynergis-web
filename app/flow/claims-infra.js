"use client";

/* ============================================================
   D-198 — THE INFRASTRUCTURE REGISTER (More › Infrastructure).
   Ports & adapters, applied to infrastructure: each entry is an
   ABSTRACT SERVICE NEED — tool-agnostic, stable, INF- id — and the
   concrete tool is a BINDING captured as a value on the need
   (implementedBy + status). Demand joins point at the need, so the
   enterprise can swap tools without breaking a single edge.
   `demandedBy` lists the design elements (by id — events, how-built
   decisions, service levels, security rows, contracts) that require
   the need. A demanded need whose binding is not `enabled` is a
   GAP — the pre-skeleton checklist, alive on the page.
   Cross-phase by nature: Design assumed it, Build confirms against
   it, Operate lives on it — hence the More list, not a phase rail.
   ============================================================ */

/* ── D-199: ENVIRONMENT is the abstract node (on top); the CLOUD binds it.
   Environments survive a vendor switch; the promotion path is a product
   fact; data rules discriminate by them. The cloud setup is the binding
   layer: which tenant, which management groups, which subscription
   realizes which environment. ── */
export const ENVIRONMENTS = [
  { id: "ENV-STAGING", name: "Staging", order: 1,
    purpose: "Where the walking skeleton and every feature land first — synthetic and masked data only.",
    gates: "Any green build may deploy; contract tests must pass before promotion.",
    dataRule: "No real PII, ever — generated and masked datasets only.",
    binding: { subscription: "sub-meridian-claims-staging", note: "Auto-approved deploys from CI." } },
  { id: "ENV-PREPROD", name: "Pre-prod", order: 2,
    purpose: "Production's twin: real integrations in test mode (mainframe test partition, HCAI conformance), performance runs against the service levels.",
    gates: "Promotion from staging only; the component tests AND the service-level checks must pass here.",
    dataRule: "Masked production-shaped data; the residency constraint applies as in prod.",
    binding: { subscription: "sub-meridian-claims-preprod", note: "Deploys via promotion pipeline; change window free." } },
  { id: "ENV-PROD", name: "Production", order: 3,
    purpose: "The claimants' environment — every service level and security row applies at full force.",
    gates: "Promotion from pre-prod only; Payments additionally gated on INF-HARDENED landing.",
    dataRule: "Real PII and banking data — residency, masking, access logging all in force.",
    binding: { subscription: "sub-meridian-claims-prod", note: "Change windows + approval; the hardened node pool hosts Payments." } },
];

export const CLOUD_SETUP = {
  id: "CLOUD-MERIDIAN-AZURE",
  provider: "Microsoft Azure",
  tenant: "meridianinsurance.onmicrosoft.com",
  regions: "Canada Central (primary) · Canada East (DR)",
  orgModel: [
    { group: "mg-meridian-root", holds: "Org-wide policy: residency, tagging, deny-public-storage, baseline logging." },
    { group: "mg-platform", holds: "Shared platforms: identity, connectivity (ExpressRoute), observability, the Terraform state backend." },
    { group: "mg-landingzones/claims", holds: "The claims landing zone — the three environment subscriptions below." },
  ],
  policies: [
    { id: "CPOL-RESIDENCY", rule: "All resources deploy to Canadian regions only — deny elsewhere.", binds: "INF-RESIDENCY" },
    { id: "CPOL-TAGGING", rule: "Every resource carries product, environment and owner tags — deny untagged." },
    { id: "CPOL-NO-PUBLIC-DATA", rule: "No publicly-reachable storage or databases — deny at the management group." },
    { id: "CPOL-BASELINE-LOGS", rule: "Activity and data-plane logs ship to observability by default." },
  ],
  iac: "Terraform — curated internal modules only (secure, HA, observable, monitored, permission-enabled by construction); state in the platform backend; plans reviewed, applies from CI.",
};

export const INFRA_NEEDS = [
  { id: "INF-PUBSUB", name: "Pub/sub messaging — the claims stream", kind: "platform",
    what: "Ordered, replayable topics with consumer groups and dead-letter queues — every seam contract rides this.",
    binding: { module: { source: "meridian/pubsub-cluster", version: "1.4.0" }, implementedBy: "Confluent Cloud (Kafka)", status: "not-provisioned",
      note: "The platform is enterprise-approved; the CLAIMS cluster the design assumes is not yet provisioned. Nothing crosses a seam until it is." },
    demandedBy: ["CT-claim-opened", "CT-repair-verified", "CT-payment-instruction", "CT-payment-settled", "CT-recovery-referred", "CT-threshold-breach", "CT-salvage-proceeds", "CT-credit-received", "CT-police-notice", "HB-ADJUD-doors", "HB-INTAKE-doors", "HB-REPAIR-doors", "HB-PAYMENTS-doors", "HB-TOTALLOSS-doors", "HB-RECOVERY-doors"] },
  { id: "INF-SCHEMA-REG", name: "Schema registry", kind: "platform",
    what: "The payload schemas behind every contract, versioned — additive-only enforcement lives here.",
    binding: { module: { source: "meridian/schema-registry", version: "1.1.2" }, implementedBy: "Confluent Schema Registry", status: "not-provisioned",
      note: "Provisioned with the claims cluster — same gap, same unblocking work." },
    demandedBy: ["CT-claim-opened", "CT-payment-instruction", "CT-repair-verified"] },
  { id: "INF-API-GW", name: "Public API gateway", kind: "platform",
    what: "The front door for customer-facing APIs — throttling, keys, the public edge.",
    binding: { module: { source: "meridian/api-gateway", version: "3.0.1" }, implementedBy: "Azure API Management", status: "enabled" },
    demandedBy: ["di-reported", "HB-INTAKE-doors", "SL-INTAKE-fnol-availability"] },
  { id: "INF-PARTNER-EDGE", name: "Partner surface — external networks", kind: "platform",
    what: "The authenticated edge for shops and the salvage network — partners see their own cases only.",
    binding: { module: { source: "meridian/api-gateway", version: "3.0.1" }, implementedBy: "Azure API Management (external tier)", status: "enabled" },
    demandedBy: ["SEC-REPAIR-shops", "SEC-TOTALLOSS-network"] },
  { id: "INF-IDENTITY-CUSTOMER", name: "Customer identity", kind: "platform",
    what: "OIDC sessions for claimants on the portal doors.",
    binding: { module: { source: "meridian/identity-external", version: "2.2.0" }, implementedBy: "Microsoft Entra External ID", status: "enabled" },
    demandedBy: ["di-reported", "SEC-INTAKE-portals"] },
  { id: "INF-IDENTITY-STAFF", name: "Staff identity & roles", kind: "platform",
    what: "SSO plus the role claims every security register assumes — handler tiers, licensed intake, hold owners.",
    binding: { module: { source: "meridian/identity-workforce", version: "2.5.3" }, implementedBy: "Microsoft Entra ID", status: "enabled" },
    demandedBy: ["SEC-INTAKE-licensed", "SEC-ADJUD-handler", "SEC-ADJUD-senior-authority", "SEC-PAYMENTS-ops", "SEC-REPAIR-coordinator", "SEC-TOTALLOSS-specialist", "SEC-RECOVERY-specialist"] },
  { id: "INF-API-REG", name: "API registry & developer portal", kind: "platform",
    what: "Where the OpenAPI/AsyncAPI specifications live — the registry buttons on every trigger record point here.",
    binding: { module: { source: "meridian/developer-portal", version: "0.9.4" }, implementedBy: "Backstage", status: "enabled" },
    demandedBy: ["CT-appraisal-request", "CT-police-notice"] },
  { id: "INF-RUNTIME", name: "Container runtime & orchestration", kind: "platform",
    what: "Where the boxes' deployables run — the claims cluster's compute.",
    binding: { module: { source: "meridian/aks-cluster", version: "4.1.0" }, implementedBy: "Azure Kubernetes Service", status: "enabled" },
    demandedBy: ["HB-ADJUD-runtime", "HB-INTAKE-runtime", "HB-REPAIR-runtime", "HB-PAYMENTS-runtime", "HB-TOTALLOSS-runtime", "HB-RECOVERY-runtime"] },
  { id: "INF-RELDB", name: "Relational store (managed)", kind: "platform",
    what: "Private per-box relational databases — the append-heavy models most boxes chose.",
    binding: { module: { source: "meridian/postgres-flexible", version: "2.8.1" }, implementedBy: "Azure Database for PostgreSQL", status: "enabled" },
    demandedBy: ["HB-ADJUD-store", "HB-REPAIR-store", "HB-PAYMENTS-store", "HB-TOTALLOSS-store", "HB-RECOVERY-store"] },
  { id: "INF-DOCDB", name: "Document store (managed)", kind: "platform",
    what: "For the dossier-shaped records — intake's growing loss report.",
    binding: { module: { source: "meridian/cosmos-account", version: "1.6.0" }, implementedBy: "Azure Cosmos DB", status: "enabled" },
    demandedBy: ["HB-INTAKE-store"] },
  { id: "INF-OBJSTORE", name: "Object storage — evidence & documents", kind: "platform",
    what: "Photos, invoices, police notices, snapshots — content by reference, never by copy.",
    binding: { module: { source: "meridian/blob-container", version: "2.3.2" }, implementedBy: "Azure Blob Storage", status: "enabled" },
    demandedBy: ["dr-verified", "di-reported"] },
  { id: "INF-SECRETS", name: "Secrets & keys", kind: "platform",
    what: "Credentials, signing keys, and the banking-detail encryption the money seams demand.",
    binding: { module: { source: "meridian/key-vault", version: "3.2.0" }, implementedBy: "Azure Key Vault", status: "enabled" },
    demandedBy: ["SEC-PAYMENTS-data-class", "HB-PAYMENTS-runtime"] },
  { id: "INF-OBSERVABILITY", name: "Observability — metrics, logs, traces", kind: "platform",
    what: "Every service level is a promise only if something measures it.",
    binding: { module: { source: "meridian/observability-stack", version: "5.0.2" }, implementedBy: "Grafana / Prometheus / Loki", status: "enabled" },
    demandedBy: ["SL-ADJUD-audit-completeness", "SL-PAYMENTS-outcome", "SL-INTAKE-fnol-availability", "SL-REPAIR-breach"] },
  { id: "INF-MAINFRAME-LINK", name: "Private link to the on-prem mainframe", kind: "platform",
    what: "The snapshot events travel this link — the strangler seam's physical leg.",
    binding: { module: { source: "meridian/private-link-onprem", version: "1.2.1" }, implementedBy: "Azure ExpressRoute", status: "enabled" },
    demandedBy: ["SL-INTAKE-snapshot-request", "HB-ADJUD-doors"] },
  { id: "INF-HARDENED", name: "Hardened tier for banking data", kind: "constraint",
    what: "Isolated compute, restricted egress, masked-by-default access — what Payments' data class demands.",
    binding: { module: { source: "meridian/aks-hardened-pool", version: "0.3.0-rc1" }, implementedBy: "AKS isolated node pool + policy set", status: "in-review",
      note: "Security review in flight — Payments cannot deploy to production before it lands." },
    demandedBy: ["HB-PAYMENTS-runtime", "SEC-PAYMENTS-data-class"] },
  { id: "INF-RESIDENCY", name: "Data residency — Canada", kind: "constraint",
    what: "PII stays in-country: every store, every topic, every backup.",
    binding: { implementedBy: "Canada Central / Canada East regions", status: "enabled" },
    demandedBy: ["SEC-INTAKE-data-class", "SEC-ADJUD-data-class", "SEC-PAYMENTS-data-class", "SEC-REPAIR-data-class", "SEC-TOTALLOSS-data-class", "SEC-RECOVERY-data-class"] },
];

/* the gaps: demanded needs whose binding is not enabled — the pre-skeleton checklist */
export function infraGaps() {
  return INFRA_NEEDS.filter(n => n.binding.status !== "enabled" && (n.demandedBy || []).length > 0);
}
