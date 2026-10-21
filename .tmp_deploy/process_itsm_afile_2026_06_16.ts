#!/usr/bin/env bun
/**
 * process_itsm_afile_2026_06_16.ts
 *
 * Executes the approved catalog writes for the ITSM a-file (audits/ITSM/a-ITSM.md).
 * All writes are additive/corrective at record_status='new' (omitted on insert -> DB default),
 * plus the two DESTRUCTIVE structural embeds that a1='a' explicitly approves.
 *
 * Idempotent: reads live state first, only writes what is missing / not yet at the target value.
 * NEVER touches record_status. NEVER runs git. Catalog rows only.
 *
 * Steps:
 *   1. q1 (a1=a, DESTRUCTIVE structural, APPROVED): embed both self-containment violators as
 *      embedded_master  -> PATCH DMDO 140 (asset_lifecycle_events on ITSM-INCIDENT-MGMT) role->embedded_master,
 *                          PATCH DMDO 679 (onboarding_tasks on ITSM-SERVICE-REQUEST) role->embedded_master.
 *   2. q2 (a2=yes): service_incidents.has_personal_content=true  (data_objects id 47).
 *   3. q4 (a4 empty -> Recommended yes): service_changes.has_submit_lock=true (data_objects id 50).
 *   4. q6 (a6 empty -> Recommended yes, add all seven): INSERT 7 new data_objects + 7 master DMDO rows.
 */
export {};
import { pg } from "../scripts/lib/catalog";

const ITSM = {
  "ITSM-INCIDENT-MGMT": 38,
  "ITSM-SERVICE-REQUEST": 39,
  "ITSM-CHANGE-MGMT": 41,
  "ITSM-AGENT-WORKSPACE": 44,
} as const;

type Plan = {
  name: string;
  description: string;
  singular_label: string;
  plural_label: string;
  entity_type: string;
  module_id: number;
};

// q6: the seven CONFIRMED additive masters (Phase 0 2026-06-08; q6 Recommended = yes, add all seven).
const NEW_ENTITIES: Plan[] = [
  {
    name: "service_outages",
    description:
      "A customer-facing outage or status record, separate from the internal incident. Captures the affected service, the public status (investigating, identified, monitoring, resolved), start and end times, and the customer-facing message. Distinct from the internal incident work item.",
    singular_label: "Service Outage",
    plural_label: "Service Outages",
    entity_type: "operational_workflow",
    module_id: ITSM["ITSM-INCIDENT-MGMT"],
  },
  {
    name: "service_releases",
    description:
      "A release or deployment record that bundles one or more changes into a single shippable unit. Carries the release window, the included changes, deployment status, and rollback plan. Distinct from a single change ticket.",
    singular_label: "Service Release",
    plural_label: "Service Releases",
    entity_type: "operational_workflow",
    module_id: ITSM["ITSM-CHANGE-MGMT"],
  },
  {
    name: "cab_meetings",
    description:
      "A Change Advisory Board meeting record: agenda, attendees, the changes reviewed, decisions, and minutes. The first-class artifact of the CAB review step in change management.",
    singular_label: "CAB Meeting",
    plural_label: "CAB Meetings",
    entity_type: "operational_record",
    module_id: ITSM["ITSM-CHANGE-MGMT"],
  },
  {
    name: "change_collisions",
    description:
      "A detected conflict between overlapping changes or a change scheduled inside a blackout window. Records the colliding changes, the window in question, and the resolution. Surfaces scheduling conflicts before they reach implementation.",
    singular_label: "Change Collision",
    plural_label: "Change Collisions",
    entity_type: "operational_record",
    module_id: ITSM["ITSM-CHANGE-MGMT"],
  },
  {
    name: "service_offerings",
    description:
      "The back-end service definition (commitments, supported configurations, and fulfillment details) split from its user-facing catalog item presentation. One offering can back several catalog items, and a catalog item can present one offering.",
    singular_label: "Service Offering",
    plural_label: "Service Offerings",
    entity_type: "catalog",
    module_id: ITSM["ITSM-SERVICE-REQUEST"],
  },
  {
    name: "virtual_agent_conversations",
    description:
      "A chatbot or virtual-agent conversation transcript: the turn-by-turn exchange, the resolved intent, any deflection or escalation to a human agent, and the ticket it produced. Backs the Virtual Agent capability.",
    singular_label: "Virtual Agent Conversation",
    plural_label: "Virtual Agent Conversations",
    entity_type: "operational_record",
    module_id: ITSM["ITSM-AGENT-WORKSPACE"],
  },
  {
    name: "walkup_visits",
    description:
      "A walk-up or onsite check-in record: the visitor, the reason for the visit, queue position, estimated service time, and outcome. Backs the Walk-Up capability. The kiosk is treated as a location attribute, not a separate entity.",
    singular_label: "Walk-Up Visit",
    plural_label: "Walk-Up Visits",
    entity_type: "operational_workflow",
    module_id: ITSM["ITSM-AGENT-WORKSPACE"],
  },
];

