#!/usr/bin/env bun
// Estimate a coarse strict Semantius score per pending missing-domain candidate.
// NOT a real score (none of these are in the catalog, so there is no
// domain_module_tools to read). Two-regime heuristic anchored to the 4
// hand-authored scores already in the file (CSPM ~45, PATCH-MGMT ~50,
// EASM ~30, DAST ~25):
//
//   Regime A (external-core): the domain's PRODUCT is external compute/fetch
//   (a scanner, detector, intel feed, monitor, telemetry/metering platform).
//   The internal store is the minority. Start LOW (~50) and subtract.
//
//   Regime B (record-core): the domain primarily masters internal records
//   (cases, ledgers, registries, workflows). External tools are add-on
//   features. Start HIGH (~96) and subtract per feature.
//
// Platform-tier (live catalog fact): query/mutate, send_email, notify_person,
// receive_webhook. External-tier: compute/AI, external data fetch, sms/voice/
// social/video channels, e-signature, payment, device/IoT, streaming/edge infra.
import { readFileSync, writeFileSync } from "fs";

const raw = readFileSync("audits/_missing-domains.md", "utf8");
const pendStart = raw.search(/^## Pending review\b/m);
const promStart = raw.search(/^## Promoted\b/m);
const block = raw.slice(pendStart, promStart);

type Row = { code: string; name: string; cap: string; hasScore: boolean };
const rows: Row[] = [];
for (const part of block.split(/\n(?=### )/)) {
  const h = part.match(/^### (\S+)\s+[—-]\s+(.*)$/m);
  if (!h) continue;
  const capM = part.match(/\*\*Candidate capabilities:\*\* (.*)/);
  const hasScore = /\*\*Estimated Semantius score:\*\* (?!_\(not estimated\)_)/.test(part);
  rows.push({ code: h[1], name: h[2].trim(), cap: (capM ? capM[1] : "").toLowerCase(), hasScore });
}

// Domain's PRODUCT is the external action (name-level signal).
const CORE_EXTERNAL =
  /(scann|scanner|detection|\bresponse\b|posture|intelligence|monitoring|observ|surveillance|breach.*simulation|attack surface|threat|forensic|aggregation|aggregat|telematics|telemetry|metering|listening|intent data|signal aggreg|fraud|behavior analytics|ueba|\bxdr\b|\bndr\b|\bedr\b|\bmdr\b|\bdrp\b|penetration|exposure management)/;

const EXT = {
  fetch: /\b(ingest|aggregat|third-party|external|feed|crawl|discover|enrich|scraping|market data|\bnews\b|forums|social|intent|threat|telemetry|sensor|meter|imagery|web search|\bpanel\b|\bsample\b|breach|dark-web|leaked|surge|head-end|\bcdr\b|interconnect|account linking|rate-shop|carrier|tracking number|session replay|click-stream|clickstream|page-load|flow telemetry)\b/,
  ai: /\b(\bai\b|\bml\b|machine learning|predict|optimi|scoring|\bscore\b|classif|sentiment|\bnlp\b|\bocr\b|transcri|recommend|anomaly|forecast|detection|\bdetect\b|self-healing|hallucinat|drift|inference|embedding|similarity|\bvector\b|\brag\b|\bllm\b|extraction|image-recognition|computer vision|erlang)\b/,
  channel: /\b(\bsms\b|\bmms\b|\bvoice\b|telephon|\bphone\b|call recording|\bvideo\b|dashcam|social post|post social|broadcast|whatsapp|conversational|two-way)\b/,
  sign: /\b(e-sign|esign|signature|lien waiver)\b/,
  pay: /\b(payment|payout|disburse|interchange|chargeback|settlement|premium|billing|invoic|lockbox|\bach\b|funding|cash application|dividend)\b/,
  device: /\b(bacnet|modbus|\biot\b|iomt|isobus|can-bus|edge gateway|telematics|meter data|charger|\bhvac\b|occupancy sensor|head-end|ot-it|digital twin|controller|dashcam|register reads)\b/,
  infra: /\b(kafka|\bbroker\b|partition|topic and|schema registry|stream processing|exactly-once|edge runtime|edge function|service mesh|\bmtls\b|container image|kubernetes|cluster reconcil|gitops|low-latency|cold-start|managed event|package hosting)\b/,
  gen: /\b(generat|narrative|drafting|brief generation|answer generation|summari|creative)\b/,
};

// Curated overrides where the heuristic is clearly wrong (false-positive
// keyword hits, or an external dependency outside the lexicon). Each is a
// considered call, not a tuning knob.
const OVERRIDE: Record<string, [number, string]> = {
  "INS-POLICY-ADMIN": [84, "policy CRUD + premium; 'broker channel' is not infra"],
  "INS-UNDERWRITING": [72, "underwriting CRUD + risk scoring"],
  "INS-BILLING": [82, "premium billing CRUD"],
  "CARRIER-MGMT": [64, "external multi-carrier rate/label/tracking APIs dominate"],
  "POST-PURCHASE": [70, "carrier-tracking fetch + ETA prediction"],
  "OPEN-BANKING": [50, "external bank-API account aggregation is the product"],
  "BAAS-PLATFORM": [54, "sponsor-bank / external orchestration heavy"],
  "RUM": [55, "frontend telemetry + session-replay ingestion"],
  "PROVENANCE-PLATFORM": [48, "blockchain anchoring infra"],
  "SDWAN-ORCH": [46, "device-fleet + tunnel telemetry"],
  "LOG-MGMT": [66, "log ingestion at scale (external fetch)"],
  "TASK-MIN": [70, "task-mining capture + analysis (twin of TASK-MINING)"],
  "KUBE-COST": [66, "cost accounting on k8s, not running infra"],
  "INTENT-DATA": [32, "third-party intent aggregation + scoring is the product"],
  "DATA-CONTRACTS": [88, "schema/contract CRUD; 'detection' is not ML"],
  "PS-GRANTS-MGMT": [92, "grant CRUD; 'reviewer scoring' is human, not ML"],
  "CCM": [90, "close CRUD; 'intercompany matching' is data matching, not ML"],
  "APM-MONITORING": [55, "application transaction telemetry + auto-discovery"],
  "TELCO-NMS": [50, "network fault/alarm telemetry + correlation"],
  "KYC-AML-PLATFORM": [62, "external sanctions/PEP list fetch + screening"],
  "KYC-KYB": [62, "external sanctions/PEP/business-registry fetch + screening"],
  "MARKETPLACE-OPS": [66, "external marketplace API sync/listing per channel"],
  "MEETING-SCHEDULER": [80, "calendar federation (external) + light routing"],
  "CIEM": [55, "reads cloud IAM (external) + blast-radius analysis"],
};

function score(r: Row): { pct: number; scoreText: string; drivers: string[] } {
  if (OVERRIDE[r.code] !== undefined) {
    const [pct, why] = OVERRIDE[r.code];
    return { pct, drivers: ["curated"], scoreText: `~${pct}% strict (auto-est.): ${why}.` };
  }
  const t = r.code.toLowerCase() + " " + r.name.toLowerCase() + " " + r.cap;
  const buckets: [keyof typeof EXT, string][] = [
    ["infra", "external infra/runtime"],
    ["device", "device/IoT telemetry"],
    ["fetch", "external data fetch"],
    ["ai", "ML/AI compute"],
    ["channel", "non-email channel"],
    ["gen", "text generation"],
    ["sign", "e-signature"],
    ["pay", "payment/settlement"],
  ];
  const hits = buckets.filter(([k]) => EXT[k].test(t));
  const drivers = hits.map(([, label]) => label);
  const coreExternal = CORE_EXTERNAL.test(t) && hits.some(([k]) => ["fetch", "ai", "infra", "device"].includes(k));

  let pct: number;
  let scoreText: string;
  if (coreExternal) {
    pct = 50 - 7 * Math.max(0, hits.length - 1);
    if (hits.some(([k]) => k === "infra")) pct -= 8;
    if (hits.some(([k]) => k === "device")) pct -= 6;
    pct = Math.max(12, Math.min(98, pct));
    scoreText = `~${pct}% strict (auto-est.): external action is the product (${drivers.join(", ")}); thin internal store.`;
  } else {
    pct = 96;
    const pen: Record<keyof typeof EXT, number> = {
      infra: 56, device: 46, fetch: 20, ai: 16, channel: 12, gen: 8, sign: 6, pay: 8,
    };
    for (const [k] of hits) pct -= pen[k];
    pct = Math.max(12, Math.min(98, pct));
    scoreText = drivers.length
      ? `~${pct}% strict (auto-est.): mostly internal CRUD; external drag = ${drivers.join(", ")}.`
      : `~${pct}% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.`;
  }
  return { pct, scoreText, drivers };
}

const scored = rows.map((r) => ({ ...r, ...score(r) }));
scored.sort((a, b) => b.pct - a.pct);

for (const s of scored) {
  console.log(`${s.pct}\t${s.hasScore ? "KEEP" : "NEW "}\t${s.code}\t${s.name}\t${s.drivers.join(", ") || "internal CRUD core"}`);
}

writeFileSync(
  ".tmp_deploy/missing_domain_scores.json",
  JSON.stringify(
    scored.map((s) => ({ code: s.code, name: s.name, pct: s.pct, scoreText: s.scoreText, hasScore: s.hasScore })),
    null, 2,
  ),
);
