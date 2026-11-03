#!/usr/bin/env bun
// Non-catalog follow-ups approved on 2026-11-03 (TRUCKING-TMS q23, q24; TMS q17): moves TMS and
// TRUCKING-TMS to Promoted in the queue, adds compliance table rows to the protocol, records the
// two lessons from this build in the skill, and logs the FLEET-MGMT and TELEMATICS changes.
// New queue candidates are added separately through append_missing_domain.ts.

import { readFileSync, writeFileSync } from "fs";

const must = (s: string, a: string, b: string) => {
  if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 80));
  return s.replace(a, b);
};

// ---- queue: move both entries to Promoted, with the build outcome
const qp = "audits/_missing-domains.md";
let q = readFileSync(qp, "utf8");
const slice = (header: string) => {
  const start = q.indexOf(header);
  if (start < 0) throw new Error("no " + header);
  const rest = q.slice(start + header.length);
  const candidates = [rest.search(/\n### /), rest.search(/\n---\n/)].filter((x) => x >= 0);
  const end = start + header.length + Math.min(...candidates);
  const entry = q.slice(start, end).trimEnd();
  q = q.slice(0, start) + q.slice(end).replace(/^\n+/, "");
  return entry;
};
const finish = (entry: string, evidence: string, test: string, decision: string, code: string, id: number, modules: number) =>
  entry
    .replace(/(\*\*Vendor evidence:\*\* ).*/, `$1${evidence}`)
    .replace(/(\*\*Point-solution-market test:\*\* ).*/, `$1${test}`)
    .replace(/(\*\*Status:\*\* ).*/, "$1promoted")
    .replace(/(\*\*Decision:\*\* ).*/, `$1${decision}`) +
  `\n- **Phase 0 report:** audits/${code}/${code}-phase0-2026-11-02.md` +
  `\n- **Build status:** BUILT and loaded at record_status='new' on 2026-11-03 as domain id ${id} (${modules} full modules). Audit artifacts at audits/${code}/. Catalog copy awaits approval in q-${code}.md.`;
const tmsEntry = finish(slice("### TMS: Transportation Management System"),
  "Shipwell, Alpega, FreightWise (Kuebix), Freightview, Oracle OTM, Manhattan Active TM, Infios (MercuryGate), SAP TM, Blue Yonder, e2open (WiseTech), Descartes 3G, Trimble TMS for Shippers, Transporeon (Trimble)",
  "PASSES. Shipwell, Alpega, FreightWise, and Freightview have a shipper TMS as their flagship; Gartner has run a Magic Quadrant for at least 19 editions.",
  "promote-as-domain (2026-11-03), sibling of TRUCKING-TMS.", "TMS", 194, 5);
const truckingEntry = finish(slice("### TRUCKING-TMS: Trucking Transportation Management (Carrier TMS)"),
  "McLeod LoadMaster, Truckbase, PCS TMS, Alvys, Rose Rocket, Trimble (TMW.Suite, Innovative, TruckMate), Soloplan CarLo, LIS WinSped",
  "PASSES. McLeod, Truckbase, and PCS have a carrier TMS as their flagship, self-declared; no analyst ranking surfaced.",
  "promote-as-domain (2026-11-03), sibling of TMS. FTL is a capability, not a domain.", "TRUCKING-TMS", 195, 7);
const marker = "### TRAVEL-MGMT: Corporate Travel Management";
if (!q.includes(marker)) throw new Error("no promoted marker");
q = q.replace(marker, `${tmsEntry}\n\n${truckingEntry}\n\n${marker}`);
writeFileSync(qp, q, "utf8");
console.log("queue: TMS and TRUCKING-TMS moved to Promoted");

// ---- protocol: compliance rows, and the module wording lesson
const pp = ".claude/skills/domain-map-analyst/references/vendor-research-protocol.md";
let p = readFileSync(pp, "utf8");
p = must(p, "| Payments (PCI) | `card_data_access_logs`, `pci_scope_attestations` |\n", `| Payments (PCI) | \`card_data_access_logs\`, \`pci_scope_attestations\` |
| US for-hire motor carriers | \`bills_of_lading\`, \`cargo_claims\`, \`owner_operator_leases\`, \`settlement_escrow_accounts\`, \`motor_carrier_authorities\`, \`carrier_insurance_filings\` |
| US freight brokers | \`brokered_transaction_records\` |
| US commercial fleets, any operator | \`eld_logs\`, \`vehicle_inspections\`, \`driver_qualification_records\`, \`clearinghouse_queries\`, \`ifta_quarterly_returns\`, \`ucr_registrations\` |
| EU road haulage | \`consignment_notes\`, \`cabotage_operation_records\`, \`driver_posting_declarations\`, \`tachograph_records\` |
| US shipper transportation (motor) | \`bills_of_lading\`, \`freight_claims\` |
| US hazardous materials shipping | \`hazmat_shipping_papers\`, \`hazmat_classifications\` |
| US food shippers (FSMA) | \`sanitary_transport_records\` |
| European cross-border road freight | \`consignment_notes\` |
`);
p = must(p, "### 5. Propose modularization\n", `### 5. Propose modularization

Say "domain module", never "optional module" or "core module": every module deploys on its own, and \`is_install_optional\` applies to records, not modules. A module must master at least one record, so a concept with no records of its own folds into the module that holds them.
`);
writeFileSync(pp, p, "utf8");
console.log("protocol: rows and module wording added");

// ---- skill: process_key on custom processes
const sp = ".claude/skills/domain-map-analyst/SKILL.md";
let s = readFileSync(sp, "utf8");
s = must(s, "The prefix makes custom rows trivially filterable and distinguishes them from PCF imports.\n", "The prefix makes custom rows trivially filterable and distinguishes them from PCF imports. Set a unique snake_case `process_key` on any custom process that gates a lifecycle state: the emitter groups RACI rows by it, so blank keys collapse into one process and fail R4.\n");
writeFileSync(sp, s, "utf8");
console.log("skill: process_key note added");

// ---- changelog
const cp = ".claude/skills/domain-map-analyst/references/skill-changelog.md";
let c = readFileSync(cp, "utf8");
c = c.trimEnd() + `

## 2026-11-03 - Transport compliance rows, module wording, and process_key

Building TMS and TRUCKING-TMS added eight rows to the protocol's compliance table, as its own text asks for a market with no row. Two lessons became rules. First, the Phase 0 reports and first q-file said "install-optional module" and "core", which the user questioned ("why not a domain module?"): those are not catalog concepts, so the protocol now says to write "domain module". Second, custom processes loaded without \`process_key\` collapsed RACI grouping and failed R4, so the custom-process convention now requires a key on gating processes.

**Scope.** references/vendor-research-protocol.md, SKILL.md (custom-process naming convention).

**Status.** Active.
`;
writeFileSync(cp, c, "utf8");
console.log("changelog: entry added");

// ---- neighbor history notes
const note = (path: string, text: string) => {
  writeFileSync(path, readFileSync(path, "utf8").trimEnd() + "\n\n" + text + "\n", "utf8");
  console.log(`${path}: note added`);
};
note("audits/FLEET-MGMT/history.md", `## 2026-11-03 - Changes from the TRUCKING-TMS build (one-line record)

Approved in audits/TRUCKING-TMS (q10, q12, q20, q21): added masters fleet_trailers (FLEET-MGMT-VEHICLE-LIFECYCLE) and ifta_quarterly_returns (FLEET-MGMT-FUEL-COMPLIANCE) at record_status='new'; changed "dispatch" to "vehicle-to-job dispatch" in the domain description and added a sentence separating it from TRUCKING-TMS; lowered Trimble Transportation coverage from primary to secondary. Compliance records still owed here are tracked in audits/TRUCKING-TMS/state.yaml (B1B-FLEET-COMPLIANCE-RECORDS).`);
note("audits/TELEMATICS/history.md", `## 2026-11-03 - Changes from the TRUCKING-TMS build (one-line record)

Approved in audits/TRUCKING-TMS (q20): lowered Trimble Transportation coverage from primary to partial, because its telematics units went to Platform Science in February 2025. Platform Science is not yet in the catalog (B1B-PLATFORM-SCIENCE in audits/TRUCKING-TMS/state.yaml).`);