async function main() {
  const summary: string[] = [];

  // ---- Step 1: q1 self-containment embeds (DESTRUCTIVE structural, approved by a1=a) ----
  for (const [id, label] of [
    [140, "asset_lifecycle_events on ITSM-INCIDENT-MGMT"],
    [679, "onboarding_tasks on ITSM-SERVICE-REQUEST"],
  ] as const) {
    const cur = (await pg("GET", `/domain_module_data_objects?id=eq.${id}&select=id,role,necessity`))[0];
    if (!cur) {
      summary.push(`q1 SKIP: DMDO ${id} not found`);
      continue;
    }
    if (cur.role === "embedded_master") {
      summary.push(`q1 OK (already embedded_master): DMDO ${id} (${label})`);
    } else {
      await pg("PATCH", `/domain_module_data_objects?id=eq.${id}`, { role: "embedded_master" });
      summary.push(`q1 PATCHED: DMDO ${id} (${label}) role ${cur.role} -> embedded_master (necessity stays ${cur.necessity})`);
    }
  }

  // ---- Step 2: q2 incident PII flag (a2=yes) ----
  {
    const cur = (await pg("GET", `/data_objects?id=eq.47&select=id,has_personal_content`))[0];
    if (cur?.has_personal_content === true) {
      summary.push(`q2 OK (already true): service_incidents.has_personal_content`);
    } else {
      await pg("PATCH", `/data_objects?id=eq.47`, { has_personal_content: true });
      summary.push(`q2 PATCHED: service_incidents (47).has_personal_content -> true`);
    }
  }

  // ---- Step 3: q4 change submit_lock (a4 empty -> Recommended yes) ----
  {
    const cur = (await pg("GET", `/data_objects?id=eq.50&select=id,has_submit_lock`))[0];
    if (cur?.has_submit_lock === true) {
      summary.push(`q4 OK (already true): service_changes.has_submit_lock`);
    } else {
      await pg("PATCH", `/data_objects?id=eq.50`, { has_submit_lock: true });
      summary.push(`q4 PATCHED: service_changes (50).has_submit_lock -> true`);
    }
  }

  // ---- Step 4: q6 seven new masters (a6 empty -> Recommended yes) ----
  for (const e of NEW_ENTITIES) {
    let doRow = (await pg("GET", `/data_objects?data_object_name=eq.${e.name}&select=id,data_object_name`))[0];
    if (doRow) {
      summary.push(`q6 OK (data_object exists): ${e.name} (id ${doRow.id})`);
    } else {
      const inserted = await pg("POST", `/data_objects`, {
        data_object_name: e.name,
        description: e.description,
        kind: "domain_owned",
        singular_label: e.singular_label,
        plural_label: e.plural_label,
        entity_type: e.entity_type,
        // record_status omitted -> DB default 'new'
      });
      doRow = Array.isArray(inserted) ? inserted[0] : inserted;
      summary.push(`q6 INSERTED data_object: ${e.name} (id ${doRow.id}, entity_type=${e.entity_type})`);
    }
    // master DMDO row
    const existingDmdo = (await pg(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${e.module_id}&data_object_id=eq.${doRow.id}&select=id,role`,
    ))[0];
    if (existingDmdo) {
      summary.push(`q6 OK (DMDO exists): ${e.name} on module ${e.module_id} (role ${existingDmdo.role})`);
    } else {
      await pg("POST", `/domain_module_data_objects`, {
        domain_module_id: e.module_id,
        data_object_id: doRow.id,
        role: "master",
        necessity: "required",
        // record_status omitted -> DB default 'new'
      });
      summary.push(`q6 INSERTED master DMDO: ${e.name} master on module ${e.module_id}`);
    }
  }

  console.log("\n=== ITSM a-file write summary ===");
  for (const s of summary) console.log(" - " + s);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
