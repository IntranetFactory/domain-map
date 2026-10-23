// .tmp_deploy/regen_catalog_prompts_2026_10_23.ts
// User-approved 2026-10-23: clear every domains.catalog_prompt so the 14-opener generator can refill them.
// Prior state: .tmp_deploy/snapshots/domains_catalog_prompt_2026_10_23b.json
import { pg } from "../scripts/lib/catalog";
const rows: any[] = await pg("GET", "/domains?catalog_prompt=neq.&select=id");
if (rows.length) await pg("PATCH", `/domains?id=in.(${rows.map((r) => r.id).join(",")})`, { catalog_prompt: "" });
console.log("cleared:", rows.length);
