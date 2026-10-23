// .tmp_deploy/set_site_catalog_2026_10_23b.ts
// User-requested 2026-10-23: add 30 domains to the public site catalog.
import { pg } from "../scripts/lib/catalog";

const CODES = ["INS-CLAIMS", "ACTIVITY-BOOKING", "AGENCY-MGMT", "LIVESTOCK-MGMT", "MARINA-MGMT", "PS-LIC", "RE-PROP-MGMT", "STR-MGMT", "VET-PRACT-MGMT", "ESG", "SPM", "VIS-MGMT", "LEASE-ACCT", "INV-CRM", "BCM", "GRC", "LMS", "SWP", "HAM", "ITAM", "SMP", "LEGAL-PRACT-MGMT", "CLM", "CDP", "EMP-ADVOCACY", "MRM", "CRM", "RE-BROKERAGE", "INSIDER-RISK", "FLEET-MGMT"];
const rows: any[] = await pg("GET", `/domains?domain_code=in.(${CODES.join(",")})&select=id,domain_code,site_catalog`);
if (rows.length !== CODES.length) throw new Error(`expected ${CODES.length}, found ${rows.length}: missing ${CODES.filter((c) => !rows.some((r) => r.domain_code === c)).join(", ")}`);
const already = rows.filter((r) => r.site_catalog === true).map((r) => r.domain_code);
if (already.length) console.log("already true:", already.join(", "));
await pg("PATCH", `/domains?id=in.(${rows.map((r) => r.id).join(",")})`, { site_catalog: true });
const now: any[] = await pg("GET", "/domains?site_catalog=eq.true&select=domain_code");
console.log(`site_catalog true now: ${now.length}`);
