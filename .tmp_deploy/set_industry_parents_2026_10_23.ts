// .tmp_deploy/set_industry_parents_2026_10_23.ts
// User-approved 2026-10-23: give three top-level industries their parent. Only fills empty parents.
import { pg } from "../scripts/lib/catalog";

const MOVES: [string, string][] = [
  ["Insurance", "Financial Services"],
  ["Veterinary Services", "Professional Services"],
  ["Managed Service Providers", "Professional Services"],
];
const all: any[] = await pg("GET", "/industries?select=id,industry_name,parent_industry_id&limit=1000");
const byName = new Map(all.map((i) => [i.industry_name, i]));
for (const [child, parent] of MOVES) {
  const c = byName.get(child), p = byName.get(parent);
  if (!c || !p) throw new Error(`missing industry: ${!c ? child : parent}`);
  if (c.parent_industry_id != null) { console.log(`skip ${child}: parent already ${c.parent_industry_id}`); continue; }
  await pg("PATCH", `/industries?id=eq.${c.id}&parent_industry_id=is.null`, { parent_industry_id: p.id });
  console.log(`${child} -> ${parent}`);
}
