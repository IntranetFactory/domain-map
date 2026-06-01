#!/usr/bin/env bun
// scripts/analytics/rbac_footprint_probe.ts
// One-off: quantify the _core RBAC layer and the FK coupling between role_permissions
// and the catalog permissions we'd delete under option B. Read-only.
export {};
import { pg } from "../lib/catalog";

const perms: Array<{ id: number; domain_module_id: number | null }> = await pg(
  "GET", "/permissions?select=id,domain_module_id&limit=50000");
const catalogPermIds = new Set(perms.filter((p) => p.domain_module_id != null).map((p) => p.id));
console.log(`permissions: ${perms.length} total | catalog (domain_module_id set): ${catalogPermIds.size} | platform (null): ${perms.length - catalogPermIds.size}`);

const roles: Array<{ id: number; origin: string }> = await pg("GET", "/roles?select=id,origin&limit=50000");
const byOrigin = new Map<string, number>();
for (const r of roles) byOrigin.set(r.origin, (byOrigin.get(r.origin) ?? 0) + 1);
console.log(`roles: ${roles.length} total | by origin: ${[...byOrigin].map(([o, n]) => `${o}=${n}`).join(", ")}`);

const rp: Array<{ permission_id: number }> = await pg("GET", "/role_permissions?select=permission_id&limit=50000");
const refCatalog = rp.filter((x) => catalogPermIds.has(x.permission_id)).length;
console.log(`role_permissions: ${rp.length} total | reference a catalog permission (FK to to-be-deleted rows): ${refCatalog}`);

const ph: Array<{ including_permission_id: number; included_permission_id: number }> = await pg(
  "GET", "/permission_hierarchy?select=including_permission_id,included_permission_id&limit=50000");
const phTouchCatalog = ph.filter((e) => catalogPermIds.has(e.including_permission_id) || catalogPermIds.has(e.included_permission_id)).length;
console.log(`permission_hierarchy: ${ph.length} total | touch a catalog permission: ${phTouchCatalog}`);

const rm: Array<{ id: number }> = await pg("GET", "/role_modules?select=id&limit=50000");
console.log(`role_modules: ${rm.length} total`);
