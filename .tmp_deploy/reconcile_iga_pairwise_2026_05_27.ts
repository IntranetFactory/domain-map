#!/usr/bin/env bun
// IGA pairwise handoff reconciliation (2026-05-27).
// Walks the handoff boundary between IGA and each counterparty domain and emits
// a consolidated reconciliation diff to c:\tmp\reconcile_iga_all_2026_05_27.md.
//
// Read-only by construction. Produces a diff per direction with four sections:
//   1. Existing handoffs fully wired (informational)
//   2. Existing handoffs with NULL module FK (B10b derivation cases)
//   3. Missing handoffs the catalog implies should exist (lifecycle-state x consumer-DMDO)
//   4. Boundary integrity gaps (B5 unowned dependencies)

import { writeFileSync } from "node:fs";

type Row = Record<string, any>;

async function call(body: Row): Promise<Row[]> {
  const json = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", json], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  return stdout.trim() ? JSON.parse(stdout) : [];
}

const IGA = { id: 35, code: "IGA" };

// Pull list of counterparties from existing handoffs touching IGA
async function getRelatedDomains(): Promise<Array<{ id: number; code: string }>> {
  const outbound = await call({ method: "GET", path: `/handoffs?source_domain_id=eq.${IGA.id}&select=target_domain_id,target_domain:domains!handoffs_target_domain_id_fkey(domain_code)` });
  const inbound = await call({ method: "GET", path: `/handoffs?target_domain_id=eq.${IGA.id}&select=source_domain_id,source_domain:domains!handoffs_source_domain_id_fkey(domain_code)` });
  const seen = new Map<number, string>();
  for (const r of outbound) seen.set(r.target_domain_id, r.target_domain.domain_code);
  for (const r of inbound) seen.set(r.source_domain_id, r.source_domain.domain_code);
  return Array.from(seen.entries()).map(([id, code]) => ({ id, code }));
}

// IGA masters + module set
async function getIgaShape() {
  const modules = await call({ method: "GET", path: `/domain_modules?domain_id=eq.${IGA.id}&select=id,domain_module_code` });
  const modIds = modules.map((m) => m.id);
  // All data_objects the IGA modules declare any role on
  const dmo = await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role,necessity` });
  const masters = await call({ method: "GET", path: `/domain_data_objects?domain_id=eq.${IGA.id}&role=eq.master&select=data_object_id,data_objects(data_object_name)` });
  const masterIds = masters.map((r) => r.data_object_id);
  const states = await call({ method: "GET", path: `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id` });
  return { modules, dmo, masters, states };
}

async function getCounterpartyShape(d: { id: number; code: string }) {
  const modules = await call({ method: "GET", path: `/domain_modules?domain_id=eq.${d.id}&select=id,domain_module_code` });
  const modIds = modules.map((m: any) => m.id);
  const dmo = modIds.length > 0
    ? await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role,necessity` })
    : [];
  const masters = await call({ method: "GET", path: `/domain_data_objects?domain_id=eq.${d.id}&role=eq.master&select=data_object_id,data_objects(data_object_name)` });
  const masterIds = masters.map((r: any) => r.data_object_id);
  const states = masterIds.length > 0
    ? await call({ method: "GET", path: `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id` })
    : [];
  return { modules, dmo, masters, states };
}

async function getHandoffsBetween(srcId: number, tgtId: number) {
  return await call({
    method: "GET",
    path: `/handoffs?source_domain_id=eq.${srcId}&target_domain_id=eq.${tgtId}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_events(event_name,data_object_id),data_objects(data_object_name)&order=id.asc`,
  });
}

function fmtPair(srcCode: string, tgtCode: string, handoffs: Row[]): string {
  const lines: string[] = [];
  lines.push(`### ${srcCode} -> ${tgtCode}`);
  if (handoffs.length === 0) {
    lines.push(`_no handoffs in this direction_`);
    return lines.join("\n");
  }
  const wired = handoffs.filter((h) => h.source_domain_module_id && h.target_domain_module_id);
  const partialSrc = handoffs.filter((h) => !h.source_domain_module_id);
  const partialTgt = handoffs.filter((h) => h.source_domain_module_id && !h.target_domain_module_id);
  lines.push(`- ${handoffs.length} total | ${wired.length} fully wired | ${partialSrc.length} missing source FK | ${partialTgt.length} missing target FK`);
  if (partialSrc.length > 0) {
    lines.push(`- **Missing source FK:** ${partialSrc.map((h) => `id=${h.id} (${h.trigger_events?.event_name ?? "no-event"}, payload=${h.data_objects?.data_object_name ?? "?"})`).join(", ")}`);
  }
  if (partialTgt.length > 0) {
    lines.push(`- **Missing target FK:** ${partialTgt.map((h) => `id=${h.id} (${h.trigger_events?.event_name ?? "no-event"}, payload=${h.data_objects?.data_object_name ?? "?"})`).join(", ")}`);
  }
  return lines.join("\n");
}

