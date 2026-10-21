#!/usr/bin/env bun
// audit_bare_words.ts — Step 4 task 1 of plan-domain-fact-sheets.md.
//
// Enumerates every `data_objects` row whose `data_object_name` is a bare noun
// (no underscore) and whose `is_canonical_bare_word` flag is false. For each
// candidate, classifies the collision risk:
//
//   - prefix-clash: another data_object exists whose name ends in `_<bare>` or
//     `_<bare>s` (i.e. an adjacent domain already takes a prefixed cousin).
//   - multi-domain: the bare row participates in `domain_data_objects` rows
//     spanning ≥2 distinct domains (a bare-word that is genuinely shared, or a
//     bare-word that has been embedded by adjacent domains without a master).
//   - clear: neither of the above; likely a true canonical bare-word that just
//     hasn't had its flag set yet.
//
// Output: a markdown table grouped by classification, with proposed-rename
// suggestions for prefix-clash rows. Reviewer confirms per-row and the
// rename utility (`rename_data_object.ts`) is invoked per row from the
// confirmed list.

export {};

import { writeFileSync } from "node:fs";

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

function singularize(plural: string): string {
  if (/ies$/.test(plural)) return plural.replace(/ies$/, "y");
  if (/(s|x|z|ch|sh)es$/.test(plural)) return plural.replace(/es$/, "");
  if (/s$/.test(plural)) return plural.replace(/s$/, "");
  return plural;
}

// ----- fetch everything once -----
const allObjects: Row[] = (await postgrest(
  "GET",
  "/data_objects?select=id,data_object_name,singular_label,plural_label,kind,is_canonical_bare_word,naming_authority_rationale&order=data_object_name&limit=5000",
)) ?? [];

console.log(`scanned ${allObjects.length} data_objects rows`);

// candidates: name has no underscore, kind is domain_owned, flag not yet set
const bareCandidates = allObjects.filter((r) => {
  const n = String(r.data_object_name);
  return !n.includes("_") && r.kind === "domain_owned" && r.is_canonical_bare_word === false;
});

console.log(`bare-word candidates (no underscore, kind=domain_owned, flag=false): ${bareCandidates.length}`);

// build index of every name + singular form for cheap collision lookups
const allNames = new Set(allObjects.map((r) => String(r.data_object_name)));

// fetch all domain_data_objects so we can count domain spread per bare candidate
const candidateIds = bareCandidates.map((r) => r.id as number);
let ddoRows: Row[] = [];
if (candidateIds.length > 0) {
  // chunk to keep URL length reasonable
  const chunkSize = 50;
  for (let i = 0; i < candidateIds.length; i += chunkSize) {
    const chunk = candidateIds.slice(i, i + chunkSize);
    const part = (await postgrest(
      "GET",
      `/domain_data_objects?data_object_id=in.(${chunk.join(",")})&select=data_object_id,domain_id,role`,
    )) ?? [];
    ddoRows = ddoRows.concat(part);
  }
}

// fetch domain codes for nicer reporting
const domainIds = Array.from(new Set(ddoRows.map((r) => r.domain_id as number)));
let domainsRows: Row[] = [];
if (domainIds.length > 0) {
  domainsRows = (await postgrest(
    "GET",
    `/domains?id=in.(${domainIds.join(",")})&select=id,domain_code`,
  )) ?? [];
}
const domainCodeById = new Map<number, string>(
  domainsRows.map((d) => [d.id as number, String(d.domain_code)]),
);

// group ddo rows by data_object_id
const ddoByObj = new Map<number, Row[]>();
for (const r of ddoRows) {
  const k = r.data_object_id as number;
  if (!ddoByObj.has(k)) ddoByObj.set(k, []);
  ddoByObj.get(k)!.push(r);
}

// ----- classify each candidate -----
type Classification = "prefix-clash" | "multi-domain" | "clear";

type Candidate = {
  id: number;
  name: string;
  singular: string;
  kind: string;
  classification: Classification;
  prefixClashes: string[]; // existing names that end in _<bare> or _<singular>
  domainCodes: string[]; // domain codes that own/embed this row (with role tag)
  proposedRename?: string;
};

const candidates: Candidate[] = [];

