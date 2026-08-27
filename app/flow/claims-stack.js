"use client";

/* ============================================================
   D-202 — THE BUILD MAP: the paved road + the deployables.
   The stack is decided ONCE PER LAYER at product level (STK- ids);
   a per-box deviation is the same record with a box `scope` and a
   recorded reason — the paved road stays visible, the exits are
   explicit. The DEPLOYABLES map design to build: the box is the
   unit of modeling; the deployable is chosen per box (never split
   one); containment beats extraction until volume argues back.
   Statuses: proposed → confirmed (the architect's Build opening).
   ============================================================ */

/* ── D-204: the RUNTIME CATALOG — every target runtime available on the
   bound cloud. One is chosen PER DEPLOYABLE; the catalog says when each
   fits. RT- ids; the choice lives on the deployable record. ── */
export const RUNTIMES = [
  { id: "RT-EKS", name: "Kubernetes (EKS, managed node groups)",
    when: "Long-running services with steady load — the default for the box services." },
  { id: "RT-EKS-FARGATE", name: "Kubernetes (EKS on Fargate)",
    when: "Same cluster, no nodes to manage — spiky or small workloads where per-pod pricing beats idle nodes." },
  { id: "RT-LAMBDA", name: "Serverless functions (Lambda)",
    when: "Event-driven glue and bursty, short-lived work — a candidate for thin consumers and the clock policies." },
  { id: "RT-ECS", name: "ECS (Fargate)",
    when: "Containers without Kubernetes — simpler ops if the platform team ever drops EKS; not our default." },
  { id: "RT-EC2-VM", name: "Virtual machines (EC2)",
    when: "The escape hatch — vendor appliances and anything that cannot be containerized. Nothing of ours should land here." },
];

export const STACK = [
  { id: "STK-RUNTIME", layer: "Runtime", scope: "product", status: "confirmed", binds: "INF-RUNTIME",
    choice: "Kubernetes (Amazon EKS)",
    why: "Already bound in the infrastructure register — the one layer the landing zone settled for us." },
  { id: "STK-LANGUAGE", layer: "Language", scope: "product", status: "proposed",
    choice: "Java 21 on the JVM",
    why: "A mainframe-era insurer has JVM talent nearby; first-class Kafka/Avro support; boring and hireable — the right virtues for money software." },
  { id: "STK-FRAMEWORK", layer: "Framework", scope: "product", status: "proposed",
    choice: "Spring Boot 3 + Spring Kafka — contract-first",
    why: "Code is GENERATED from the contracts registry (AsyncAPI/OpenAPI + schemas) — the doors cannot drift from the agreements." },
  { id: "STK-DATABASE", layer: "Database", scope: "product", status: "proposed", binds: "INF-RELDB",
    choice: "Aurora PostgreSQL — one engine, one database per box",
    why: "The stores are per box by design; one ENGINE keeps operations sane. Private schemas, no cross-box reads — the wall holds at the database." },
  { id: "STK-WORKFLOW", layer: "Workflow & clocks", scope: "product", status: "proposed",
    choice: "Choreography between boxes (events over contracts) — Temporal only inside a box, piloted first",
    why: "A central conductor would blur the seams we made explicit. Temporal fits the clock-heavy policies WITHIN a box, not between boxes." },
  { id: "STK-TESTING", layer: "Testing", scope: "product", status: "proposed",
    choice: "Cucumber runs the CAT- Gherkin verbatim · Testcontainers · contract tests per CT-",
    why: "The component tests are the QA gate executing unchanged — the design's acceptance layer IS the pipeline's law." },
  { id: "STK-OBSERVABILITY", layer: "Observability", scope: "product", status: "proposed", binds: "INF-OBSERVABILITY",
    choice: "OpenTelemetry → the Grafana stack",
    why: "Every service level is a promise only if something measures it — one tracing standard across all deployables." },
  /* ── deviations: same record, box scope, explicit reason ── */
  { id: "STK-INTAKE-STORE", layer: "Database — deviation", scope: "CTX-INTAKE", status: "proposed", changes: "HB-INTAKE-store",
    choice: "PostgreSQL JSONB instead of DocumentDB",
    why: "The dossier shape survives as JSONB; the engine count drops to one. Changes the box's how-built store record." },
  { id: "STK-RECOVERY-WORKFLOW", layer: "Workflow — pilot", scope: "CTX-RECOVERY", status: "proposed", changes: "HB-RECOVERY-doors",
    choice: "Temporal pilot for the clock policies",
    why: "The natural lab: lowest volume, most clock-driven (demand deadlines, escalations). The pilot's verdict decides wider adoption." },
];

export const DEPLOYABLES = [
  { id: "DEP-INTAKE", name: "intake-svc", status: "proposed", contains: ["CTX-INTAKE"], hb: "HB-INTAKE-packaging",
    runtime: "RT-EKS", artifact: { kind: "OCI container image", ref: "ecr: meridian/intake-svc", build: "CI on merge — Dockerfile · SBOM · signed" },
    note: "The front door: portal API, desk, police ACL, triage — one deployable, latency-facing." },
  { id: "DEP-ADJUD", name: "adjudication-svc", status: "proposed", contains: ["CTX-ADJUD", "CTX-TOTALLOSS", "CTX-RECOVERY"], hb: "HB-ADJUD-packaging",
    runtime: "RT-EKS", artifact: { kind: "OCI container image", ref: "ecr: meridian/adjudication-svc", build: "CI on merge — Dockerfile · SBOM · signed" },
    note: "Total loss & Recovery ride as MODULES beside the claim file — never split, cheaply extracted later when volume argues." },
  { id: "DEP-REPAIR", name: "repair-svc", status: "proposed", contains: ["CTX-REPAIR"], hb: "HB-REPAIR-packaging",
    runtime: "RT-EKS", artifact: { kind: "OCI container image", ref: "ecr: meridian/repair-svc", build: "CI on merge — Dockerfile · SBOM · signed" },
    note: "The partner-facing box: the shop surface fronts through the partner edge." },
  { id: "DEP-PAYMENTS", name: "payments-svc", status: "proposed", contains: ["CTX-PAYMENTS"], hb: "HB-PAYMENTS-packaging",
    runtime: "RT-EKS", runtimeNote: "hardened node group (INF-HARDENED)", artifact: { kind: "OCI container image", ref: "ecr: meridian/payments-svc", build: "CI on merge — Dockerfile · SBOM · signed · stricter admission policy" },
    note: "Its own service from day one — correctness-critical, hardened tier, gated on INF-HARDENED for prod." },
];
