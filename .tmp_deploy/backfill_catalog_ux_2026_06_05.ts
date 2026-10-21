// Backfill catalog UX (catalog_tagline + catalog_description) for the 5 domains
// cleared in batch 1 (ACCT-PRACT-MGMT, AGENCY-MGMT, B2C-COMM, BPA, CDP) + their modules.
//
// Policy (revised Rule #20): an EMPTY catalog UX field is written directly. record_status
// on these rows is already `new`, so the content is reviewed in-record via the UI, NOT
// pre-surfaced to chat and NOT parked in history.md. EMPTY-GUARD below: a field is written
// only when its current live value is empty/null; a non-empty value is never overwritten.
//
// Run: bun run "c:/dev/domain-map/.tmp_deploy/backfill_catalog_ux_2026_06_05.ts"

type Row = { table: "domains" | "domain_modules"; id: number; code: string; tagline: string; description: string };

const ROWS: Row[] = [
  // ---- ACCT-PRACT-MGMT (152) ----
  { table: "domains", id: 152, code: "ACCT-PRACT-MGMT",
    tagline: "Run your accounting practice end to end: engagements, tax returns, and client billing in one workflow.",
    description: "Manage the full lifecycle of professional accounting work, from accepting a client engagement through preparing and filing tax returns to billing for the hours your team logs. Standardize recurring tax-season work, keep client documents and signatures in one secure place, and give clients a portal to share files and pay invoices." },
  { table: "domain_modules", id: 207, code: "ACCT-PRACT-MGMT-ENGAGEMENT-WORKFLOW",
    tagline: "Scope, staff, and run client engagements from proposal to close.",
    description: "Open and track every client engagement through its lifecycle, scope the tax returns each engagement covers, and keep the right people notified as work moves forward." },
  { table: "domain_modules", id: 208, code: "ACCT-PRACT-MGMT-TAX-RETURN-PREP",
    tagline: "Prepare, sign, file, and track tax returns to acceptance.",
    description: "Take returns from preparation through review, e-signature, and filing, then track acceptance or rejection from the taxing authority and manage amendments, with documents retained per retention rules." },
  { table: "domain_modules", id: 209, code: "ACCT-PRACT-MGMT-CLIENT-PORTAL-BILLING",
    tagline: "Give clients a portal and bill for the time your team logs.",
    description: "Turn logged time entries into client billing and keep clients informed through a secure portal." },

  // ---- AGENCY-MGMT (153) ---- (domain-grain authored here; modules from history)
  { table: "domains", id: 153, code: "AGENCY-MGMT",
    tagline: "Run your agency from estimate to invoice: client jobs, media buying, and creative operations in one place.",
    description: "Manage your agency's client work end to end. Open jobs and track them through traffic and delivery, capture time against client rate cards, and watch retainers burn down in real time. Plan and buy media by outlet and channel, reconcile spend against publisher invoices, and move creative from brief to approved deliverable, then bill clients on markup or cost-plus terms without re-keying a thing." },
  { table: "domain_modules", id: 210, code: "AGENCY-MGMT-JOB-TRAFFIC",
    tagline: "Run every client job from estimate to invoice, with live retainer burn-down and per-job profitability.",
    description: "Manage your agency's book of business in one place. Open client jobs, track their traffic state and deliverables, and capture time against client rate cards. Build estimates and change orders before work starts, watch retainers draw down in real time, and apply your markup and cost-plus billing rules automatically. See profitability per job and per client the moment time and costs post, then issue invoices without re-keying a thing." },
  { table: "domain_modules", id: 211, code: "AGENCY-MGMT-MEDIA-BUY",
    tagline: "Plan campaigns by outlet and channel, commit budget through insertion orders, and reconcile against publisher invoices.",
    description: "Build media plans broken out by outlet, channel, daypart, audience, and budget, then turn approved plans into insertion orders that commit spend at negotiated rates with commission and make-good terms. When publisher invoices arrive, reconcile them against the orders so posted media costs flow straight to finance. Keep every campaign's planned-versus-actual spend in view from first plan to final reconciliation." },
  { table: "domain_modules", id: 212, code: "AGENCY-MGMT-CREATIVE-OPS",
    tagline: "Take creative from brief to approved deliverable with versioned, annotated proofing and clean asset hand-off.",
    description: "Originate creative briefs, get them approved by the client, and author deliverables with full version history. Route each version through annotated, multi-stakeholder review and approval so feedback lands in one place instead of scattered email threads. When a deliverable is signed off, register the final version to your asset library so the approved work is always the version that ships." },

  // ---- B2C-COMM (71) ---- (domain-grain authored here; modules from agent report)
  { table: "domains", id: 71, code: "B2C-COMM",
    tagline: "Sell direct to consumers: catalog, checkout, and fulfillment in one commerce workflow.",
    description: "Run your direct-to-consumer storefront end to end. Publish products and promotions, capture carts and take payment at checkout, and get paid orders picked, packed, and shipped. Track every order from cart to doorstep, tie each one back to the shopper, and keep catalog, payment, and delivery status in one connected place." },
  { table: "domain_modules", id: 213, code: "B2C-COMM-CATALOG-MERCH",
    tagline: "Build your product catalog and run the storefront that shoppers browse and buy from.",
    description: "Create and publish products, organize them into a storefront customers can browse, and launch the promotions that move them. Set up catalog content, configure how products appear across your sites, and run coupons and discount campaigns from one place. Keep the catalog accurate and the storefront ready to sell." },
  { table: "domain_modules", id: 214, code: "B2C-COMM-ORDER-CAPTURE",
    tagline: "Turn carts into paid orders and keep every checkout moving.",
    description: "Guide shoppers from cart to confirmed order: capture the cart, run checkout, take payment, and create the order with its line items. Track each order through its lifecycle, handle refunds when they are needed, and keep payment status in view. Reads the shared customer record so every order ties back to the right shopper." },
  { table: "domain_modules", id: 215, code: "B2C-COMM-FULFILL-SHIP",
    tagline: "Get paid orders picked, packed, and out the door to your customers.",
    description: "Take confirmed orders through fulfillment and shipping. Create fulfillments from order lines, assign them to a location, and generate shipments with carrier and tracking so customers know their package is on the way. Keep delivery status current from pick to doorstep." },

  // ---- BPA (136) ---- (from history)
  { table: "domains", id: 136, code: "BPA",
    tagline: "Design, document, and publish how your business actually runs.",
    description: "Map your end-to-end processes, capabilities, and value streams in one connected workspace. Author process models, keep a single source of truth for how work flows, and publish approved versions your teams can trust. Simulate changes before you commit to them and hand insights off to the teams that execute, improve, and govern the work." },
  { table: "domain_modules", id: 220, code: "BPA-PROCESS-REPO",
    tagline: "Author, review, and publish your process models from one repository.",
    description: "Build and maintain a governed library of business process models. Draft new versions, route them for review, and publish the approved model so every team works from the same picture. Notify stakeholders automatically when a process is published." },
  { table: "domain_modules", id: 221, code: "BPA-CAPABILITY-MAP",
    tagline: "See what your business can do, and where to invest next.",
    description: "Build capability maps that show what your organization does, independent of how it is structured today. Anchor them to reference frameworks, keep them current as the business evolves, and publish a shared view that planning, architecture, and leadership can align around." },
  { table: "domain_modules", id: 222, code: "BPA-VALUE-STREAM",
    tagline: "Model your value streams and test changes before you make them.",
    description: "Map how value flows to your customers, spot the bottlenecks that slow delivery, and model improvements with simulation before you roll them out. Run what-if scenarios, compare outcomes, and share the results with the teams that act on them." },

  // ---- CDP (72) ---- (from agent report)
  { table: "domains", id: 72, code: "CDP",
    tagline: "Unify every customer signal into one resolved profile, then turn it into action.",
    description: "Bring behavioral, transactional, and identity data together into a single resolved customer profile. Build audiences from any attribute or event, score customers for value and risk, and activate those audiences to your marketing, ads, and sales tools, with consent respected at every step." },
  { table: "domain_modules", id: 216, code: "CDP-INGEST-IDENTITY",
    tagline: "Collect every signal and resolve it to one identity.",
    description: "Stream behavioral, transactional, and identifier data from any source, then stitch anonymous and known identifiers into a single unified profile with deterministic and probabilistic matching." },
  { table: "domain_modules", id: 217, code: "CDP-UNIFIED-PROFILE",
    tagline: "One golden profile, enriched and scored.",
    description: "Maintain a persistent profile spanning attributes, computed traits, consent state, and engagement history, with predictive scores for lifetime value, churn risk, and propensity that downstream teams read from." },
  { table: "domain_modules", id: 218, code: "CDP-SEGMENTATION-ACTIVATION",
    tagline: "Build audiences and push them everywhere they're needed.",
    description: "Compose static and dynamic audiences from profile attributes and behavioral events, then activate them to ad platforms, marketing tools, and CRM, including warehouse-native zero-copy delivery." },
  { table: "domain_modules", id: 219, code: "CDP-JOURNEYS-360",
    tagline: "See the whole customer journey in one view.",
    description: "Reconcile observed multi-channel journey progression into a single queryable customer view across transactional, marketing, and operational systems for a complete 360-degree picture." },
];

