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
   layer: which org, which OUs, which account
   realizes which environment (on AWS: which account). ── */
export const ENVIRONMENTS = [
  { id: "ENV-DEV", name: "Dev", order: 1,
    purpose: "The builders' sandbox — every commit deploys, everything is disposable, nothing is precious.",
    gates: "None — any build lands; broken is allowed here and nowhere else.",
    dataRule: "Synthetic data only — generated, never sampled from production.",
    binding: { account: "aws-meridian-claims-dev", note: "Auto-deploy on every merge; resources are ephemeral." } },
  { id: "ENV-QA", name: "QA", order: 2,
    purpose: "Where the component tests are the law — every Gherkin scenario runs here on every promotion.",
    gates: "Promotion from dev on a green build; the component tests must pass to leave.",
    dataRule: "Synthetic and masked datasets — shaped like production, containing nobody.",
    binding: { account: "aws-meridian-claims-qa", note: "Deploys via promotion pipeline; test evidence retained per run." } },
  { id: "ENV-PREPROD", name: "Preprod", order: 3,
    purpose: "Production's twin: real integrations in test mode (mainframe test partition, HCAI conformance), performance runs against the service levels.",
    gates: "Promotion from QA only; the service-level checks must pass here.",
    dataRule: "Masked production-shaped data; the residency constraint applies as in prod.",
    binding: { account: "aws-meridian-claims-preprod", note: "Deploys via promotion pipeline; change window free." } },
  { id: "ENV-PROD", name: "Prod", order: 4,
    purpose: "The claimants' environment — every service level and security row applies at full force.",
    gates: "Promotion from preprod only; Payments additionally gated on INF-HARDENED landing.",
    dataRule: "Real PII and banking data — residency, masking, access logging all in force.",
    binding: { account: "aws-meridian-claims-prod", note: "Change windows + approval; the hardened node pool hosts Payments." } },
];

export const CLOUD_SETUP = {
  id: "CLOUD-MERIDIAN-AWS",
  provider: "Amazon Web Services",
  tenant: "o-meridian · AWS Organizations (management account meridian-root)",
  regions: "ca-central-1 Canada Central (primary) · ca-west-1 Calgary (DR)",
  orgModel: [
    { group: "ou-root", holds: "Org-wide SCPs: residency, tagging, deny-public-storage, baseline logging." },
    { group: "ou-platform", holds: "Shared platforms: identity, connectivity (Direct Connect), observability, the Terraform state backend." },
    { group: "ou-landingzones/claims", holds: "The claims landing zone — the four environment accounts below." },
  ],
  policies: [
    { id: "CPOL-RESIDENCY", rule: "All resources deploy to Canadian regions only — SCP-denied elsewhere.", binds: "INF-RESIDENCY" },
    { id: "CPOL-TAGGING", rule: "Every resource carries product, environment and owner tags — deny untagged." },
    { id: "CPOL-NO-PUBLIC-DATA", rule: "No publicly-reachable storage or databases — deny via SCP at the OU." },
    { id: "CPOL-BASELINE-LOGS", rule: "Activity and data-plane logs ship to observability by default." },
  ],
  iac: "Terraform — curated internal modules only (secure, HA, observable, monitored, permission-enabled by construction); state in the platform backend; plans reviewed, applies from CI.",
};

