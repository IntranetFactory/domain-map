#!/usr/bin/env bun
// Fix the q-file "What this domain is" length regression:
//  - condense catalog_description to 2 tight paragraphs (DB PATCH for the 3-paragraph ones)
//  - rewrite each q-file's "What this domain is" = tagline + 2-paragraph description (verbatim),
//    dropping the "The build loaded..." process paragraph.
// catalog_description stays record_status='new'. CCAAS DB copy already 2 paragraphs (left as-is).

type D = { code: string; tagline: string; desc: string; patchDb: boolean };

const DOMAINS: D[] = [
  {
    code: "AIOPS",
    tagline: "Cut through alert noise and turn a flood of IT signals into a short list of correlated, root-caused issues your teams can act on before users feel the impact.",
    patchDb: true,
    desc:
`An AIOps platform sits across the high-volume telemetry your IT estate produces every second, metrics, logs, traces, events, and alerts, and uses machine learning to find the few patterns that matter. Instead of paging on every threshold breach, it groups related signals into a single correlated incident, filters out duplicate and flapping alerts, and surfaces the probable root cause so responders start from an answer rather than a blank screen.

Teams use it to detect anomalies against learned baselines, suppress noise during planned changes, and get early warning of predicted outages while there is still time to act. Correlated incidents and high-confidence predictions flow into incident and problem workflows, suppression decisions flow back to monitoring, and the detection models behind it all are continuously retrained and watched for drift so the signal stays accurate as the environment changes.`,
  },
  {
    code: "DCIM",
    tagline: "See, power, cool, and plan every rack in your data centers from one live model, so you never run out of space, power, or cooling by surprise.",
    patchDb: true,
    desc:
`Data center infrastructure management gives facilities and IT infrastructure teams a single, authoritative model of the physical estate: every site, rack, and cabinet, the power chain that feeds them, the cooling that keeps them in range, and the cables and ports that connect them. Instead of spreadsheets and tribal knowledge, you get a live register of what is installed, where it sits, and how much headroom is left.

Operators track power from the incoming circuit through distribution units and UPS down to the outlet, monitor temperature and humidity from cabinet sensors, and map connectivity port by port, with overloads, cooling failures, and threshold breaches routed to the teams that act. On top sits capacity planning: forward-looking projections of power, cooling, space, and bandwidth per site, so planners can schedule growth and justify build-outs while physical changes flow out to the configuration database.`,
  },
  {
    code: "VULN-MGMT",
    tagline: "Find every weakness across your estate, fix the ones an attacker would actually use first, and prove it stayed fixed.",
    patchDb: true,
    desc:
`Run a closed loop that turns a sprawling, noisy list of security weaknesses into a short list of fixes the right team actually completes. Discover what you own, from endpoints and servers to cloud workloads, containers, and web apps, then scan it continuously so new exposures surface within hours. Each scan produces findings tied to a specific asset and vulnerability, deduplicated and tracked through their own lifecycle from open to verified.

Because not every finding deserves the same urgency, risk is layered on top of raw severity, exploit-prediction signals, known-exploited intelligence, asset criticality, and exposure, to produce a ranked queue answering the only question that scales: what do we fix this week. Winners route to the owning team as remediation work with due dates, the business gets a governed path to accept and time-box risks it will not fix yet, and re-scans confirm fixes landed and hand auditors defensible evidence for frameworks like PCI-DSS and NIS2.`,
  },
  {
    code: "CCAAS",
    tagline: "Run your contact center in the cloud: route every call, chat, and message to the right agent, capture and score interactions, and keep teams staffed and on target.",
    patchDb: false, // DB copy already 2 paragraphs
    desc:
`Bring every customer conversation onto one cloud platform. Calls, chats, emails, SMS, and social messages land in unified queues and route to the agent best suited to handle them, with self-service menus and AI assistance deflecting and speeding up the simple requests. Agents see the customer's history across channels as soon as the interaction connects, and wrap up each contact with a clear outcome code that feeds reporting and follow-up.

Behind the scenes you get the tooling to run the operation: live queue dashboards and service-level alerts, agent presence and availability tracking, and full interaction recording for quality and compliance. Supervisors review and score recorded interactions, coach agents on what to improve, and watch real-time metrics so they can shift staffing before service levels slip.`,
  },
];

async function patch(code: string, desc: string) {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ method: "PATCH", path: `/domains?domain_code=eq.${code}`, body: { catalog_description: desc } }));
  await proc.stdin.end();
  const err = await new Response(proc.stderr).text();
  if ((await proc.exited) !== 0) throw new Error(err);
}

for (const d of DOMAINS) {
  if (d.patchDb) { await patch(d.code, d.desc); console.log(`PATCH catalog_description ${d.code} -> 2 paragraphs`); }
  const p = `c:/dev/domain-map/audits/${d.code}/q-${d.code}.md`;
  const cur = await Bun.file(p).text();
  const block = `## What this domain is\n\n${d.tagline}\n\n${d.desc}\n\n---\n`;
  const next = cur.replace(/## What this domain is[\s\S]*?\n---\n/, block);
  if (next === cur) { console.log(`!! ${d.code}: intro block not matched, skipped`); continue; }
  await Bun.write(p, next);
  const wc = (d.tagline + " " + d.desc).split(/\s+/).filter(Boolean).length;
  console.log(`rewrote q-${d.code}.md intro (${wc} words, 2 paragraphs, build-meta removed)`);
}
