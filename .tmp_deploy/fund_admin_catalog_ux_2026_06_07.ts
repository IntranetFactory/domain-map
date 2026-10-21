#!/usr/bin/env bun
// FUND-ADMIN catalog UX (Rule #20): author buyer-voice tagline + description on the
// domain row (160) and each of the 4 modules (12,13,14,15). Idempotent: only writes a
// field that is currently an empty string. Never overwrites a non-empty value.
//
// No vendor names, no em-dashes, American English.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
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
const get = (path: string) => call({ method: "GET", path });

// ---- copy ----------------------------------------------------------------

const domainUX = {
  id: 160,
  catalog_tagline:
    "Run private-capital funds end to end: onboard LPs, call and distribute capital, keep the partner ledger, and report to investors on one system.",
  catalog_description:
    "Private-capital fund administration is the operational backbone of a GP. It takes a fund from first close through its full life: onboarding limited partners with KYC and AML checks, recording their commitments, issuing capital calls and tracking the cash that comes back, running the distribution waterfall when the fund returns money, and keeping the partner capital accounts that every investor relies on.\n\n" +
    "This domain unifies the work that is otherwise scattered across spreadsheets and disconnected tools. Fund accounting, capital activity, and LP reporting all read from the same commitment record and the same general ledger, so a capital call, the cash that funds it, and the resulting change to an LP's account stay in agreement without manual reconciliation.\n\n" +
    "The payoff is accuracy where it counts most and speed where LPs notice it. Waterfall math and partner capital account statements are produced from the underlying transactions rather than rebuilt by hand each quarter, close cycles shorten, and the audit trail behind every number is always available when investors, auditors, or regulators ask.",
};

const moduleUX: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  12: {
    catalog_tagline:
      "The fund's general ledger: book every contribution, expense, fee, and gain, then close the period with confidence.",
    catalog_description:
      "The fund ledger is the system of record for fund accounting. It captures every accounting entry against the fund vehicle, contributions, fees, expenses, and gain or loss recognitions, under GAAP or IFRS, and rolls them up through structured close periods.\n\n" +
      "Because the partner capital account statements and the audit pack are built directly from these entries, the close cycle becomes a controlled workflow rather than a quarter-end scramble. Teams get a faster, cleaner close and a defensible trail behind every reported figure.",
  },
  13: {
    catalog_tagline:
      "Onboard limited partners and hold the commitment book: subscriptions, KYC and AML, and the partner capital accounts LPs see.",
    catalog_description:
      "LP commitments is where investors enter the fund and where their standing with the fund lives. It runs subscription intake with the KYC, AML, and accreditation checks onboarding requires, then maintains each LP's active commitment: committed, called to date, distributed to date, and current value.\n\n" +
      "It is also the home of the partner capital account statement, the quarterly document every LP reads. Driven from the commitment record and the fund ledger, the module keeps investor-facing balances accurate and gives the LP-relations team a single trustworthy view of who committed what and where they stand today.",
  },
  14: {
    catalog_tagline:
      "Call capital from LPs and track the cash back: issue the call, allocate by commitment, and reconcile every response.",
    catalog_description:
      "Capital calls turns the need for cash into a controlled drawdown. It allocates a call across LPs by their commitment percentages, issues the call, and tracks each LP's response, what was due, what was funded, and when, so the fund always knows its real cash position.\n\n" +
      "Handling the slow payers and the defaults is part of the workflow, not an afterthought. Funded responses flow straight back to the commitment record, advancing each LP's called-to-date balance without a second round of data entry.",
  },
  15: {
    catalog_tagline:
      "Return money to investors the right way: compute the waterfall, split preferred return, catch-up, and carry, then pay LPs.",
    catalog_description:
      "Distributions is where the fund pays its investors and where the math has to be exactly right. It runs the distribution waterfall per the fund agreement, European, American, or hybrid, working through hurdle tests, GP catch-up, carried interest, and the return to each LP.\n\n" +
      "Because the calculation is the highest-stakes number the fund produces, the module treats it as a reviewed, approved step rather than a one-off spreadsheet. Approved distributions update each LP's distributed-to-date balance and post to the general ledger, keeping investor accounts and fund books in lockstep.",
  },
};

// ---- helpers -------------------------------------------------------------

function hasEmDash(s: string): boolean {
  return s.includes("—");
}
function assertClean(label: string, s: string): void {
  if (hasEmDash(s)) throw new Error(`Em-dash found in ${label}; rewrite before load.`);
}

async function patchIfEmpty(
  table: string,
  id: number,
  ux: { catalog_tagline: string; catalog_description: string },
  label: string,
): Promise<void> {
  assertClean(`${label}.tagline`, ux.catalog_tagline);
  assertClean(`${label}.description`, ux.catalog_description);
  const [row] = await get(`/${table}?id=eq.${id}&select=id,catalog_tagline,catalog_description`);
  if (!row) throw new Error(`No ${table} row id ${id}`);
  const body: Row = {};
  if (String(row.catalog_tagline ?? "") === "") body.catalog_tagline = ux.catalog_tagline;
  if (String(row.catalog_description ?? "") === "") body.catalog_description = ux.catalog_description;
  if (Object.keys(body).length === 0) {
    console.log(`  ${label} (${table} ${id}): already populated, skipped`);
    return;
  }
  await call({ method: "PATCH", path: `/${table}?id=eq.${id}`, body });
  console.log(`  ${label} (${table} ${id}): wrote ${Object.keys(body).join(", ")}`);
}

// ---- run -----------------------------------------------------------------

console.log("Catalog UX: domain row");
await patchIfEmpty("domains", domainUX.id, domainUX, "FUND-ADMIN");

console.log("Catalog UX: modules");
const moduleNames: Record<number, string> = {
  12: "FUND-LEDGER",
  13: "LP-COMMITMENTS",
  14: "CAPITAL-CALLS",
  15: "DISTRIBUTIONS",
};
for (const idStr of Object.keys(moduleUX)) {
  const id = Number(idStr);
  await patchIfEmpty("domain_modules", id, moduleUX[id], moduleNames[id]);
}

console.log("\nDone. UI links:");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/domain_modules");
