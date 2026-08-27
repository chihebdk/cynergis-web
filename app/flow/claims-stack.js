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
    note: "The front door: portal API, desk, police ACL, triage — one deployable, latency-facing." },
  { id: "DEP-ADJUD", name: "adjudication-svc", status: "proposed", contains: ["CTX-ADJUD", "CTX-TOTALLOSS", "CTX-RECOVERY"], hb: "HB-ADJUD-packaging",
    note: "Total loss & Recovery ride as MODULES beside the claim file — never split, cheaply extracted later when volume argues." },
  { id: "DEP-REPAIR", name: "repair-svc", status: "proposed", contains: ["CTX-REPAIR"], hb: "HB-REPAIR-packaging",
    note: "The partner-facing box: the shop surface fronts through the partner edge." },
  { id: "DEP-PAYMENTS", name: "payments-svc", status: "proposed", contains: ["CTX-PAYMENTS"], hb: "HB-PAYMENTS-packaging",
    note: "Its own service from day one — correctness-critical, hardened tier, gated on INF-HARDENED for prod." },
];
