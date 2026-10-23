// .tmp_deploy/add_site_catalog_2026_10_23.ts
// User-approved 2026-10-23: adds domains.site_catalog (boolean, default false) and sets it true for
// every domain in catalog/domain-map/domain-list-100.json (semantius_agent_first = 100 at that time).
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

const exists: any[] = await pg("GET", "/fields?table_name=eq.domains&field_name=eq.site_catalog&select=field_name");
if (!exists.length) {
  await crud("create_field", {
    data: [{
      table_name: "domains",
      field_name: "site_catalog",
      title: "Site Catalog",
      format: "boolean",
      default_value: "false",
      width: "s",
      input_type: "default",
      description: "TRUE when the domain is listed on the public site catalog (catalog/domain-map/domain-list-site.json). Seeded with every domain whose semantius_agent_first score was 100; maintained by hand afterwards.",
    }],
  });
  console.log("field created");
} else console.log("field exists");

const codes: string[] = JSON.parse(readFileSync("c:/dev/domain-map/catalog/domain-map/domain-list-100.json", "utf8")).map((e: any) => e.name);
const rows: any[] = await pg("GET", `/domains?domain_code=in.(${codes.join(",")})&select=id,domain_code`);
if (rows.length !== codes.length) throw new Error(`expected ${codes.length} domains, found ${rows.length}`);
await pg("PATCH", `/domains?id=in.(${rows.map((r) => r.id).join(",")})`, { site_catalog: true });
const set: any[] = await pg("GET", "/domains?site_catalog=eq.true&select=domain_code");
console.log(`site_catalog true: ${set.length} (expected ${codes.length})`);
