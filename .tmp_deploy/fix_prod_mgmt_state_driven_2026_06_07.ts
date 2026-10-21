#!/usr/bin/env bun
// State-driven Validate execute pass for PROD-MGMT (domain 101), 2026-06-07.
// Works ONLY the open state.yaml items classified EXECUTE by the orchestrator:
//   1. B1A-ENTITY-TYPE        : classify entity_type on 8 masters (402-409).
//   2. B1A-EVENT-CATEGORY-RES.: backfill empty event_category on 6 trigger_events.
//   3. B1A-INTRA-DOMAIN-HANDS.: 1 new trigger_event (feature_request.accepted) + 3 intra-domain handoffs.
//   4. Catalog UX (Rule #20)  : author buyer-voice tagline+description on domain 101 + modules 130/131 (all empty).
//   5. B1A-APQC-TAGGING-RES.  : INSERT the 1 untagged handoff with a clean L4 PCF match (1002 -> 1350).
//
// All writes additive/corrective, record_status defaults to 'new' (Rule #1).
// Idempotent: reads live, inserts only missing, never overwrites a non-empty value.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

async function main() {
  // ----------------------------------------------------------
  // 1. entity_type classification (B1A-ENTITY-TYPE)
  // ----------------------------------------------------------
  const entityTypes: Record<number, string> = {
    402: "operational_workflow", // product_lines: concept/active/sunset/retired lifecycle
    403: "operational_workflow", // product_features: in_discovery..released/deprecated
    404: "operational_workflow", // product_releases: planned..shipped/rolled_back/cancelled
    405: "operational_workflow", // product_roadmaps: draft/published/archived
    406: "operational_workflow", // feature_requests: new..accepted/rejected
    407: "operational_workflow", // customer_feedback_items: new/classified/linked/archived
    408: "computed",             // product_metrics: time-series KPI projection, no workflow
    409: "operational_workflow", // beta_programs: planning..active/closed/cancelled
  };
  let etPatched = 0;
  for (const [id, et] of Object.entries(entityTypes)) {
    const [cur] = await get(`/data_objects?id=eq.${id}&select=id,entity_type`);
    if (!cur) {
      console.log(`  entity_type: data_object ${id} not found, skipping`);
      continue;
    }
    const v = String(cur.entity_type ?? "");
    if (v === "" || v === "unclassified") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: et });
      etPatched++;
      console.log(`  entity_type: data_object ${id} -> ${et}`);
    } else {
      console.log(`  entity_type: data_object ${id} already '${v}', leaving`);
    }
  }
  console.log(`entity_type: ${etPatched} patched\n`);

  // ----------------------------------------------------------
  // 2. event_category residual backfill (B1A-EVENT-CATEGORY-RESIDUAL)
  // ----------------------------------------------------------
  const eventCats: Record<number, string> = {
    1139: "signal",    // beta_program.feedback_collected: observational, no state transition
    1140: "lifecycle", // beta_program.closed: terminal
    1141: "lifecycle", // customer_feedback_item.received: item created
    1143: "lifecycle", // feature_request.submitted: request created
    1150: "lifecycle", // product_line.retired: terminal
    1152: "signal",    // product_metric.refreshed: data observation
  };
  let ecPatched = 0;
  for (const [id, cat] of Object.entries(eventCats)) {
    const [cur] = await get(`/trigger_events?id=eq.${id}&select=id,event_category`);
    if (!cur) {
      console.log(`  event_category: trigger_event ${id} not found, skipping`);
      continue;
    }
    if (String(cur.event_category ?? "") === "") {
      await patch(`/trigger_events?id=eq.${id}`, { event_category: cat });
      ecPatched++;
      console.log(`  event_category: trigger_event ${id} -> ${cat}`);
    } else {
      console.log(`  event_category: trigger_event ${id} already '${cur.event_category}', leaving`);
    }
  }
  console.log(`event_category: ${ecPatched} patched\n`);

  // ----------------------------------------------------------
  // 3a. feature_request.accepted trigger_event (B1A-INTRA-DOMAIN-HANDOFFS)
  // ----------------------------------------------------------
  let acceptedEventId: number;
  const [existingAccepted] = await get(
    `/trigger_events?event_name=eq.feature_request.accepted&select=id`,
  );
  if (existingAccepted) {
    acceptedEventId = Number(existingAccepted.id);
    console.log(`  trigger_event feature_request.accepted already exists (id ${acceptedEventId})`);
  } else {
    const [created] = await post(`/trigger_events`, [
      {
        event_name: "feature_request.accepted",
        data_object_id: 406,
        event_category: "state_change",
        to_state: "accepted",
        from_state: "prioritized",
        domain_module_id: 130,
        description:
          "A feature_request has been accepted into the roadmap. PROD-MGMT drafts a product_feature in PM-ROADMAP-DELIVERY and the request moves out of triage.",
      },
    ]);
    acceptedEventId = Number(created.id);
    console.log(`  trigger_event feature_request.accepted CREATED (id ${acceptedEventId})`);
  }
  console.log();

  // ----------------------------------------------------------
  // 3b. 3 intra-domain handoffs (source=target=101)
  // ----------------------------------------------------------
  const intraHandoffs = [
    {
      source_domain_id: 101,
      target_domain_id: 101,
      source_domain_module_id: 130,
      target_domain_module_id: 131,
      data_object_id: 403, // product_features
      trigger_event_id: acceptedEventId,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "An accepted feature_request flows from PM-DISCOVERY into PM-ROADMAP-DELIVERY, where a draft product_feature is created and slotted onto the roadmap.",
    },
    {
      source_domain_id: 101,
      target_domain_id: 101,
      source_domain_module_id: 130,
      target_domain_module_id: 131,
      data_object_id: 403, // product_features
      trigger_event_id: 1142, // customer_feedback_item.linked_to_feature
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "When a customer_feedback_item is linked to a feature in PM-DISCOVERY, PM-ROADMAP-DELIVERY enriches the linked product_feature with the supporting demand signal.",
    },
    {
      source_domain_id: 101,
      target_domain_id: 101,
      source_domain_module_id: 131,
      target_domain_module_id: 130,
      data_object_id: 406, // feature_requests
      trigger_event_id: 1146, // product_feature.released
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description:
        "When a product_feature is released in PM-ROADMAP-DELIVERY, PM-DISCOVERY closes the originating feature_request, completing the listen-build-close loop.",
    },
  ];

  const existingIntra = await get(
    `/handoffs?source_domain_id=eq.101&target_domain_id=eq.101&select=source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id`,
  );
  const intraKey = (r: Row) =>
    `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`;
  const existingIntraKeys = new Set(existingIntra.map(intraKey));
  const missingIntra = intraHandoffs.filter((r) => !existingIntraKeys.has(intraKey(r)));
  if (missingIntra.length > 0) {
    await post(`/handoffs`, missingIntra);
    console.log(`  intra-domain handoffs: inserted ${missingIntra.length}`);
  } else {
    console.log(`  intra-domain handoffs: all 3 already present`);
  }
  console.log();

  // ----------------------------------------------------------
  // 4. Catalog UX backfill (Rule #20) - write only when empty
  // ----------------------------------------------------------
  const catalogCopy: Record<
    number,
    { table: string; tagline: string; description: string }
  > = {
    101: {
      table: "/domains",
      tagline:
        "Turn customer signals into a prioritized roadmap and ship features your users actually asked for.",
      description:
        "Capture feedback and feature requests, weigh them against business value, and decide what to build next. Plan releases, publish a roadmap your stakeholders can trust, and run beta programs to validate ahead of general availability. Track adoption and product metrics after launch so every release closes the loop back to the customers who shaped it.",
    },
    130: {
      table: "/domain_modules",
      tagline:
        "Collect feedback and feature requests, then triage them into a clear, prioritized backlog.",
      description:
        "Bring every customer signal into one place, from raw feedback to explicit feature requests. Classify and link incoming input, weigh demand against effort, and triage requests through to an accept-or-reject decision. Accepted work flows straight into roadmap planning, so nothing gets lost between listening and building.",
    },
    131: {
      table: "/domain_modules",
      tagline:
        "Plan releases, publish your roadmap, and run beta programs from one delivery workspace.",
      description:
        "Shape accepted features into a release plan and a roadmap your teams and customers can rely on. Manage product lines across their lifecycle, coordinate releases through ship and rollback, and validate with beta cohorts before general availability. Watch adoption and product metrics so you know which bets paid off.",
    },
  };
  let uxPatched = 0;
  for (const [id, copy] of Object.entries(catalogCopy)) {
    const [cur] = await get(
      `${copy.table}?id=eq.${id}&select=id,catalog_tagline,catalog_description`,
    );
    if (!cur) {
      console.log(`  catalog UX: ${copy.table} ${id} not found, skipping`);
      continue;
    }
    const body: Row = {};
    if (String(cur.catalog_tagline ?? "") === "") body.catalog_tagline = copy.tagline;
    if (String(cur.catalog_description ?? "") === "") body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`${copy.table}?id=eq.${id}`, body);
      uxPatched++;
      console.log(`  catalog UX: ${copy.table} ${id} wrote [${Object.keys(body).join(", ")}]`);
    } else {
      console.log(`  catalog UX: ${copy.table} ${id} already populated, leaving`);
    }
  }
  console.log(`catalog UX: ${uxPatched} rows written\n`);

  // ----------------------------------------------------------
  // 5. APQC tag - 1 clean L4 match (B1A-APQC-TAGGING-RESIDUAL)
  //    handoff 1002 (product_feature.released -> CRM) -> PCF 1350
  //    "Maintain customer/product master files" (external_id 10794, L4).
  //    The other 5 untagged (996, 1005, 1007, 791, 1253) had no clean L4 match -> deferred.
  // ----------------------------------------------------------
  const apqc = [{ handoff_id: 1002, process_id: 1350 }];
  let apqcInserted = 0;
  for (const a of apqc) {
    const existing = await get(
      `/handoff_processes?handoff_id=eq.${a.handoff_id}&process_id=eq.${a.process_id}&select=id`,
    );
    if (existing.length > 0) {
      console.log(`  APQC: handoff ${a.handoff_id} -> PCF ${a.process_id} already tagged`);
      continue;
    }
    await post(`/handoff_processes`, [
      {
        handoff_id: a.handoff_id,
        process_id: a.process_id,
        proposal_source: "agent_curated",
        role: "implements",
      },
    ]);
    apqcInserted++;
    console.log(`  APQC: inserted handoff ${a.handoff_id} -> PCF ${a.process_id}`);
  }
  console.log(`APQC: ${apqcInserted} inserted\n`);

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------
  console.log("==== SUMMARY ====");
  console.log(`entity_type patched:     ${etPatched}`);
  console.log(`event_category patched:  ${ecPatched}`);
  console.log(`new trigger_event:       feature_request.accepted (id ${acceptedEventId})`);
  console.log(`intra-domain handoffs:   ${missingIntra.length} inserted`);
  console.log(`catalog UX rows:         ${uxPatched}`);
  console.log(`APQC tags inserted:      ${apqcInserted}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
