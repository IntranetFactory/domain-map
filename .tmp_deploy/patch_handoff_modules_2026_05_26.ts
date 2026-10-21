// Quick PATCHes from HCM/ONBOARDING ↔ HRSD reconciliation

async function pg(method: string, path: string, body?: unknown) {
  const args: Record<string, unknown> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// Step 1: ONBOARDING→HRSD task.escalation_required — source module = 35 (ONB-JOURNEY-MGMT)
await pg("PATCH", "/handoffs?id=eq.9", {
  source_domain_module_id: 35,
  notes:
    "B10b resolved 2026-05-26 (source): onboarding_tasks (18) mastered by ONB-JOURNEY-MGMT (35). HRSD-CASE-MGMT consumes onboarding_tasks as the inbound payload.",
});

// Step 2: HRSD→HCM rows — annotate as domain-level FYI, leave target_module NULL
await pg("PATCH", "/handoffs?id=eq.446", {
  notes:
    "Domain-level FYI 2026-05-26: no HCM module materially acts on HR-case access changes (IGA owns access workflows). target_domain_module_id intentionally NULL.",
});
await pg("PATCH", "/handoffs?id=eq.448", {
  notes:
    "Domain-level FYI 2026-05-26: HRSD-internal taxonomy change broadcast to HCM for awareness; no HCM module materially acts on it. target_domain_module_id intentionally NULL.",
});

// Verify
const check = await pg(
  "GET",
  "/handoffs?id=in.(9,446,448)&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,notes",
);
console.log(JSON.stringify(check, null, 2));
