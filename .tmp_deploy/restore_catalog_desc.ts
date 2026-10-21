#!/usr/bin/env bun
// Restore the verbatim original catalog_description for the 3 domains I overwrote.
// Text captured directly from the DB query run immediately BEFORE the (unauthorized) trim.

const ORIG: Record<string, string> = {
  AIOPS:
`An AIOps platform sits across the high-volume telemetry your IT estate produces every second, metrics, logs, traces, events, and alerts, and uses machine learning and statistical analysis to find the few patterns that matter. Instead of paging on every threshold breach, it groups related signals into a single correlated incident, filters out duplicate and flapping alerts, and surfaces the probable root cause so responders start from an answer rather than a blank screen.

Operations and engineering teams use it to detect anomalies against learned baselines, suppress noise during planned changes, and receive early warning of predicted outages and capacity problems while there is still time to act. Correlated incidents and high-confidence predictions flow straight into incident and problem workflows, and suppression decisions flow back to the monitoring layer, so the whole operational loop stays in sync.

Behind the scenes, detection and prediction models are continuously retrained and watched for drift, keeping the signal accurate as the environment changes. The result is fewer pages, faster mean time to resolution, and a clearer picture of service health, so on-call teams spend their time fixing problems instead of triaging alerts.`,
  DCIM:
`Data center infrastructure management gives facilities and IT infrastructure teams a single, authoritative model of the physical estate: every site, rack, and cabinet, the power chain that feeds them, the cooling that keeps them within range, and the cables and ports that connect them. Instead of spreadsheets and tribal knowledge, you get a live register of what is installed, where it sits, and how much headroom is left.

Operators track power from the incoming circuit through distribution units and uninterruptible supplies down to the outlet, monitor temperature and humidity from cabinet-level sensors, and map physical connectivity port by port and cable by cable. When a circuit overloads, a cooling unit fails, or an environmental threshold is breached, the event is captured and routed to the teams and systems that need to act.

On top of the asset and telemetry layer sits capacity planning: forward-looking projections of power, cooling, space, and bandwidth per site and zone. Planners use that headroom view to schedule growth, justify build-outs, and negotiate colocation with confidence, while changes to the physical layer flow out to the configuration database and downstream operations so the rest of IT stays in step.`,
  "VULN-MGMT":
`Run a closed loop that turns a sprawling, noisy list of security weaknesses into a short list of fixes the right team actually completes. Discover what you own first, from endpoints, servers, and network gear to cloud workloads, containers, web apps, and source code, then scan it continuously so new exposures surface within hours instead of at the next quarterly review. Each scan produces findings tied to a specific asset and a specific vulnerability, deduplicated and tracked through their own lifecycle so a weakness opened today is the same record you confirm, remediate, and verify weeks later.

Not every finding deserves the same urgency, so layer risk on top of raw severity. Combine base severity scores with exploit-prediction signals, known-exploited and actively-attacked intelligence, asset criticality, and exposure to produce a ranked queue that answers the only question that matters at scale: what do we fix this week. Route the winners to the team that owns the fix as remediation work with due dates and ownership, and give the business a governed path to formally accept and time-box the risks it chooses not to fix yet.

Close the loop and keep it auditable. Re-scan to confirm fixes actually landed, reopen anything that regresses, and watch mean-time-to-remediate trend down by asset group, business unit, and severity. Hand auditors defensible evidence that scanning cadence, remediation timelines, and exception approvals meet the obligations that frameworks such as PCI-DSS, FedRAMP, and NIS2 expect, so vulnerability work stops being a spreadsheet fire drill and becomes a measured, repeatable control.`,
};

async function call(body: any) {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(err + out);
  return out.trim();
}

for (const [code, desc] of Object.entries(ORIG)) {
  await call({ method: "PATCH", path: `/domains?domain_code=eq.${code}`, body: { catalog_description: desc } });
  console.log(`restored ${code}`);
}
// verify by distinctive tail phrase from each original
const check = await call({ method: "GET", path: "/domains?domain_code=in.(AIOPS,DCIM,VULN-MGMT)&select=domain_code,catalog_description&order=domain_code.asc" });
const rows = JSON.parse(check.slice(check.search(/[\[{]/)));
const markers: Record<string, string> = { AIOPS: "triaging alerts", DCIM: "stays in step", "VULN-MGMT": "repeatable control" };
for (const r of rows) {
  const ok = r.catalog_description.trim().endsWith(markers[r.domain_code]);
  const paras = r.catalog_description.split(/\n\n+/).length;
  console.log(`  ${r.domain_code}: ${paras} paragraphs, ends-with-original-marker=${ok}`);
}
