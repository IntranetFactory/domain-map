// .tmp_deploy/add_catalog_prompt_2026_10_23.ts
// User-requested 2026-10-23: adds domains.catalog_prompt (text) and seeds it with the "prompt" of every
// entry in catalog/domain-map/domain-list.json. Only empty values are filled; existing ones are kept.
import { readFileSync } from "node:fs";
import { pg } from "../scripts/lib/catalog";

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${tool}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const exists: any[] = await pg("GET", "/fields?table_name=eq.domains&field_name=eq.catalog_prompt&select=field_name");
if (!exists.length) {
  await crud("create_field", {
    data: [{
      table_name: "domains",
      field_name: "catalog_prompt",
      title: "Catalog Prompt",
      format: "text",
      default_value: "",
      width: "default",
      input_type: "default",
      description: "Blueprint-starter prompt for the domain list (\"Build me ...\" / \"I need ...\"), phrased to trigger semantius-architect. scripts/emit_domain_list.ts uses it as the entry prompt; when empty, the emitter generates one and saves it here.",
    }],
  });
  console.log("field created");
} else console.log("field exists");

const entries: { name: string; prompt: string }[] = JSON.parse(
  readFileSync("c:/dev/domain-map/catalog/domain-map/domain-list.json", "utf8"),
);
const rows: any[] = await pg(
  "GET",
  `/domains?domain_code=in.(${entries.map((e) => `"${e.name}"`).join(",")})&select=id,domain_code,catalog_prompt`,
);
const byCode = new Map<string, any>(rows.map((r) => [r.domain_code, r]));
const missing = entries.filter((e) => !byCode.has(e.name)).map((e) => e.name);
if (missing.length) throw new Error(`domains not found: ${missing.join(", ")}`);

let filled = 0;
let kept = 0;
for (const e of entries) {
  const row = byCode.get(e.name)!;
  if (row.catalog_prompt) {
    kept++;
    continue;
  }
  await pg("PATCH", `/domains?id=eq.${row.id}`, { catalog_prompt: e.prompt.replace(/\u2014/g, "-") });
  filled++;
}
const set: any[] = await pg("GET", "/domains?catalog_prompt=neq.&select=id");
console.log(`filled ${filled}, kept ${kept}; catalog_prompt set on ${set.length} domains (expected ${entries.length})`);
