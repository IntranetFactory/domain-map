// B1A-M8-MODULE-UX executor for LOYALTY (domain 78).
// Backfill catalog_tagline / catalog_description on the LOYALTY domain row (78)
// and its 3 modules (272/273/274), per the REVISED Rule #20: empty catalog UX
// fields are WRITTEN directly with buyer-voice copy; the row's record_status
// ('new') carries the review signal. The prior stale `blocked_by: user_decision
// B2-CATALOG-UX` annotation (written under the OLD Rule #20) is moot for EMPTY fields.
//
// Rules honored:
//  - semantius CLI only (no MCP, Rule #0).
//  - record_status OMITTED on every PATCH (Rule #1/task).
//  - No column named `notes` touched.
//  - Buyer voice (workflow + value): no vendor/product names, no em-dashes, American English.
//  - Per-field empty-guard: re-read live row first; write a column ONLY when its
//    current value is empty; NEVER overwrite a non-empty value (Rule #20 overwrite ban).
//  - Idempotent: a re-run after a successful write is a no-op (all guards see non-empty).

const CWD = "c:/dev/domain-map";

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { cwd: CWD, stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`pg ${method} ${path} failed (exit ${proc.exitCode}): ${err || out}`);
  }
  const trimmed = out.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

// Buyer-voice copy. Workflow + value voice; describes what the buyer can DO.
// No vendor/product names; no handoffs / taxonomy position (that is analyst voice).
const DOMAIN_COPY = {
  tagline:
    "Reward repeat customers with points, tiers, and personalized perks that grow customer lifetime value.",
  description:
    "Turn one-time buyers into repeat customers by enrolling them in a loyalty program, building rich member profiles, and moving them up tiers as they engage. Set the rules for how members join, what counts toward their status, and what they unlock at each level.\n\n" +
    "Reward engagement the way you choose: award points for purchases and actions, publish a catalog of rewards members can redeem, and run the redemption workflow end to end. Layer on bonus-point promotions and partner coalitions so members earn and spend across more places.\n\n" +
    "Give members a self-service portal to check their balance, browse rewards, and track their progress, and use program analytics to see what drives retention. Connect the program to your commerce, customer, and marketing systems so loyalty data flows where your team already works.",
};

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  // LOYALTY-PROGRAM-CORE (272): program setup, member management, tier management.
  272: {
    tagline:
      "Enroll members, keep their profiles current, and move them up tiers as they engage.",
    description:
      "Stand up your loyalty program and bring members in. Capture each member's profile, track the activity that counts toward their status, and manage enrollment from sign-up through every change to their account.\n\n" +
      "Design the tier structure that fits your program: set the thresholds members reach, define what each tier unlocks, and let members climb (or slip) automatically as their engagement changes. Your most engaged customers see the recognition and perks that keep them coming back.",
  },
  // LOYALTY-POINTS-REWARDS (273): points ledger, rewards catalog, redemption.
  273: {
    tagline:
      "Track every point earned and spent, and let members redeem rewards from a catalog you control.",
    description:
      "Run the engine that powers your rewards. Record every point a member earns or spends in a clear ledger, apply your accrual rules automatically, and keep balances accurate as activity posts, reverses, or expires.\n\n" +
      "Publish a catalog of rewards members can choose from and manage each one through its full life, from draft to live to retired. When a member redeems, walk the request through fulfillment to delivery so people get what they earned and you keep a complete record of every redemption.",
  },
  // LOYALTY-ENGAGEMENT (274): promotions, partner coalitions, member portal.
  274: {
    tagline:
      "Run bonus campaigns, partner offers, and a self-service member portal that keeps people coming back.",
    description:
      "Keep members active between purchases. Launch bonus-point promotions and limited-time offers that nudge the behavior you want, and extend reach through partner coalitions so members earn and redeem across a wider network.\n\n" +
      "Give members a portal where they can see their status, explore offers, and engage with the program on their own terms. Steady engagement turns occasional buyers into loyal regulars and gives your team a direct channel to the people who matter most.",
  },
};

type Target = {
  table: "domains" | "domain_modules";
  id: number;
  label: string;
  copy: { tagline: string; description: string };
};

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

async function main() {
  const targets: Target[] = [
    { table: "domains", id: 78, label: "LOYALTY (domain)", copy: DOMAIN_COPY },
    { table: "domain_modules", id: 272, label: "LOYALTY-PROGRAM-CORE", copy: MODULE_COPY[272] },
    { table: "domain_modules", id: 273, label: "LOYALTY-POINTS-REWARDS", copy: MODULE_COPY[273] },
    { table: "domain_modules", id: 274, label: "LOYALTY-ENGAGEMENT", copy: MODULE_COPY[274] },
  ];

  for (const t of targets) {
    // Re-read live row to confirm emptiness immediately before the write.
    const rows: any[] = await pg(
      "GET",
      `/${t.table}?id=eq.${t.id}&select=id,catalog_tagline,catalog_description,record_status`,
    );
    const row = rows?.[0];
    if (!row) throw new Error(`${t.table} id=${t.id} not found; aborting.`);

    const patch: Record<string, string> = {};
    const skipped: string[] = [];

    if (isEmpty(row.catalog_tagline)) {
      patch.catalog_tagline = t.copy.tagline;
    } else {
      skipped.push(`catalog_tagline (non-empty, preserved)`);
    }
    if (isEmpty(row.catalog_description)) {
      patch.catalog_description = t.copy.description;
    } else {
      skipped.push(`catalog_description (non-empty, preserved)`);
    }

    if (Object.keys(patch).length === 0) {
      console.log(`-- ${t.label} (${t.table} ${t.id}): nothing to write. ${skipped.join("; ")}`);
      continue;
    }

    // Sanity: refuse to emit an em-dash anywhere.
    for (const [col, val] of Object.entries(patch)) {
      if (val.includes("—")) throw new Error(`em-dash in ${t.label}.${col}; aborting.`);
    }

    const fields = Object.keys(patch).join(", ");
    console.log(`== ${t.label} (${t.table} ${t.id}): writing ${fields}${skipped.length ? `; preserving ${skipped.join("; ")}` : ""}`);
    // record_status intentionally OMITTED (DB keeps existing 'new').
    const updated: any[] = await pg(
      "PATCH",
      `/${t.table}?id=eq.${t.id}&select=id,catalog_tagline,catalog_description,record_status`,
      patch,
    );
    const u = updated?.[0];
    console.log(
      `   -> tagline_len=${(u?.catalog_tagline ?? "").length} description_len=${(u?.catalog_description ?? "").length} record_status=${u?.record_status}`,
    );
  }

  console.log("\n== Done. ==");
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(1);
});
