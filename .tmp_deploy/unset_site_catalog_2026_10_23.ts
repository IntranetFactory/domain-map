// .tmp_deploy/unset_site_catalog_2026_10_23.ts
// User-requested 2026-10-23: remove 17 domains from the public site catalog.
import { pg } from "../scripts/lib/catalog";

const CODES = ["NCDB", "DATA-AI-PLAT", "EHS", "EPM", "FRONTLINE-COMMS", "EMP-EXP", "REMOTE-ACCESS", "WSC", "AIOPS", "LCAP", "LOYALTY", "WEB-CONTOPS", "MA", "SALES-ENG", "GTM-PLAN", "EAP", "VSM"];
const rows: any[] = await pg("GET", `/domains?domain_code=in.(${CODES.join(",")})&select=id,domain_code,site_catalog`);
if (rows.length !== CODES.length) throw new Error(`expected ${CODES.length}, found ${rows.length}: missing ${CODES.filter((c) => !rows.some((r) => r.domain_code === c)).join(", ")}`);
const notSet = rows.filter((r) => r.site_catalog !== true).map((r) => r.domain_code);
if (notSet.length) console.log("already false:", notSet.join(", "));
await pg("PATCH", `/domains?id=in.(${rows.map((r) => r.id).join(",")})`, { site_catalog: false });
const left: any[] = await pg("GET", "/domains?site_catalog=eq.true&select=domain_code");
console.log(`site_catalog true now: ${left.length}`);
