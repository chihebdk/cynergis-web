"use client";

/* ============================================================
   D-194 — CAPABILITIES, untangled from use cases.
   A use case is DEMAND: an actor's goal, owned by Discover, usually
   bigger than one box. A capability is SUPPLY: an ability a box
   provides — stable, actor-agnostic, owned entirely inside the box.
   The relationship is many-to-many and lives on `serves` (id joins).
   A capability with an empty `serves` is an honest finding: the box
   supplies something no captured use case names yet (Discover gap).
   Realization decisions (form × surface) anchor to the CAPABILITY —
   how the box builds its ability — via `capId` on the realization.
   ============================================================ */

export const CONTEXT_CAPABILITIES = {
  "CTX-INTAKE": [
    { id: "CAP-INTAKE-capture-loss-reports", name: "Capture loss reports across every channel", serves: ["UC1", "UC2"] },
    { id: "CAP-INTAKE-merge-reports", name: "Match & merge submissions into one report", serves: ["UC1", "UC2"] },
    { id: "CAP-INTAKE-triage-severity", name: "Score severity & suggest the lane", serves: ["UC2"] },
    { id: "CAP-INTAKE-register-claims", name: "Register the claim — number, notice date, dedup", serves: ["UC1", "UC2"] },
  ],
  "CTX-ADJUD": [
    { id: "CAP-ADJUD-verify-coverage", name: "Verify policy & coverage from the snapshot", serves: ["UC3", "UC4"] },
    { id: "CAP-ADJUD-set-reserves", name: "Establish & move reserves, evented", serves: ["UC4"] },
    { id: "CAP-ADJUD-determine-fault", name: "Determine fault under the applicable rules", serves: ["UC4"] },
    { id: "CAP-ADJUD-calculate-settlements", name: "Calculate settlements from the estimate of record", serves: ["UC6"] },
    { id: "CAP-ADJUD-authorize-payments", name: "Authorize payments & instruct Claim payments", serves: ["UC6"] },
    { id: "CAP-ADJUD-manage-holds", name: "Apply, gate on, and escalate holds", serves: [] },
    { id: "CAP-ADJUD-close-and-reopen", name: "Close files & reopen with decision versions", serves: [] },
    { id: "CAP-ADJUD-publish-status", name: "Publish the claim status stream", serves: ["UC8"] },
  ],
  "CTX-REPAIR": [
    { id: "CAP-REPAIR-coordinate-appraisals", name: "Assign & coordinate appraisals with the network", serves: ["UC6"] },
    { id: "CAP-REPAIR-price-damage", name: "Price the damage — the estimate of record", serves: ["UC6", "UC7"] },
    { id: "CAP-REPAIR-verify-repairs", name: "Approve supplements & verify completed repairs", serves: ["UC6"] },
    { id: "CAP-REPAIR-declare-threshold", name: "Declare total-loss threshold breaches", serves: ["UC7"] },
  ],
  "CTX-PAYMENTS": [
    { id: "CAP-PAYMENTS-execute-instructions", name: "Execute payment instructions, exactly once", serves: ["UC6"] },
    { id: "CAP-PAYMENTS-keep-ledger", name: "Keep the money ledger — the single truth", serves: ["UC6"] },
    { id: "CAP-PAYMENTS-book-credits", name: "Book inbound credits — salvage & recovery", serves: ["UC7"] },
  ],
  "CTX-TOTALLOSS": [
    { id: "CAP-TOTALLOSS-value-vehicles", name: "Value vehicles — ACV with comparables", serves: ["UC7"] },
    { id: "CAP-TOTALLOSS-settle-owners", name: "Settle with owners & manage the title", serves: ["UC7"] },
    { id: "CAP-TOTALLOSS-dispose-salvage", name: "Dispose salvage & return the proceeds", serves: ["UC7"] },
  ],
  "CTX-RECOVERY": [
    { id: "CAP-RECOVERY-build-demands", name: "Build & issue recovery demands from the closed file", serves: [] },
    { id: "CAP-RECOVERY-collect", name: "Collect recoveries & credit them through Claim payments", serves: [] },
  ],
};