for (const r of bareCandidates) {
  const name = String(r.data_object_name);
  const singular = singularize(name);

  // prefix-clash detection: any other name ending in _<name> or _<singular>
  const suffixes = new Set([`_${name}`, `_${singular}`]);
  const prefixClashes: string[] = [];
  for (const other of allNames) {
    if (other === name) continue;
    for (const s of suffixes) {
      if (other.endsWith(s)) {
        prefixClashes.push(other);
        break;
      }
    }
  }
  prefixClashes.sort();

  // multi-domain spread (count distinct domains that own/embed/consume/etc.)
  const ddos = ddoByObj.get(r.id as number) ?? [];
  const distinctDomains = new Set<number>(ddos.map((d) => d.domain_id as number));
  const domainCodes = ddos
    .map((d) => `${domainCodeById.get(d.domain_id as number) ?? `?${d.domain_id}`}(${d.role})`)
    .sort();

  let classification: Classification;
  if (prefixClashes.length > 0) classification = "prefix-clash";
  else if (distinctDomains.size >= 2) classification = "multi-domain";
  else classification = "clear";

  // suggest a rename when the prefix clash gives an obvious anchor
  // strategy: if all prefix-clashes share a common left-prefix token (e.g. job_offers, job_offer_letters share "job"),
  // adopt that as the rename prefix
  let proposedRename: string | undefined;
  if (classification === "prefix-clash") {
    const tokens = prefixClashes
      .map((n) => n.split("_")[0])
      .filter((t, i, arr) => arr.indexOf(t) === i);
    if (tokens.length === 1) {
      // single common anchor — propose that prefix
      proposedRename = `${tokens[0]}_${name}`;
    } else {
      // multiple anchors; pick the most frequent
      const counts = new Map<string, number>();
      for (const n of prefixClashes) {
        const t = n.split("_")[0];
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      proposedRename = `${best[0]}_${name}`;
    }
  }

  candidates.push({
    id: r.id as number,
    name,
    singular,
    kind: String(r.kind),
    classification,
    prefixClashes,
    domainCodes,
    proposedRename,
  });
}

// ----- render markdown report -----
const lines: string[] = [];
lines.push("# Bare-word audit (Phase B1, Step 4 task 1)");
lines.push("");
lines.push(`Scanned ${allObjects.length} data_objects rows; ${bareCandidates.length} bare-word candidates need triage.`);
lines.push("");
lines.push("Categories:");
lines.push("- **prefix-clash** — another data_object already takes a `_<bare>` form. These need a rename to remove ambiguity.");
lines.push("- **multi-domain** — the bare row is owned/embedded across ≥2 domains. Consider whether it should be promoted to a master + prefixed in non-owning domains, or claimed as canonical.");
lines.push("- **clear** — no clash, single-domain. Likely a true canonical bare-word; flag it with `is_canonical_bare_word=true` and a rationale, or leave alone if it is in fact bare-but-niche.");
lines.push("");

for (const tier of ["prefix-clash", "multi-domain", "clear"] as Classification[]) {
  const tierRows = candidates.filter((c) => c.classification === tier);
  lines.push(`## ${tier} (${tierRows.length})`);
  lines.push("");
  if (tierRows.length === 0) {
    lines.push("_(none)_");
    lines.push("");
    continue;
  }
  if (tier === "prefix-clash") {
    lines.push("| id | name | proposed rename | clashes with | domains |");
    lines.push("|---|---|---|---|---|");
    for (const c of tierRows) {
      const clashes = c.prefixClashes.slice(0, 4).join(", ") + (c.prefixClashes.length > 4 ? `, …+${c.prefixClashes.length - 4}` : "");
      const dom = c.domainCodes.slice(0, 5).join(", ") + (c.domainCodes.length > 5 ? `, …` : "");
      lines.push(`| ${c.id} | \`${c.name}\` | \`${c.proposedRename ?? "?"}\` | ${clashes} | ${dom} |`);
    }
  } else if (tier === "multi-domain") {
    lines.push("| id | name | domains (role) |");
    lines.push("|---|---|---|");
    for (const c of tierRows) {
      const dom = c.domainCodes.join(", ");
      lines.push(`| ${c.id} | \`${c.name}\` | ${dom} |`);
    }
  } else {
    lines.push("| id | name | domain |");
    lines.push("|---|---|---|");
    for (const c of tierRows) {
      const dom = c.domainCodes.join(", ") || "_(no domain_data_objects rows)_";
      lines.push(`| ${c.id} | \`${c.name}\` | ${dom} |`);
    }
  }
  lines.push("");
}

const out = lines.join("\n");
writeFileSync("c:/dev/domain-map/.tmp_deploy/bare_word_audit_report.md", out, "utf8");

console.log(`\nwrote .tmp_deploy/bare_word_audit_report.md`);
console.log(`tier counts: prefix-clash=${candidates.filter((c) => c.classification === "prefix-clash").length}, multi-domain=${candidates.filter((c) => c.classification === "multi-domain").length}, clear=${candidates.filter((c) => c.classification === "clear").length}`);
