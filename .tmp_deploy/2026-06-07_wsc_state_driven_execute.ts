#!/usr/bin/env bun
// 2026-06-07 WSC state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// Scope (EXECUTE-classified items from audits/WSC/state.yaml):
//   1. B1A-ENTITY-TYPE : classify 8 WSC masters (entity_type unclassified -> enum)
//   2. Catalog UX (#20): author empty catalog_tagline/description on domain 75 + modules 115/116/117
//   3. B1A-B9b         : insert 2 intra-domain handoffs (115->116 huddle, 115->117 guest invite)
//
// notes column is NEVER written (Rule #15). record_status is omitted (Rule #1 -> defaults to 'new').
// Destructive / blocked / deferred / superseded items are NOT touched here (surfaced to user).

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

// ============================================================
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ============================================================
// chat_channels              (564) operational_workflow : active -> archived lifecycle (live states confirmed)
// chat_messages              (565) operational_record   : posted message records, no lifecycle workflow
// chat_threads               (566) operational_record   : lightweight message grouping, no lifecycle
// chat_huddles               (567) operational_workflow : scheduled -> live -> ended lifecycle (live states confirmed)
// channel_members            (568) junction             : links user/guest to channel with role qualifier
// external_guest_invitations (569) operational_workflow : invited -> accepted/declined/revoked lifecycle (live states confirmed)
// chat_message_attachments   (570) operational_record   : immutable artifact reference records
// channel_file_shares        (571) junction             : links a file to a channel with share qualifiers
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 564, name: "chat_channels", entity_type: "operational_workflow" },
  { id: 565, name: "chat_messages", entity_type: "operational_record" },
  { id: 566, name: "chat_threads", entity_type: "operational_record" },
  { id: 567, name: "chat_huddles", entity_type: "operational_workflow" },
  { id: 568, name: "channel_members", entity_type: "junction" },
  { id: 569, name: "external_guest_invitations", entity_type: "operational_workflow" },
  { id: 570, name: "chat_message_attachments", entity_type: "operational_record" },
  { id: 571, name: "channel_file_shares", entity_type: "junction" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (B1A-ENTITY-TYPE) ==");
  const live = await get(
    "/data_objects?id=in.(564,565,566,567,568,569,570,571)&select=id,entity_type",
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
//    Buyer voice (workflow + value), no vendor names, no em-dash, American English.
// ============================================================
const domainCopy = {
  catalog_tagline: "Bring your teams into shared channels where conversation, calls, and files stay in one place.",
  catalog_description:
    "Give everyone a persistent home for work conversations. Organize discussion into channels and threads so context never gets lost in a crowded inbox, and let people drop into a voice or video huddle the moment a chat needs a face-to-face. Share files, react, and follow only the conversations that matter to you. When work spans company lines, invite external partners and guests into the right channels with access you control and can revoke at any time. The result is faster decisions, fewer meetings, and a searchable record of how the work actually happened.",
};
const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  115: {
    catalog_tagline: "Channels, threads, and messages that keep every conversation organized and searchable.",
    catalog_description:
      "Create channels for teams, projects, and topics so the right people see the right discussion. Reply in threads to keep side conversations tidy, post messages with rich formatting and attachments, and search back through everything when you need an answer. Archive channels that have run their course and keep the history that goes with them.",
  },
  116: {
    catalog_tagline: "Jump into a voice or video huddle straight from any conversation.",
    catalog_description:
      "Turn a back-and-forth into a quick call without scheduling a meeting. Start a voice or video huddle from any channel or direct message, pull in the people already in the conversation, and pick up recordings and transcripts afterward so anyone who missed it can catch up. It is the fastest way to settle something that chat alone cannot.",
  },
  117: {
    catalog_tagline: "Work with partners and guests in shared channels without losing control of access.",
    catalog_description:
      "Invite people from outside your organization into the specific channels where they need to collaborate, and nowhere else. Set the scope of what each guest can see, watch invitations move from sent to accepted, and revoke access the moment a project ends or someone moves on. Collaborate across company lines with the confidence that access stays exactly where you put it.",
  },
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // Domain 75
  const [dom] = await get(
    "/domains?id=eq.75&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.75", dBody);
    console.log(`  domain 75: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 75: already populated, skip");
  }
  // Modules 115, 116, 117
  const mods = await get(
    "/domain_modules?id=in.(115,116,117)&select=id,catalog_tagline,catalog_description",
  );
  const mcur = new Map(mods.map(m => [Number(m.id), m]));
  for (const id of [115, 116, 117]) {
    const m = mcur.get(id) ?? {};
    const body: Row = {};
    if (!String((m as Row).catalog_tagline ?? "").trim()) body.catalog_tagline = moduleCopy[id].catalog_tagline;
    if (!String((m as Row).catalog_description ?? "").trim()) body.catalog_description = moduleCopy[id].catalog_description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  module ${id}: wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${id}: already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. Intra-domain handoffs (B1A-B9b) - 2 cross-module rows, source=target=75
//    notes intentionally OMITTED (Rule #15); record_status omitted (Rule #1 default 'new').
//    Idempotent on (source, target, source_module, target_module, trigger_event, data_object).
// ============================================================
// (a) 115 -> 116 : chat_huddle.started (914), payload chat_huddles (567)
// (b) 115 -> 117 : external_guest.invited (916), payload external_guest_invitations (569)
const intraHandoffs: Row[] = [
  {
    source_domain_id: 75,
    target_domain_id: 75,
    source_domain_module_id: 115,
    target_domain_module_id: 116,
    trigger_event_id: 914,
    data_object_id: 567,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
  {
    source_domain_id: 75,
    target_domain_id: 75,
    source_domain_module_id: 115,
    target_domain_module_id: 117,
    trigger_event_id: 916,
    data_object_id: 569,
    integration_pattern: "lifecycle_progression",
    friction_level: "low",
  },
];

const hKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.source_domain_module_id}|${r.target_domain_module_id}|${r.trigger_event_id}|${r.data_object_id}`;

async function insertIntraHandoffs() {
  console.log("\n== 3. Intra-domain handoffs (B1A-B9b) ==");
  const existing = await get(
    "/handoffs?source_domain_id=eq.75&target_domain_id=eq.75&select=source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id",
  );
  const seen = new Set(existing.map(hKey));
  const toInsert = intraHandoffs.filter(r => !seen.has(hKey(r)));
  if (toInsert.length) {
    await post("/handoffs", toInsert);
    for (const r of toInsert)
      console.log(
        `  +handoff ${r.source_domain_module_id}->${r.target_domain_module_id} te=${r.trigger_event_id} do=${r.data_object_id}`,
      );
  } else {
    console.log("  both intra-domain handoffs already present, nothing to insert");
  }
  console.log(`  intra-domain handoffs inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    intra_handoffs: await insertIntraHandoffs(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(564,565,566,567,568,569,570,571)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.75");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?id=in.(115,116,117)");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.75&target_domain_id=eq.75");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
