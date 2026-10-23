// .tmp_deploy/clear_catalog_prompt_2026_10_23.ts
// User-requested 2026-10-23: clear every domains.catalog_prompt.
// Prior state: .tmp_deploy/snapshots/domains_catalog_prompt_2026_10_23.json
import { pg } from "../scripts/lib/catalog";
const before: any[] = await pg("GET", "/domains?catalog_prompt=neq.&select=id");
console.log("non-empty before:", before.length);
if (before.length) await pg("PATCH", `/domains?id=in.(${before.map((r) => r.id).join(",")})`, { catalog_prompt: "" });
const after: any[] = await pg("GET", "/domains?catalog_prompt=neq.&select=id");
console.log("non-empty after:", after.length);
