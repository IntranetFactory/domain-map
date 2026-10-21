// CWM B9D owner resolution: author process_raci R/A rows for the two answered
// b9d owner questions (a10 = AP ownership, a11 = supplier-management ownership).
// Both answers took the recommendation (option a: the named persona owns + approves).
// CWM personas live in domain_roles (business_function_id=68, Indirect Procurement):
//   19 Contingent Workforce Program Manager
//   20 Staffing Supplier Manager
//   21 Contingent Labor Coordinator
//   10 Hiring Manager (cross-functional)
//
// q10 (B2-B9D-OWN-315) -> process 315 "Process accounts payable (AP)"
//   owner: Contingent Labor Coordinator (21) -- owns Time & Invoicing (316), where
//   contingent_invoices and AP approval live. This is CWM's accounts-payable persona.
// q11 (B2-B9D-OWN-167 / live orphan process 815 "Monitor/Manage supplier information",
//   handoff 591) -> owner: Staffing Supplier Manager (20) -- the supplier-management persona.
//
// Additive only; all rows land at record_status='new' (the table has no record_status
// column; nothing here touches any record_status anywhere). Idempotent: skips a row when
// an identical (process_id, actor_role_id, raci) already exists.

import { execFileSync } from "node:child_process";

function call(method: string, path: string, body?: unknown): any {
  const arg: any = { method, path };
  if (body !== undefined) arg.body = body;
  const out = execFileSync(
    "semantius",
    ["call", "crud", "postgrestRequest", JSON.stringify(arg)],
    { encoding: "utf8" },
  );
  return out.trim() ? JSON.parse(out) : null;
}

type Row = {
  process_id: number;
  actor_role_id: number;
  raci: "responsible" | "accountable";
  process_raci_label: string;
};

const rows: Row[] = [
  // q10: AP -> Contingent Labor Coordinator
  {
    process_id: 315,
    actor_role_id: 21,
    raci: "responsible",
    process_raci_label:
      "Process accounts payable (AP) / responsible = INDIRECT-PROCUREMENT-CONTINGENT-LABOR-COORDINATOR",
  },
  {
    process_id: 315,
    actor_role_id: 21,
    raci: "accountable",
    process_raci_label:
      "Process accounts payable (AP) / accountable = INDIRECT-PROCUREMENT-CONTINGENT-LABOR-COORDINATOR",
  },
  // q11: Manage supplier information -> Staffing Supplier Manager
  {
    process_id: 815,
    actor_role_id: 20,
    raci: "responsible",
    process_raci_label:
      "Monitor/Manage supplier information / responsible = INDIRECT-PROCUREMENT-SUPPLIER-MANAGER",
  },
  {
    process_id: 815,
    actor_role_id: 20,
    raci: "accountable",
    process_raci_label:
      "Monitor/Manage supplier information / accountable = INDIRECT-PROCUREMENT-SUPPLIER-MANAGER",
  },
];

for (const r of rows) {
  const existing = call(
    "GET",
    `/process_raci?process_id=eq.${r.process_id}&actor_role_id=eq.${r.actor_role_id}&raci=eq.${r.raci}&select=id`,
  );
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(
      `SKIP (exists id=${existing[0].id}): process ${r.process_id} / ${r.raci} / role ${r.actor_role_id}`,
    );
    continue;
  }
  const inserted = call("POST", "/process_raci", r);
  const id = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;
  console.log(
    `INSERT id=${id ?? "?"}: process ${r.process_id} / ${r.raci} / role ${r.actor_role_id}`,
  );
}

console.log("done.");
