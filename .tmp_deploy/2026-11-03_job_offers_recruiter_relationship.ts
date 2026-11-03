#!/usr/bin/env bun
// Bug 13 of audits/ATS/hiring-starter-blueprint-review-2026-11-02.md, requested by the user on 2026-11-03: the
// recruiter drafting an offer has no relationship to it. Adds users owns as recruiter job_offers, matching
// relationship 822 on job_applications. record_status and notes are never sent, so the row lands at the default
// `new`. Idempotent. Dry-run by default; pass --apply to write.
import { preflightRelationships } from "../scripts/lib/catalog_invariants.ts";

const APPLY = process.argv.includes("--apply");
const USERS = 748;
const JOB_OFFERS = 11;
const NEW_ROW = {
  data_object_id: USERS,
  related_data_object_id: JOB_OFFERS,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: "owns as recruiter",
  inverse_verb: "has owning recruiter",
  is_required: false,
};

async function pg(body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`postgrestRequest failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const readExisting = () =>
  pg({
    method: "GET",
    path: `/data_object_relationships?data_object_id=eq.${USERS}&related_data_object_id=eq.${JOB_OFFERS}&select=id,relationship_verb,inverse_verb,relationship_type,relationship_kind,is_required,owner_side,record_status,notes,persona_id,data_object_relationship_label&order=id`,
  });

const pre = preflightRelationships([{ ...NEW_ROW, id: 0, owner_side: "source" }] as any[], { usersId: USERS });
for (const w of pre.warnings) console.log(`warn ${typeof w === "string" ? w : JSON.stringify(w)}`);
if (pre.errors.length > 0) {
  for (const e of pre.errors) console.error(`ERROR ${typeof e === "string" ? e : JSON.stringify(e)}`);
  process.exit(1);
}

const before: any[] = await readExisting();
console.log("before:", before.map((r) => `${r.id} ${r.relationship_verb}`).join(" | "));
if (before.some((r) => r.relationship_verb === NEW_ROW.relationship_verb)) {
  console.log("already there; nothing to do");
  process.exit(0);
}
if (!APPLY) {
  console.log("would add:", JSON.stringify(NEW_ROW));
  console.log("No writes (dry-run).");
  process.exit(0);
}
await pg({ method: "POST", path: "/data_object_relationships", body: NEW_ROW });
const after: any[] = await readExisting();
const row = after.find((r) => r.relationship_verb === NEW_ROW.relationship_verb);
if (!row) throw new Error("the new row did not read back");
console.log("written:", JSON.stringify(row));