async function main() {
  const related = await getRelatedDomains();
  console.log(`IGA related domains: ${related.map((r) => r.code).join(", ")}`);

  const iga = await getIgaShape();
  const igaModIds = new Set(iga.modules.map((m: any) => m.id));
  const igaDmoMap = new Map<number, Set<number>>(); // module_id -> data_object_ids
  for (const r of iga.dmo) {
    if (!igaDmoMap.has(r.domain_module_id)) igaDmoMap.set(r.domain_module_id, new Set());
    igaDmoMap.get(r.domain_module_id)!.add(r.data_object_id);
  }
  // Data objects any IGA module has a role on
  const igaAnyRole = new Set<number>();
  for (const r of iga.dmo) igaAnyRole.add(r.data_object_id);

  const report: string[] = [];
  report.push(`# IGA pairwise handoff reconciliation -- 2026-05-27`);
  report.push(``);
  report.push(`Walks the handoff boundary between IGA (id=${IGA.id}) and each counterparty domain.`);
  report.push(`Generated by \`reconcile_iga_pairwise_2026_05_27.ts\`. Read-only.`);
  report.push(``);
  report.push(`## Summary`);
  report.push(``);
  report.push(`Counterparty domains (${related.length}): ${related.map((r) => r.code).sort().join(", ")}`);
  report.push(``);
  report.push(`IGA modules: ${iga.modules.map((m: any) => m.domain_module_code).join(", ")}`);
  report.push(`IGA masters: ${iga.masters.map((m: any) => m.data_objects.data_object_name).join(", ")}`);
  report.push(``);

  // Section per counterparty
  for (const c of related.sort((a, b) => a.code.localeCompare(b.code))) {
    report.push(`---`);
    report.push(``);
    report.push(`## ${c.code} (id=${c.id})`);
    report.push(``);

    const cp = await getCounterpartyShape(c);
    report.push(`Counterparty modules: ${cp.modules.length === 0 ? "_none (not yet modularized)_" : cp.modules.map((m: any) => m.domain_module_code).join(", ")}`);
    report.push(``);

    // IGA -> C handoffs
    const outboundIga = await getHandoffsBetween(IGA.id, c.id);
    report.push(fmtPair("IGA", c.code, outboundIga));
    report.push(``);

    // C -> IGA handoffs
    const outboundC = await getHandoffsBetween(c.id, IGA.id);
    report.push(fmtPair(c.code, "IGA", outboundC));
    report.push(``);

    // Section 3: Missing inbound payloads -- counterparty publishes events whose payload IGA doesn't model
    const unresolvedInbound = outboundC.filter((h: Row) => !h.target_domain_module_id);
    if (unresolvedInbound.length > 0) {
      report.push(`#### Section 3a -- ${c.code}->IGA payloads IGA does not consume`);
      report.push(``);
      report.push(`These inbound handoffs land on a payload \`data_object\` that no IGA module declares any role on. Fix is on IGA's side: either add a \`consumer\` DMDO row on the relevant IGA module, or accept as domain-level signal with a \`handoffs.notes\` justification.`);
      report.push(``);
      for (const h of unresolvedInbound) {
        const objName = h.data_objects?.data_object_name ?? `id=${h.data_object_id}`;
        const eventName = h.trigger_events?.event_name ?? "no-event";
        const consumed = igaAnyRole.has(h.data_object_id);
        report.push(`- handoff id=${h.id} (\`${eventName}\` -> \`${objName}\`): ${consumed ? "data_object IS consumed by some IGA module (B10b ambiguity / pick module)" : "data_object NOT consumed by any IGA module"}`);
      }
      report.push(``);
    }

    // Section 3b: Missing outbound -- IGA publishes events whose payload counterparty doesn't model
    if (cp.dmo.length > 0) {
      const cpAnyRole = new Set<number>(cp.dmo.map((r: any) => r.data_object_id));
      const unresolvedOutbound = outboundIga.filter((h: Row) => !h.target_domain_module_id);
      if (unresolvedOutbound.length > 0) {
        report.push(`#### Section 3b -- IGA->${c.code} payloads ${c.code} does not consume`);
        report.push(``);
        report.push(`These outbound handoffs land on a payload \`data_object\` that no ${c.code} module declares any role on. Fix is on ${c.code}'s side (its own B-band audit).`);
        report.push(``);
        for (const h of unresolvedOutbound) {
          const objName = h.data_objects?.data_object_name ?? `id=${h.data_object_id}`;
          const eventName = h.trigger_events?.event_name ?? "no-event";
          const consumed = cpAnyRole.has(h.data_object_id);
          report.push(`- handoff id=${h.id} (\`${eventName}\` -> \`${objName}\`): ${consumed ? "IS consumed by some "+c.code+" module (B10b ambiguity)" : "NOT consumed by any "+c.code+" module"}`);
        }
        report.push(``);
      }
    }

    // Section 4: Boundary integrity -- IGA has a dep on counterparty's master with no canonical master row
    const igaDeps = iga.dmo.filter((r: any) => ["embedded_master", "contributor", "consumer"].includes(r.role));
    const cpMasterIds = new Set<number>(cp.masters.map((r: any) => r.data_object_id));
    // intersect IGA deps that should be mastered by C
    const owedByC: Row[] = [];
    for (const dep of igaDeps) {
      if (cpMasterIds.has(dep.data_object_id)) {
        // Check whether C publishes lifecycle-state events to IGA on this data_object
        const hasOutboundCovering = outboundC.some((h: Row) => h.data_object_id === dep.data_object_id);
        if (!hasOutboundCovering) {
          owedByC.push(dep);
        }
      }
    }
    if (owedByC.length > 0) {
      report.push(`#### Section 4 -- ${c.code} masters that IGA depends on, no published events to IGA yet`);
      report.push(``);
      for (const d of owedByC) {
        const objNameRow = await call({ method: "GET", path: `/data_objects?id=eq.${d.data_object_id}&select=data_object_name` });
        const name = objNameRow[0]?.data_object_name ?? `id=${d.data_object_id}`;
        report.push(`- IGA's role \`${d.role}\` + necessity \`${d.necessity}\` on \`${name}\` -- ${c.code} B9 owes outbound on lifecycle changes (if any)`);
      }
      report.push(``);
    }
  }

  // Final summary section
  report.push(`---`);
  report.push(``);
  report.push(`## Action recommendations`);
  report.push(``);
  report.push(`### IGA-side (fix in our scope)`);
  report.push(``);
  report.push(`For each Section 3a payload IGA does not consume: decide module assignment.`);
  report.push(``);
  report.push(`- HCM \`employment_event\` (id 36), \`employment_contract\` (id 35): mover/leaver triggers -- assign IGA-ACCESS-REQUEST (mover-driven request triggering) or IGA-AUTO-PROVISIONING (contract-end auto-revoke).`);
  report.push(`- HRSD \`cases\` (id 192): HRSD escalates access requests to IGA via case -- already inbound to IGA-ACCESS-REQUEST via id=119; should backfill DMDO consumer on cases (or accept as domain-level).`);
  report.push(`- ONBOARDING \`tasks\` (id 18): onboarding tasks trigger IGA provisioning -- assign IGA-ACCESS-REQUEST (orchestrator).`);
  report.push(`- LMS \`compliance_assignments\` (id 173): overdue compliance training triggers access suspension -- assign IGA-AUTO-PROVISIONING.`);
  report.push(`- DCG \`data_access_requests\` (id 307): governed-data access -- assign IGA-ACCESS-REQUEST (specialized request flow).`);
  report.push(`- DLP \`dlp_incidents\` (id 330) / \`dlp_user_activity\` (id 335): incident triggers entitlement adjustment -- assign IGA-SOD-MGMT or IGA-AUTO-PROVISIONING.`);
  report.push(`- DSPM \`iam_access_policy\` (id 340): permission escalation alert -- assign IGA-SOD-MGMT.`);
  report.push(`- ITSM \`service_catalog_item\` (id 52): catalog publish triggers entitlement creation -- assign IGA-ENTITLEMENT-CATALOG.`);
  report.push(`- SMP \`saas_apps\` (id 61): new sanctioned app triggers entitlement -- assign IGA-ENTITLEMENT-CATALOG.`);
  report.push(`- UEM \`enrolled_devices\` (id 556) / \`device_compliance_result\` (id 563): device events -- assign IGA-AUTO-PROVISIONING.`);
  report.push(`- APIM \`api_consumer\` (id 462): consumer revoke triggers access revoke -- assign IGA-AUTO-PROVISIONING.`);
  report.push(`- ECM \`document_folders\` (id 431) / \`documents\` (id 429): folder permission change / classification change -- assign IGA-ACCESS-REQUEST (review trigger) or IGA-ENTITLEMENT-CATALOG.`);
  report.push(`- WSC \`external_guests\` (id 569) / \`channel_members\` (id 568): guest provisioning -- assign IGA-ACCESS-REQUEST.`);
  report.push(`- VIS-MGMT \`visitor_registrations\` (id 668): visitor badge -- assign IGA-AUTO-PROVISIONING.`);
  report.push(`- IWMS \`desk_bookings\` (id 590): desk check-in triggers compliance access policy -- assign IGA-AUTO-PROVISIONING.`);
  report.push(``);
  report.push(`### Counterparty-side (report-only -- their own audits)`);
  report.push(``);
  report.push(`Surface to counterparty domain audits when scheduled. Run each domain's own per-domain audit to close these.`);

  const outPath = "c:/tmp/reconcile_iga_all_2026_05_27.md";
  writeFileSync(outPath, report.join("\n"));
  console.log(`\nReport written to ${outPath}`);
  console.log(`Lines: ${report.length}`);
}

await main();