async function sem(payload: object): Promise<{ ok: boolean; out: string }> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (/required audience not found|This JWT does not have authorization/i.test(out + err)) {
    throw new Error("JWT-AUDIENCE ERROR (stop): " + (err || out));
  }
  return { ok: proc.exitCode === 0, out };
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

let wrote = 0, skipped = 0;
for (const r of ROWS) {
  // EMPTY-GUARD: read current values, write only the fields that are empty.
  const cur = await sem({ method: "GET", path: `/${r.table}?id=eq.${r.id}&select=catalog_tagline,catalog_description` });
  const row = JSON.parse(cur.out)[0] ?? {};
  const patch: Record<string, string> = {};
  if (isEmpty(row.catalog_tagline)) patch.catalog_tagline = r.tagline;
  if (isEmpty(row.catalog_description)) patch.catalog_description = r.description;
  if (Object.keys(patch).length === 0) {
    console.log(`SKIP  ${r.table} ${r.id} ${r.code} (already populated, not overwriting)`);
    skipped++;
    continue;
  }
  await sem({ method: "PATCH", path: `/${r.table}?id=eq.${r.id}`, body: patch });
  console.log(`WROTE ${r.table} ${r.id} ${r.code} [${Object.keys(patch).join(", ")}]`);
  wrote++;
}
console.log(`\nDONE. rows written=${wrote}, skipped(non-empty)=${skipped}, total=${ROWS.length}`);
