"use client";

/* ============================================================
   D-196 — THE CONTRACTS REGISTRY. A contract binds TWO parties, so
   it is authored ONCE here — never inside a box's packet (the D-194
   replication would have forced Intake to re-author claim-opened).
   Each box's Contracts page is a VIEW of this registry: the
   agreements it binds, in its own direction. `from`/`to` are context
   ids where the party is a wall; display labels where the party is
   an external surface (externals have no ids yet — honest).
   Field-level payloads stay properties of the contract (D-189: the
   unit of independent change is the contract version).
   ============================================================ */

export const CLAIMS_CONTRACTS = [
  { id: "CT-claim-opened", name: "claim-opened", version: "v1", from: "CTX-INTAKE", to: "CTX-ADJUD",
    pattern: "customer–supplier · adjudication drives the payload",
    fields: [
      { name: "claim_number", type: "string", desc: "The identity — also the idempotency and ordering key." },
      { name: "notice_date · date_of_loss", type: "dates", desc: "The legal clock and the snapshot anchor." },
      { name: "parties", type: "list", desc: "Claimant, insured, third parties — as registered." },
      { name: "vehicle & circumstances", type: "structured text", desc: "What was reported, consolidated across channels." },
      { name: "severity_lane", type: "enum", desc: "The triage suggestion — a suggestion, not a decision." },
      { name: "snapshot_ref", type: "string", desc: "The stored coverage snapshot keyed to date of loss." },
    ],
    promises: "At-least-once · ordered per claim number · replayable 30 days · consumer replays are no-ops.",
    change: "Additive fields only; adjudication (the consumer) signs off every change; one deprecated version carried at a time.",
    obligations: "Dense PII — subscribers are allow-listed; delivery within minutes of registration." },

  { id: "CT-repair-verified", name: "repair-verified", version: "v1", from: "CTX-REPAIR", to: "CTX-ADJUD",
    pattern: "customer–supplier · the estimate of record returns",
    fields: [
      { name: "claim_number", type: "string", desc: "The file this verification belongs to." },
      { name: "estimate_of_record", type: "money + lines", desc: "The approved estimate with approved supplements — the settlement's basis." },
      { name: "completion_evidence", type: "refs", desc: "Photos, invoices, certification — by reference, not by copy." },
    ],
    promises: "At-least-once · one verification per repair case · corrections arrive as a new version, never an edit.",
    change: "Additive only; adjudication signs off.", obligations: "Same-day delivery after verification." },

  { id: "CT-appraisal-request", name: "appraisal-request", version: "v1", from: "CTX-ADJUD", to: "CTX-REPAIR",
    pattern: "customer–supplier · adjudication asks, the estimate returns",
    fields: [
      { name: "claim_number", type: "string", desc: "The requesting file." },
      { name: "vehicle & damage", type: "structured text", desc: "What needs pricing — the reported damage, not the whole file." },
      { name: "coverage_ceiling", type: "money", desc: "The limit the estimate works under — not the reserve, which stays private." },
    ],
    promises: "One open request per claim · cancellation is an explicit message, not silence.",
    change: "Additive only; coordination consumes as published.", obligations: "The claim's private facts (reserves, fault position) never cross." },

  { id: "CT-payment-instruction", name: "payment-instruction", version: "v1", from: "CTX-ADJUD", to: "CTX-PAYMENTS",
    pattern: "customer–supplier · THE new seam: adjudication instructs, payments executes",
    fields: [
      { name: "instruction_id", type: "string", desc: "The idempotency key — one instruction, one execution." },
      { name: "claim_number", type: "string", desc: "The file the money belongs to." },
      { name: "payee & method", type: "structured", desc: "Who gets paid, how — from the verified payee view." },
      { name: "amount & coverage_line", type: "money + enum", desc: "What is paid, against which line." },
      { name: "authority_ref", type: "string", desc: "Who authorized, under which limit — the audit thread." },
    ],
    promises: "Exactly-once execution per instruction_id · the outcome (settled or failed) always returns as an event.",
    change: "Additive only; payments (the executor) is consulted, adjudication decides.",
    obligations: "The ledger state stays instructed-not-yet-settled until the outcome returns.", grounds: ["FR6"] },

  { id: "CT-payment-settled", name: "payment-settled", version: "v1", from: "CTX-PAYMENTS", to: "CTX-ADJUD",
    pattern: "customer–supplier · the outcome leg of the instruction",
    fields: [
      { name: "instruction_id · claim_number", type: "strings", desc: "Which instruction concluded, on which file." },
      { name: "outcome", type: "enum", desc: "settled · failed — a failure reopens the money question, never silently." },
      { name: "settled_at · method", type: "date + enum", desc: "When and how the money actually moved." },
    ],
    promises: "Every instruction gets exactly one terminal outcome event.",
    change: "Additive only.", obligations: "Same-day delivery after settlement.", grounds: ["FR6"] },

  { id: "CT-recovery-referred", name: "recovery-referred", version: "v1", from: "CTX-ADJUD", to: "CTX-RECOVERY",
    pattern: "customer–supplier · post-close: the closed file's facts open the case",
    fields: [
      { name: "claim_number", type: "string", desc: "The closed file behind the referral." },
      { name: "fault_position", type: "structured", desc: "The determined fault and its basis — recovery argues from it." },
      { name: "quantum_paid", type: "money", desc: "What was actually paid — the ceiling of any demand." },
      { name: "evidence_refs", type: "refs", desc: "The file's evidence, by reference — recovery reads, never edits." },
    ],
    promises: "Referral only after close · the file itself stays with adjudication.",
    change: "Additive only; recovery consumes as published.", obligations: "Credits return through Claim payments, never directly." },

  /* ── D-196: the seams the replication needed ── */
  { id: "CT-threshold-breach", name: "threshold-breach", version: "v1", from: "CTX-REPAIR", to: "CTX-TOTALLOSS",
    pattern: "customer–supplier · an estimate over the line hands the vehicle over",
    fields: [
      { name: "claim_number", type: "string", desc: "The file whose vehicle crosses over." },
      { name: "estimate_of_record", type: "money + lines", desc: "The priced damage that breached the line — the valuation starts from it." },
      { name: "vehicle", type: "structured", desc: "VIN, condition, location — what total loss takes charge of." },
      { name: "threshold_applied", type: "money + pct", desc: "The line that was crossed, as applied — auditable." },
    ],
    promises: "One breach per repair case · coordination stops all repair activity on declaration.",
    change: "Additive only; total loss (the consumer) signs off.",
    obligations: "Declared immediately on breach — the owner is waiting.", grounds: ["FR9"] },

  { id: "CT-salvage-proceeds", name: "salvage-proceeds", version: "v1", from: "CTX-TOTALLOSS", to: "CTX-PAYMENTS",
    pattern: "published events · disposal proceeds credit the claim through the ledger",
    fields: [
      { name: "claim_number", type: "string", desc: "The claim the proceeds credit." },
      { name: "proceeds", type: "money", desc: "What the disposal actually returned." },
      { name: "disposition_ref", type: "string", desc: "The salvage case and buyer — the audit thread." },
    ],
    promises: "At-least-once · one proceeds event per disposition · replays are no-ops on the ledger.",
    change: "Additive only.", obligations: "Published same day as disposal completes.", grounds: ["FR9"] },

  { id: "CT-credit-received", name: "credit-received", version: "v1", from: "CTX-PAYMENTS", to: "CTX-ADJUD",
    pattern: "published events · money in — salvage and recovery — lands against the claim, even after close",
    fields: [
      { name: "claim_number", type: "string", desc: "The file the credit lands on — open or closed." },
      { name: "source", type: "enum", desc: "salvage · recovery — where the money came back from." },
      { name: "amount", type: "money", desc: "The credited amount, as booked on the ledger." },
      { name: "ledger_entry", type: "string", desc: "The ledger entry that carried it — the audit thread." },
    ],
    promises: "At-least-once · booked before published — the ledger is already true when the event arrives.",
    change: "Additive only.", obligations: "A closed file accepts the credit without reopening the past." },

  { id: "CT-police-notice", name: "police-report-notice", version: "v1", from: "Provincial police feed", to: "CTX-INTAKE",
    pattern: "anti-corruption layer · an outside feed, translated at the door",
    fields: [
      { name: "police_report_number", type: "string", desc: "The feed's identity — the partition and merge key." },
      { name: "incident", type: "structured text", desc: "Date, place, parties and vehicles as the police recorded them." },
    ],
    promises: "At-least-once · merges into the existing loss report — never a duplicate (dlq on translation failure).",
    change: "The feed's format is theirs; the ACL translates — our side changes without renegotiation.",
    obligations: "The notice opens or enriches a report; it never registers a claim by itself.", grounds: ["FR1"] },
];
