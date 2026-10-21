#!/usr/bin/env bun
// Phase A backfill: solution_capabilities for 19 Workday solutions.
// Skips Strategic Sourcing, Spend Management, Extend, Evisort because the
// underlying domains (S2P, CLM, LCAP, SUP-LIFE, AP-AUTO) have no capability
// rows loaded yet — those are separate Phase-A loads.
// All record_status defaults to "new". Idempotent.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 40; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) })));
  }
  return out;
}

type Strength = "native" | "partial" | "via_extension" | "not_supported";
type Spec = { solution_id: number; capability_id: number; delivery_strength: Strength; notes: string };

const rows: Spec[] = [
  // Workday HCM (188)
  { solution_id: 188, capability_id: 1, delivery_strength: "native", notes: "Worker record is the schema foundation." },
  { solution_id: 188, capability_id: 2, delivery_strength: "native", notes: "Supervisory and matrix orgs, native position management." },
  { solution_id: 188, capability_id: 3, delivery_strength: "native", notes: "Native worker and manager self-service." },
  { solution_id: 188, capability_id: 5, delivery_strength: "partial", notes: "Basic hire workflow; Workday Journeys is the deeper product." },
  { solution_id: 188, capability_id: 82, delivery_strength: "native", notes: "Termination workflow, last-day handling." },
  { solution_id: 188, capability_id: 6, delivery_strength: "native", notes: "I-9, EEO, country localisations bundled into HCM." },
  { solution_id: 188, capability_id: 4, delivery_strength: "partial", notes: "Position budgeting in HCM; Adaptive Planning is the deeper SWP product." },

  // Workday Payroll (189)
  { solution_id: 189, capability_id: 7, delivery_strength: "native", notes: "Native gross-to-net calculation engine." },
  { solution_id: 189, capability_id: 8, delivery_strength: "native", notes: "Native statutory tax filing for US, UK, CA, FR, AU." },
  { solution_id: 189, capability_id: 11, delivery_strength: "native", notes: "Native garnishment processing." },
  { solution_id: 189, capability_id: 10, delivery_strength: "native", notes: "Pay distribution via ACH / Faster Payments / SEPA / direct." },
  { solution_id: 189, capability_id: 9, delivery_strength: "partial", notes: "Five countries native (US, CA, UK, FR, AU); rest via Workday Global Payroll Connect partners (ADP, NGA HR, CloudPay, Safeguard Global, Strada)." },

  // Workday Recruiting (190)
  { solution_id: 190, capability_id: 12, delivery_strength: "native", notes: "Native requisition management." },
  { solution_id: 190, capability_id: 13, delivery_strength: "native", notes: "Native sourcing channels with Workday Career Sites." },
  { solution_id: 190, capability_id: 14, delivery_strength: "partial", notes: "Historically a weak point vs Greenhouse / Lever; improving with recent UX investments." },
  { solution_id: 190, capability_id: 15, delivery_strength: "native", notes: "Native interview scheduling, scorecards, and panel coordination." },
  { solution_id: 190, capability_id: 16, delivery_strength: "native", notes: "Native offer authoring and approvals." },
  { solution_id: 190, capability_id: 17, delivery_strength: "via_extension", notes: "Delivered via Workday HiredScore." },

  // Workday HiredScore (191)
  { solution_id: 191, capability_id: 17, delivery_strength: "native", notes: "Native AI matching, screening, and recruiter orchestration." },
  { solution_id: 191, capability_id: 13, delivery_strength: "partial", notes: "Re-discovery / silver-medallist surfacing against the existing candidate pool." },
  { solution_id: 191, capability_id: 12, delivery_strength: "not_supported", notes: "Depends on host ATS for requisition management." },

  // Workday Learning (192)
  { solution_id: 192, capability_id: 19, delivery_strength: "native", notes: "Native content delivery and tracking." },
  { solution_id: 192, capability_id: 23, delivery_strength: "native", notes: "Native learning paths." },
  { solution_id: 192, capability_id: 22, delivery_strength: "native", notes: "Native certification management with renewal cycles." },
  { solution_id: 192, capability_id: 21, delivery_strength: "native", notes: "Native compliance-training assignment, escalation, and audit log." },
  { solution_id: 192, capability_id: 18, delivery_strength: "partial", notes: "Basic course authoring; richer authoring typically via Articulate / Adobe Captivate." },
  { solution_id: 192, capability_id: 20, delivery_strength: "native", notes: "Workday Skills Cloud — native skills management and inference." },

  // Workday Talent Optimization (193)
  { solution_id: 193, capability_id: 24, delivery_strength: "native", notes: "Native performance review cycles." },
  { solution_id: 193, capability_id: 25, delivery_strength: "native", notes: "Native goals and OKR management." },
  { solution_id: 193, capability_id: 26, delivery_strength: "native", notes: "Native continuous feedback and 1-on-1s." },
  { solution_id: 193, capability_id: 29, delivery_strength: "native", notes: "Native talent calibration sessions with rating normalisation." },
  { solution_id: 193, capability_id: 27, delivery_strength: "native", notes: "Native succession planning with readiness ratings." },
  { solution_id: 193, capability_id: 28, delivery_strength: "native", notes: "Native career development with growth recommendations from Skills Cloud." },

  // Workday Compensation (194)
  { solution_id: 194, capability_id: 35, delivery_strength: "native", notes: "Native compensation planning cycles." },
  { solution_id: 194, capability_id: 37, delivery_strength: "partial", notes: "Basic bonus plans; sales commissions belong in Sales Performance Management." },
  { solution_id: 194, capability_id: 36, delivery_strength: "native", notes: "Native pay-equity analysis with statistical regression." },
  { solution_id: 194, capability_id: 38, delivery_strength: "via_extension", notes: "Survey integrations via Workday Benchmarking partnerships (Radford, Mercer, Payscale)." },
  { solution_id: 194, capability_id: 39, delivery_strength: "partial", notes: "Native award tracking; vesting administration typically integrated with Carta / Shareworks / Equity Edge." },

  // Workday Benefits (195)
  { solution_id: 195, capability_id: 40, delivery_strength: "native", notes: "Native annual benefits enrolment." },
  { solution_id: 195, capability_id: 41, delivery_strength: "native", notes: "Native life-event handling with eligibility evaluation." },
  { solution_id: 195, capability_id: 44, delivery_strength: "partial", notes: "Native decision-support tooling; richer guidance typically via bswift / Alex / Jellyvision overlays." },
  { solution_id: 195, capability_id: 42, delivery_strength: "native", notes: "Native carrier connectivity via EDI 834 / API." },
  { solution_id: 195, capability_id: 43, delivery_strength: "native", notes: "Native ACA reporting (1094/1095, affordability)." },

  // Workday Time Tracking (196)
  { solution_id: 196, capability_id: 30, delivery_strength: "native", notes: "Native time and attendance with multiple capture channels." },
  { solution_id: 196, capability_id: 31, delivery_strength: "partial", notes: "Basic schedules; UKG Pro WFM and Legion are richer in retail / healthcare frontline scheduling." },
  { solution_id: 196, capability_id: 34, delivery_strength: "native", notes: "Native labour-law compliance (FLSA, WTD, predictive scheduling)." },
  { solution_id: 196, capability_id: 33, delivery_strength: "not_supported", notes: "No native labour demand forecasting; relies on third-party integration." },

  // Workday Absence Management (197)
  { solution_id: 197, capability_id: 32, delivery_strength: "native", notes: "Native absence and leave management." },

  // Workday Peakon Employee Voice (198)
  { solution_id: 198, capability_id: 45, delivery_strength: "native", notes: "Native engagement surveys." },
  { solution_id: 198, capability_id: 46, delivery_strength: "native", notes: "Native pulse surveys with adaptive cadence." },
  { solution_id: 198, capability_id: 48, delivery_strength: "native", notes: "Native lifecycle listening (onboarding, exit, 30/60/90)." },
  { solution_id: 198, capability_id: 49, delivery_strength: "native", notes: "Native action-planning workflow at manager and team grain." },
  { solution_id: 198, capability_id: 47, delivery_strength: "partial", notes: "360-feedback supported; not Peakon's flagship use case (Talent Optimization is the canonical Workday surface for 360)." },

  // Workday VNDLY (199)
  { solution_id: 199, capability_id: 54, delivery_strength: "native", notes: "Native contingent-worker requisition." },
  { solution_id: 199, capability_id: 55, delivery_strength: "native", notes: "Native staffing-supplier management with tier and scorecard." },
  { solution_id: 199, capability_id: 56, delivery_strength: "native", notes: "Native rate-card management." },
  { solution_id: 199, capability_id: 57, delivery_strength: "native", notes: "Native contingent timesheets and invoicing." },
  { solution_id: 199, capability_id: 58, delivery_strength: "native", notes: "Native worker-classification compliance with IR35 / AB5 / EU rules." },

  // Workday Prism Analytics (200)
  { solution_id: 200, capability_id: 50, delivery_strength: "native", notes: "Native HR metrics and dashboards on the Workday data fabric." },
  { solution_id: 200, capability_id: 53, delivery_strength: "native", notes: "Native workforce-composition analytics." },
  { solution_id: 200, capability_id: 52, delivery_strength: "native", notes: "Native DEI analytics with cohort, manager-bias, and disparate-impact lenses." },
  { solution_id: 200, capability_id: 51, delivery_strength: "partial", notes: "Predictive model templates; not best-in-class vs Visier or Eightfold for attrition forecasting." },

  // Workday Financial Management (201)
  { solution_id: 201, capability_id: 59, delivery_strength: "native", notes: "Native multi-entity multi-ledger general ledger." },
  { solution_id: 201, capability_id: 61, delivery_strength: "native", notes: "Native accounts payable." },
  { solution_id: 201, capability_id: 60, delivery_strength: "native", notes: "Native accounts receivable." },
  { solution_id: 201, capability_id: 64, delivery_strength: "native", notes: "Native multi-entity and multi-currency." },
  { solution_id: 201, capability_id: 62, delivery_strength: "native", notes: "Native fixed-asset accounting with depreciation schedules." },
  { solution_id: 201, capability_id: 65, delivery_strength: "native", notes: "Native ASC 606 / IFRS 15 revenue recognition." },
  { solution_id: 201, capability_id: 63, delivery_strength: "native", notes: "Native period close and consolidation." },

  // Workday Adaptive Planning (202)
  { solution_id: 202, capability_id: 66, delivery_strength: "native", notes: "Native budgeting and planning." },
  { solution_id: 202, capability_id: 67, delivery_strength: "native", notes: "Native rolling forecasts." },
  { solution_id: 202, capability_id: 69, delivery_strength: "native", notes: "Native scenario planning across multi-dimensional cubes." },
  { solution_id: 202, capability_id: 68, delivery_strength: "native", notes: "Native driver-based modelling." },
  { solution_id: 202, capability_id: 70, delivery_strength: "native", notes: "Native management reporting." },
  { solution_id: 202, capability_id: 71, delivery_strength: "native", notes: "Native workforce and headcount planning with Workday HCM integration." },

  // Workday Expenses (205)
  { solution_id: 205, capability_id: 72, delivery_strength: "native", notes: "Native receipt capture (OCR) and expense entry." },
  { solution_id: 205, capability_id: 73, delivery_strength: "native", notes: "Native policy enforcement with per-diem, currency, category limits." },
  { solution_id: 205, capability_id: 74, delivery_strength: "native", notes: "Native corporate-card reconciliation." },
  { solution_id: 205, capability_id: 76, delivery_strength: "native", notes: "Native reimbursement via payroll or AP." },
  { solution_id: 205, capability_id: 75, delivery_strength: "via_extension", notes: "Travel booking via partner integrations (TravelPerk, Egencia, BCD Travel); not natively booked." },

  // Workday Projects (206)
  { solution_id: 206, capability_id: 77, delivery_strength: "native", notes: "Native resource planning and allocation." },
  { solution_id: 206, capability_id: 79, delivery_strength: "native", notes: "Native project time and expense capture." },
  { solution_id: 206, capability_id: 80, delivery_strength: "native", notes: "Native project billing with fixed-fee, T&M, milestone." },
  { solution_id: 206, capability_id: 78, delivery_strength: "native", notes: "Native project accounting with percentage-of-completion." },
  { solution_id: 206, capability_id: 81, delivery_strength: "native", notes: "Native utilisation tracking." },

  // Workday Journeys (208) — onboarding-side capabilities
  { solution_id: 208, capability_id: 5, delivery_strength: "native", notes: "Native onboarding journeys with conditional task generation." },

  // Workday Help (108) — HRSD has no capability rows loaded; skip
];

async function main() {
  console.log("=== solution_capabilities ===");
  const existing = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const key = (s: number, c: number) => `${s}:${c}`;
  const existingSet = new Set(existing.map(r => key(Number(r.solution_id), Number(r.capability_id))));
  const newRows: Row[] = [];
  for (const spec of rows) {
    if (existingSet.has(key(spec.solution_id, spec.capability_id))) continue;
    newRows.push(spec);
  }
  if (newRows.length > 0) {
    console.log(`  inserting ${newRows.length} new solution_capabilities rows`);
    await insert("/solution_capabilities", newRows);
  } else {
    console.log("  no new rows");
  }

  // Verify counts per Workday solution
  const wdSolutionIds = [108, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 205, 206, 208];
  const all = await get(`/solution_capabilities?solution_id=in.(${wdSolutionIds.join(",")})&select=solution_id&limit=10000`);
  const countBySolution: Record<number, number> = {};
  for (const r of all) {
    const s = Number(r.solution_id);
    countBySolution[s] = (countBySolution[s] ?? 0) + 1;
  }
  console.log("\n=== Solution capability counts (Workday) ===");
  console.log(JSON.stringify(countBySolution, null, 2));
}

await main();
