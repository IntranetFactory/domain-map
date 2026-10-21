#!/usr/bin/env bun
// REV-INTEL Phase A: 5-module hybrid shape + domain_module_capabilities.
// Idempotent: reads existing rows by natural key, inserts only the missing ones.
// Module shape decided by user 2026-06-02 (B2-M1 = 5-module hybrid).

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  return call({ method: "POST", path, body });
}

const DOMAIN_ID = 103;

const MODULES = [
  {
    code: "REV-INTEL-CONVERSATION",
    name: "Conversation Intelligence and Signal Extraction",
    desc: "Transcribes and analyzes recorded sales conversations, extracting topics, action items, competitor mentions, and market signals from the call corpus. The analytics layer over the call-recording substrate: it turns raw conversations into structured insight records, topic and objection tags, and competitive-signal feeds consumed by deal scoring and coaching.",
    caps: ["CONVERSATION-INTEL", "MARKET-SIGNAL-EXTRACTION"],
  },
  {
    code: "REV-INTEL-DEAL-INTEL",
    name: "Deal Scoring and Pipeline Inspection",
    desc: "Computes per-opportunity risk scores and named deal warnings from activity, conversation, and CRM signals, then rolls them up into the manager-grade pipeline inspection surface. Per-deal scoring and the portfolio review of those scores are two grains of one engine: the score primitive plus the pipeline-health diagnostics, deal-coverage views, and stage-progression analytics built on it.",
    caps: ["DEAL-SCORING", "PIPELINE-INSPECTION"],
  },
  {
    code: "REV-INTEL-FORECAST",
    name: "Revenue Forecasting",
    desc: "Produces period revenue forecasts by segment and roll-up, captures the rep-and-manager submission cycle, and scores forecast accuracy against actuals over time. The finance-grade forecasting surface: forecast snapshots, category calls (commit, best-case, pipeline), submission and adjustment history, and the accuracy records that train the forecasting models.",
    caps: ["REVENUE-FORECASTING"],
  },
  {
    code: "REV-INTEL-COACHING",
    name: "Coaching and Call Review",
    desc: "Anchors 1-on-1 coaching to recorded calls: session scheduling, scorecard evaluation against talk-track rubrics, timestamped call-review comments, and playbook-compliance tracking. The enablement-facing review workflow over the conversation corpus, kept distinct from the per-deal scoring engine.",
    caps: ["COACHING-CALL-REVIEW"],
  },
  {
    code: "REV-INTEL-ACTIVITY-CAPTURE",
    name: "Auto Activity Capture",
    desc: "Automatically captures emails, meetings, and calls and attributes them to opportunities and accounts, removing the manual CRM data-entry burden. The activity data foundation: captured-activity records, configurable attribution rules, and per-account and per-rep engagement rollups that feed deal scoring, forecasting, and pipeline inspection.",
    caps: ["ACTIVITY-CAPTURE"],
  },
];

const ALL_CAPS = [...new Set(MODULES.flatMap(m => m.caps))];

async function main() {
  // 1. Modules (natural key: domain_module_code)
  const existingMods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  const existingCodes = new Set(existingMods.map(r => String(r.domain_module_code)));
  const missingMods = MODULES.filter(m => !existingCodes.has(m.code));
  if (missingMods.length) {
    console.log(`Inserting ${missingMods.length} modules (${existingMods.length} existed)`);
    await post("/domain_modules", missingMods.map(m => ({
      domain_module_code: m.code,
      domain_module_name: m.name,
      domain_id: DOMAIN_ID,
      description: m.desc,
      module_kind: "full",
      catalog: false,
    })));
  } else {
    console.log(`Modules: all ${MODULES.length} already present`);
  }

  // re-read for code->id map
  const allMods = await get(`/domain_modules?domain_id=eq.${DOMAIN_ID}&select=id,domain_module_code`);
  const modId = new Map<string, number>();
  for (const r of allMods) modId.set(String(r.domain_module_code), Number(r.id));

  // 2. capability code -> id
  const capRows = await get(`/capabilities?capability_code=in.(${ALL_CAPS.join(",")})&select=id,capability_code`);
  const capId = new Map<string, number>();
  for (const r of capRows) capId.set(String(r.capability_code), Number(r.id));
  const missingCaps = ALL_CAPS.filter(c => !capId.has(c));
  if (missingCaps.length) throw new Error(`Capabilities not found: ${missingCaps.join(", ")}`);

  // 3. domain_module_capabilities (composite key modid:capid)
  const modIds = MODULES.map(m => modId.get(m.code)!);
  const existingLinks = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const haveLink = new Set(existingLinks.map(r => `${r.domain_module_id}:${r.capability_id}`));
  const wantLinks: Row[] = [];
  for (const m of MODULES) {
    const mid = modId.get(m.code)!;
    for (const c of m.caps) {
      const cid = capId.get(c)!;
      if (!haveLink.has(`${mid}:${cid}`)) wantLinks.push({ domain_module_id: mid, capability_id: cid });
    }
  }
  if (wantLinks.length) {
    console.log(`Inserting ${wantLinks.length} domain_module_capabilities links (${existingLinks.length} existed)`);
    await post("/domain_module_capabilities", wantLinks);
  } else {
    console.log(`Capability links: all present`);
  }

  // 4. verify M4 (every capability realized) + M6 (every module realizes >=1)
  const finalLinks = await get(`/domain_module_capabilities?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,capability_id`);
  const realizedCaps = new Set(finalLinks.map(r => Number(r.capability_id)));
  const perMod = new Map<number, number>();
  for (const r of finalLinks) perMod.set(Number(r.domain_module_id), (perMod.get(Number(r.domain_module_id)) ?? 0) + 1);

  console.log("\n=== VERIFY ===");
  console.log(`Modules for REV-INTEL: ${allMods.length} (expect 5)`);
  for (const m of MODULES) console.log(`  ${m.code} -> id ${modId.get(m.code)}, caps ${perMod.get(modId.get(m.code)!) ?? 0}`);
  const orphanCaps = ALL_CAPS.filter(c => !realizedCaps.has(capId.get(c)!));
  const orphanMods = MODULES.filter(m => (perMod.get(modId.get(m.code)!) ?? 0) === 0);
  console.log(`M4 orphan capabilities (expect none): ${orphanCaps.length ? orphanCaps.join(", ") : "NONE"}`);
  console.log(`M6 orphan modules (expect none): ${orphanMods.length ? orphanMods.map(m => m.code).join(", ") : "NONE"}`);
}

main().catch(e => { console.error(e); process.exit(1); });
