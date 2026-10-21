#!/usr/bin/env bun
// WFM b1a execution (2026-06-06).
//
// Resolves two agent-solvable b1a items against the live domain_map module:
//   B1A-CATALOG-COPY  - backfill empty catalog_tagline + catalog_description on the
//                       3 WFM modules (194 WFM-TIME-ATTENDANCE, 195 WFM-SCHEDULING,
//                       196 WFM-ABSENCE). Per-field empty-guard: write ONLY where the
//                       current value is empty; never overwrite a non-empty value.
//   B1A-S8-A          - insert the missing users(748) -> work_shifts(161) edge into
//                       data_object_relationships. Dedup pre-flight by (748,161).
//
// Idempotent. Omits record_status (DB default 'new', Rule #1) and notes (Rule #15).

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

// ============================================================
// B1A-CATALOG-COPY - buyer-voice copy for the 3 WFM modules
// ============================================================
// Voice: workflow + value, what the buyer can do. No vendor/product names
// (Rule #18), no em-dash (CLAUDE.md), American English. Does not enumerate
// handoffs or position in the catalog taxonomy (Rule #20).

const catalogCopy: Record<
  number,
  { catalog_tagline: string; catalog_description: string }
> = {
  194: {
    catalog_tagline:
      "Capture hours worked, approve time cards, and stay compliant with break and meal rules.",
    catalog_description:
      "Record clock-in and clock-out events, breaks, and meal periods, then collect them into time cards your managers review and approve. Built-in break and meal rules flag missed or short breaks before they become a liability, so approved time is clean and ready to pay. Give your team an accurate, audit-ready record of every hour worked.",
  },
  195: {
    catalog_tagline:
      "Build demand-driven schedules, fill every shift, and keep labor on budget.",
    catalog_description:
      "Plan rosters from forecasted demand, assign shifts by skill and availability, and let workers pick up, swap, or self-schedule open shifts. Track scheduled hours against your labor budget so you can adjust before costs run over. Give managers a faster way to cover every shift and give workers more say over when they work.",
  },
  196: {
    catalog_tagline:
      "Manage time-off requests, leave policies, and balances in one place.",
    catalog_description:
      "Let workers request time off and check their balances, route requests for fast approval, and apply your accrual and entitlement rules automatically. Track every type of leave against the policies you define, so balances stay accurate and approvals stay consistent. Give your team a clear, self-service view of the time off they have earned.",
  },
};

async function backfillCatalogCopy(): Promise<{
  written: number;
  guarded: number;
}> {
  const ids = Object.keys(catalogCopy).map(Number);
  const live = await get(
    `/domain_modules?id=in.(${ids.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let written = 0;
  let guarded = 0;
  for (const m of live) {
    const id = Number(m.id);
    const copy = catalogCopy[id];
    if (!copy) continue;
    const patch: Row = {};
    if (String(m.catalog_tagline ?? "") === "") {
      patch.catalog_tagline = copy.catalog_tagline;
    } else {
      guarded++;
      console.log(
        `  GUARD: module ${id} (${m.domain_module_code}) catalog_tagline non-empty, skipped`,
      );
    }
    if (String(m.catalog_description ?? "") === "") {
      patch.catalog_description = copy.catalog_description;
    } else {
      guarded++;
      console.log(
        `  GUARD: module ${id} (${m.domain_module_code}) catalog_description non-empty, skipped`,
      );
    }
    if (Object.keys(patch).length > 0) {
      await call({
        method: "PATCH",
        path: `/domain_modules?id=eq.${id}`,
        body: patch,
      });
      written += Object.keys(patch).length;
      console.log(
        `  PATCHED module ${id} (${m.domain_module_code}): ${Object.keys(patch).join(", ")}`,
      );
    }
  }
  return { written, guarded };
}

// ============================================================
// B1A-S8-A - users(748) -> work_shifts(161) relationship edge
// ============================================================
async function insertUserShiftEdge(): Promise<"inserted" | "exists"> {
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.748&related_data_object_id=eq.161&select=id`,
  );
  if (existing.length > 0) {
    console.log(
      `  DEDUP: users->work_shifts edge already exists (id ${existing[0].id}), skipped`,
    );
    return "exists";
  }
  const inserted = await call({
    method: "POST",
    path: "/data_object_relationships",
    body: [
      {
        data_object_id: 748, // users (platform_builtin)
        related_data_object_id: 161, // work_shifts
        owner_side: "source",
        relationship_type: "one_to_many",
        relationship_kind: "reference",
        relationship_verb: "assigned_to_shift",
        inverse_verb: "shift_assignee",
        is_required: true,
        // record_status omitted (DB default 'new', Rule #1); notes omitted (Rule #15)
      },
    ],
  });
  console.log(
    `  INSERTED users->work_shifts edge (id ${inserted[0]?.id})`,
  );
  return "inserted";
}

// ============================================================
// run
// ============================================================
console.log("== B1A-CATALOG-COPY ==");
const copyResult = await backfillCatalogCopy();
console.log(
  `  catalog fields written: ${copyResult.written}, guarded (non-empty): ${copyResult.guarded}`,
);

console.log("== B1A-S8-A ==");
const edgeResult = await insertUserShiftEdge();

// ============================================================
// verification re-query
// ============================================================
console.log("== VERIFY ==");
const verifyModules = await get(
  "/domain_modules?id=in.(194,195,196)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id.asc",
);
for (const m of verifyModules) {
  console.log(
    `  module ${m.id} ${m.domain_module_code}: tagline_len=${String(m.catalog_tagline ?? "").length}, desc_len=${String(m.catalog_description ?? "").length}`,
  );
}
const verifyEdge = await get(
  "/data_object_relationships?data_object_id=eq.748&related_data_object_id=eq.161&select=id,relationship_verb,inverse_verb,relationship_type,relationship_kind,is_required,owner_side,record_status",
);
console.log(`  users->work_shifts edge rows: ${verifyEdge.length}`);
console.log(JSON.stringify(verifyEdge, null, 2));

console.log(`\nedge result: ${edgeResult}`);
console.log("DONE");