export const INFRA_NEEDS = [
  { id: "INF-PUBSUB", name: "Pub/sub messaging — the claims stream", kind: "platform",
    what: "Ordered, replayable topics with consumer groups and dead-letter queues — every seam contract rides this.",
    binding: { module: { source: "meridian/pubsub-cluster", version: "1.4.0" }, implementedBy: "Amazon MSK (Kafka)", status: "not-provisioned",
      note: "The platform is enterprise-approved; the CLAIMS cluster the design assumes is not yet provisioned. Nothing crosses a seam until it is." },
    demandedBy: ["CT-claim-opened", "CT-repair-verified", "CT-payment-instruction", "CT-payment-settled", "CT-recovery-referred", "CT-threshold-breach", "CT-salvage-proceeds", "CT-credit-received", "CT-police-notice", "HB-ADJUD-doors", "HB-INTAKE-doors", "HB-REPAIR-doors", "HB-PAYMENTS-doors", "HB-TOTALLOSS-doors", "HB-RECOVERY-doors"] },
  { id: "INF-SCHEMA-REG", name: "Schema registry", kind: "platform",
    what: "The payload schemas behind every contract, versioned — additive-only enforcement lives here.",
    binding: { module: { source: "meridian/schema-registry", version: "1.1.2" }, implementedBy: "AWS Glue Schema Registry", status: "not-provisioned",
      note: "Provisioned with the claims cluster — same gap, same unblocking work." },
    demandedBy: ["CT-claim-opened", "CT-payment-instruction", "CT-repair-verified"] },
  { id: "INF-API-GW", name: "Public API gateway", kind: "platform",
    what: "The front door for customer-facing APIs — throttling, keys, the public edge.",
    binding: { module: { source: "meridian/api-gateway", version: "3.0.1" }, implementedBy: "Amazon API Gateway", status: "enabled" },
    demandedBy: ["di-reported", "HB-INTAKE-doors", "SL-INTAKE-fnol-availability"] },
  { id: "INF-PARTNER-EDGE", name: "Partner surface — external networks", kind: "platform",
    what: "The authenticated edge for shops and the salvage network — partners see their own cases only.",
    binding: { module: { source: "meridian/api-gateway", version: "3.0.1" }, implementedBy: "Amazon API Gateway (partner tier)", status: "enabled" },
    demandedBy: ["SEC-REPAIR-shops", "SEC-TOTALLOSS-network"] },
  { id: "INF-IDENTITY-CUSTOMER", name: "Customer identity", kind: "platform",
    what: "OIDC sessions for claimants on the portal doors.",
    binding: { module: { source: "meridian/identity-external", version: "2.2.0" }, implementedBy: "Amazon Cognito", status: "enabled" },
    demandedBy: ["di-reported", "SEC-INTAKE-portals"] },
  { id: "INF-IDENTITY-STAFF", name: "Staff identity & roles", kind: "platform",
    what: "SSO plus the role claims every security register assumes — handler tiers, licensed intake, hold owners.",
    binding: { module: { source: "meridian/identity-workforce", version: "2.5.3" }, implementedBy: "AWS IAM Identity Center (Entra federation)", status: "enabled" },
    demandedBy: ["SEC-INTAKE-licensed", "SEC-ADJUD-handler", "SEC-ADJUD-senior-authority", "SEC-PAYMENTS-ops", "SEC-REPAIR-coordinator", "SEC-TOTALLOSS-specialist", "SEC-RECOVERY-specialist"] },
  { id: "INF-API-REG", name: "API registry & developer portal", kind: "platform",
    what: "Where the OpenAPI/AsyncAPI specifications live — the registry buttons on every trigger record point here.",
    binding: { module: { source: "meridian/developer-portal", version: "0.9.4" }, implementedBy: "Backstage", status: "enabled" },
    demandedBy: ["CT-appraisal-request", "CT-police-notice"] },
  { id: "INF-RUNTIME", name: "Container runtime & orchestration", kind: "platform",
    what: "Where the boxes' deployables run — the claims cluster's compute.",
    binding: { module: { source: "meridian/eks-cluster", version: "4.1.0" }, implementedBy: "Amazon EKS", status: "enabled" },
    demandedBy: ["HB-ADJUD-runtime", "HB-INTAKE-runtime", "HB-REPAIR-runtime", "HB-PAYMENTS-runtime", "HB-TOTALLOSS-runtime", "HB-RECOVERY-runtime"] },
  { id: "INF-RELDB", name: "Relational store (managed)", kind: "platform",
    what: "Private per-box relational databases — the append-heavy models most boxes chose.",
    binding: { module: { source: "meridian/aurora-postgres", version: "2.8.1" }, implementedBy: "Amazon Aurora PostgreSQL", status: "enabled" },
    demandedBy: ["HB-ADJUD-store", "HB-REPAIR-store", "HB-PAYMENTS-store", "HB-TOTALLOSS-store", "HB-RECOVERY-store"] },
  { id: "INF-DOCDB", name: "Document store (managed)", kind: "platform",
    what: "For the dossier-shaped records — intake's growing loss report.",
    binding: { module: { source: "meridian/documentdb-cluster", version: "1.6.0" }, implementedBy: "Amazon DocumentDB", status: "enabled" },
    demandedBy: ["HB-INTAKE-store"] },
  { id: "INF-OBJSTORE", name: "Object storage — evidence & documents", kind: "platform",
    what: "Photos, invoices, police notices, snapshots — content by reference, never by copy.",
    binding: { module: { source: "meridian/s3-bucket", version: "2.3.2" }, implementedBy: "Amazon S3", status: "enabled" },
    demandedBy: ["dr-verified", "di-reported"] },
  { id: "INF-SECRETS", name: "Secrets & keys", kind: "platform",
    what: "Credentials, signing keys, and the banking-detail encryption the money seams demand.",
    binding: { module: { source: "meridian/secrets-manager", version: "3.2.0" }, implementedBy: "AWS Secrets Manager + KMS", status: "enabled" },
    demandedBy: ["SEC-PAYMENTS-data-class", "HB-PAYMENTS-runtime"] },
  { id: "INF-OBSERVABILITY", name: "Observability — metrics, logs, traces", kind: "platform",
    what: "Every service level is a promise only if something measures it.",
    binding: { module: { source: "meridian/observability-stack", version: "5.0.2" }, implementedBy: "Grafana / Prometheus / Loki", status: "enabled" },
    demandedBy: ["SL-ADJUD-audit-completeness", "SL-PAYMENTS-outcome", "SL-INTAKE-fnol-availability", "SL-REPAIR-breach"] },
  { id: "INF-MAINFRAME-LINK", name: "Private link to the on-prem mainframe", kind: "platform",
    what: "The snapshot events travel this link — the strangler seam's physical leg.",
    binding: { module: { source: "meridian/private-link-onprem", version: "1.2.1" }, implementedBy: "AWS Direct Connect", status: "enabled" },
    demandedBy: ["SL-INTAKE-snapshot-request", "HB-ADJUD-doors"] },
  { id: "INF-HARDENED", name: "Hardened tier for banking data", kind: "constraint",
    what: "Isolated compute, restricted egress, masked-by-default access — what Payments' data class demands.",
    binding: { module: { source: "meridian/eks-hardened-nodegroup", version: "0.3.0-rc1" }, implementedBy: "EKS isolated node group + SCP set", status: "in-review",
      note: "Security review in flight — Payments cannot deploy to production before it lands." },
    demandedBy: ["HB-PAYMENTS-runtime", "SEC-PAYMENTS-data-class"] },
  { id: "INF-RESIDENCY", name: "Data residency — Canada", kind: "constraint",
    what: "PII stays in-country: every store, every topic, every backup.",
    binding: { implementedBy: "ca-central-1 / ca-west-1 regions only", status: "enabled" },
    demandedBy: ["SEC-INTAKE-data-class", "SEC-ADJUD-data-class", "SEC-PAYMENTS-data-class", "SEC-REPAIR-data-class", "SEC-TOTALLOSS-data-class", "SEC-RECOVERY-data-class"] },
];

/* the gaps: demanded needs whose binding is not enabled — the pre-skeleton checklist */
export function infraGaps() {
  return INFRA_NEEDS.filter(n => n.binding.status !== "enabled" && (n.demandedBy || []).length > 0);
}
