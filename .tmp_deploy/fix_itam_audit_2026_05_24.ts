// ITAM audit fix loader (2026-05-24)
// Applies B4 pattern flags, B12 lifecycle permission gates, B10b handoff
// annotations + module backfill + row 368 DELETE, B9b new intra-domain handoffs,
// E1 four ITAM roles + 14 permissions + bundles, and section 6 add-ons
// (module 57 description, 2 domain_regulations rows).
//
// Idempotent: every insert is preceded by a read on the natural key.

type Json = Record<string, unknown>;

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const args: Json = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(args)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} failed (${code}): ${err || out}`);
  }
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

const get = (path: string) => call("GET", path) as Promise<Json[]>;
const post = (path: string, body: unknown) => call("POST", path, body);
const patch = (path: string, body: unknown) => call("PATCH", path, body);
const del = (path: string) => call("DELETE", path);

function log(label: string, n: number) {
  console.log(`  ${label}: ${n}`);
}

const ITAM_ID = 3;
const MOD = { NORM: 57, CONTRACTS: 58, LIFECYCLE: 59, PORTFOLIO: 60 } as const;
const DO = { asset_contracts: 54, asset_lifecycle_events: 55 } as const;
const BF = { ITAM: 84, FINANCE: 4 } as const;

// ---------------------------------------------------------------------------
// Section 1. B4 pattern flags + audit annotations on masters
// ---------------------------------------------------------------------------
async function section1_B4() {
  console.log("\n[1] B4 pattern flags + audit annotation");
  await patch(`/data_objects?id=eq.${DO.asset_contracts}`, {
    has_single_approver: true,
    has_submit_lock: true,
    notes: "Audit 2026-05-24: single contract owner approves activation/renewal/termination; executed contracts are submit-locked for terms (state still mutates).",
  });
  log("asset_contracts flags + notes", 1);
  await patch(`/data_objects?id=eq.${DO.asset_lifecycle_events}`, {
    notes: "Audit 2026-05-24: append-only event log. No pattern flags apply. Lifecycle is captured by event_kind dimension; no per-event state machine. Config-shape exemption from B12.",
  });
  log("asset_lifecycle_events notes", 1);
}

// ---------------------------------------------------------------------------
// Section 2. B12 permission gates on asset_contracts lifecycle states
// ---------------------------------------------------------------------------
async function section2_B12() {
  console.log("\n[2] B12 lifecycle permission gates");
  await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO.asset_contracts}&state_name=eq.active`, {
    requires_permission: true,
    permission_verb_override: "activate_contract",
    domain_module_id: MOD.CONTRACTS,
  });
  log("asset_contracts.active gated", 1);
  await patch(`/data_object_lifecycle_states?data_object_id=eq.${DO.asset_contracts}&state_name=eq.terminated`, {
    requires_permission: true,
    permission_verb_override: "terminate_contract",
    domain_module_id: MOD.CONTRACTS,
  });
  log("asset_contracts.terminated gated", 1);
}

// ---------------------------------------------------------------------------
// Section 3. B10b handoff annotations + DELETE row 368 + inbound module backfill
// ---------------------------------------------------------------------------
async function section3_B10b() {
  console.log("\n[3] B10b handoff fixes");

  const outbound: Array<[number, string]> = [
    [632, "target NULL until ERP-FIN is modularized"],
    [633, "target NULL until HAM is modularized"],
    [634, "target NULL until GRC is modularized"],
    [635, "target NULL until ERP-FIN is modularized"],
  ];
  for (const [id, note] of outbound) {
    await patch(`/handoffs?id=eq.${id}`, { notes: note });
  }
  log("outbound notes set", outbound.length);

  await del(`/handoffs?id=eq.368`);
  log("row 368 deleted (mis-modeled HCM->ITAM employees handoff)", 1);

  const inbound: Array<[number, number, string]> = [
    [462, MOD.LIFECYCLE, "source NULL until IGA is modularized"],
    [645, MOD.LIFECYCLE, "source NULL until RMM is modularized"],
    [799, MOD.NORM, "source NULL until KUBE-PLAT is modularized"],
    [853, MOD.NORM, "source NULL until APM is modularized"],
  ];
  for (const [id, target_mod, note] of inbound) {
    await patch(`/handoffs?id=eq.${id}`, {
      target_domain_module_id: target_mod,
      notes: note,
    });
  }
  log("inbound module FK + source-NULL notes set", inbound.length);
}

// ---------------------------------------------------------------------------
// Section 4. B9b new trigger_event + 4 intra-domain handoffs
// ---------------------------------------------------------------------------
async function section4_B9b() {
  console.log("\n[4] B9b intra-domain handoffs");

  let existing = await get(`/trigger_events?event_name=eq.asset_contract.activated&select=id`);
  let activatedId: number;
  if (existing.length > 0) {
    activatedId = existing[0].id as number;
    console.log(`  trigger_events.asset_contract.activated already exists (id=${activatedId})`);
  } else {
    await post("/trigger_events", {
      event_name: "asset_contract.activated",
      data_object_id: DO.asset_contracts,
      event_category: "state_change",
      from_state: "draft",
      to_state: "active",
      domain_module_id: MOD.CONTRACTS,
      description: "An ITAM asset contract has been signed/executed and transitions from draft to active. ITAM-LIFECYCLE generates initial procurement/deployment lifecycle events for covered assets.",
    });
    const reread = await get(`/trigger_events?event_name=eq.asset_contract.activated&select=id`);
    activatedId = reread[0].id as number;
    console.log(`  trigger_events.asset_contract.activated created (id=${activatedId})`);
  }

  // Existing reusable trigger_events
  const RENEWED = 613;
  const EXPIRED = 614;
  const RECORDED = 615;

  const handoffs: Array<{
    trigger_event_id: number;
    data_object_id: number;
    source_domain_module_id: number;
    target_domain_module_id: number;
    notes: string;
  }> = [
    {
      trigger_event_id: activatedId,
      data_object_id: DO.asset_contracts,
      source_domain_module_id: MOD.CONTRACTS,
      target_domain_module_id: MOD.LIFECYCLE,
      notes: "Contract activation seeds initial procured/deployed lifecycle events for assets covered by the contract.",
    },
    {
      trigger_event_id: RENEWED,
      data_object_id: DO.asset_contracts,
      source_domain_module_id: MOD.CONTRACTS,
      target_domain_module_id: MOD.LIFECYCLE,
      notes: "Renewal generates renewed lifecycle events on covered assets.",
    },
    {
      trigger_event_id: EXPIRED,
      data_object_id: DO.asset_contracts,
      source_domain_module_id: MOD.CONTRACTS,
      target_domain_module_id: MOD.LIFECYCLE,
      notes: "Expiry marks support_expired lifecycle events on covered assets; intra-domain leg complements the GRC outbound on id 634.",
    },
    {
      trigger_event_id: RECORDED,
      data_object_id: DO.asset_lifecycle_events,
      source_domain_module_id: MOD.LIFECYCLE,
      target_domain_module_id: MOD.PORTFOLIO,
      notes: "Recorded lifecycle events feed the portfolio TCO rollup.",
    },
  ];

  // Idempotency: skip rows that already exist as (source_dm, target_dm, trigger_event_id).
  for (const h of handoffs) {
    const existing = await get(`/handoffs?source_domain_id=eq.${ITAM_ID}&target_domain_id=eq.${ITAM_ID}&source_domain_module_id=eq.${h.source_domain_module_id}&target_domain_module_id=eq.${h.target_domain_module_id}&trigger_event_id=eq.${h.trigger_event_id}&select=id`);
    if (existing.length > 0) {
      console.log(`  skip existing intra-domain handoff trigger=${h.trigger_event_id} ${h.source_domain_module_id}->${h.target_domain_module_id}`);
      continue;
    }
    await post("/handoffs", {
      source_domain_id: ITAM_ID,
      target_domain_id: ITAM_ID,
      source_domain_module_id: h.source_domain_module_id,
      target_domain_module_id: h.target_domain_module_id,
      data_object_id: h.data_object_id,
      trigger_event_id: h.trigger_event_id,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      notes: h.notes,
    });
  }
  log("intra-domain handoff inserts attempted", handoffs.length);
}

// ---------------------------------------------------------------------------
// Section 5. E1 permissions + roles + bundles
// ---------------------------------------------------------------------------
type PermSpec = {
  permission_name: string;
  tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override";
  domain_module_id: number;
  module_id: number;
  description: string;
};

const DOMAIN_MAP_MODULE_ID = 1001;

async function section5_E1() {
  console.log("\n[5] E1 permissions + roles + bundles");

  const moduleCodes: Record<number, string> = {
    [MOD.NORM]: "itam-normalization-catalog",
    [MOD.CONTRACTS]: "itam-contracts",
    [MOD.LIFECYCLE]: "itam-lifecycle",
    [MOD.PORTFOLIO]: "itam-portfolio-reporting",
  };

  const permSpecs: PermSpec[] = [];
  for (const [dmId, code] of Object.entries(moduleCodes)) {
    const id = Number(dmId);
    permSpecs.push(
      { permission_name: `${code}:read`, tier: "baseline-read", domain_module_id: id, module_id: DOMAIN_MAP_MODULE_ID, description: `Read access to every entity in the ${code.toUpperCase()} module.` },
      { permission_name: `${code}:manage`, tier: "baseline-manage", domain_module_id: id, module_id: DOMAIN_MAP_MODULE_ID, description: `Edit operational records in the ${code.toUpperCase()} module.` },
      { permission_name: `${code}:admin`, tier: "baseline-admin", domain_module_id: id, module_id: DOMAIN_MAP_MODULE_ID, description: `Full admin (configure + override) on the ${code.toUpperCase()} module.` },
    );
  }
  permSpecs.push(
    { permission_name: "itam-contracts:activate_contract", tier: "workflow-gate", domain_module_id: MOD.CONTRACTS, module_id: DOMAIN_MAP_MODULE_ID, description: "Activate (execute/sign) an asset contract, transitioning from draft to active." },
    { permission_name: "itam-contracts:terminate_contract", tier: "workflow-gate", domain_module_id: MOD.CONTRACTS, module_id: DOMAIN_MAP_MODULE_ID, description: "Terminate an asset contract before natural expiry." },
  );

  // Insert missing permissions
  const existingPerms = await get(`/permissions?permission_name=in.(${permSpecs.map((p) => p.permission_name).join(",")})&select=id,permission_name`);
  const existingNames = new Set(existingPerms.map((p) => p.permission_name as string));
  const toInsert = permSpecs.filter((p) => !existingNames.has(p.permission_name));
  if (toInsert.length > 0) {
    await post("/permissions", toInsert);
    log("permissions created", toInsert.length);
  } else {
    log("permissions all pre-existing", 0);
  }

  const allPerms = await get(`/permissions?permission_name=in.(${permSpecs.map((p) => p.permission_name).join(",")})&select=id,permission_name`);
  const permId = new Map(allPerms.map((p) => [p.permission_name as string, p.id as number]));

  // --- Roles ---
  type RoleSpec = {
    role_code: string;
    role_name: string;
    slug: string;
    business_function_id: number;
    description: string;
    modules: Array<{ dm: number; interaction_level: "primary" | "secondary"; notes?: string }>;
    permissions: string[]; // permission_name strings
  };

  const roles: RoleSpec[] = [
    {
      role_code: "ITAM-MANAGER",
      role_name: "ITAM Manager",
      slug: "itam_manager",
      business_function_id: BF.ITAM,
      description: "Owns the ITAM umbrella across normalization, contracts, lifecycle, and portfolio reporting. Admin tier on every umbrella module.",
      modules: [
        { dm: MOD.NORM, interaction_level: "primary" },
        { dm: MOD.CONTRACTS, interaction_level: "primary" },
        { dm: MOD.LIFECYCLE, interaction_level: "primary" },
        { dm: MOD.PORTFOLIO, interaction_level: "primary" },
      ],
      permissions: [
        "itam-normalization-catalog:admin",
        "itam-contracts:admin",
        "itam-lifecycle:admin",
        "itam-portfolio-reporting:admin",
      ],
    },
    {
      role_code: "ITAM-CONTRACT-ADMIN",
      role_name: "ITAM Contract Administrator",
      slug: "itam_contract_admin",
      business_function_id: BF.ITAM,
      description: "Authors, activates, renews, and terminates asset support/maintenance contracts. Reads lifecycle events and portfolio reporting for context.",
      modules: [
        { dm: MOD.CONTRACTS, interaction_level: "primary" },
        { dm: MOD.LIFECYCLE, interaction_level: "secondary" },
        { dm: MOD.PORTFOLIO, interaction_level: "secondary" },
      ],
      permissions: [
        "itam-contracts:manage",
        "itam-contracts:activate_contract",
        "itam-contracts:terminate_contract",
        "itam-lifecycle:read",
        "itam-portfolio-reporting:read",
      ],
    },
    {
      role_code: "ITAM-LIFECYCLE-TECH",
      role_name: "ITAM Lifecycle Technician",
      slug: "itam_lifecycle_tech",
      business_function_id: BF.ITAM,
      description: "Records lifecycle events (procurement, deployment, transfer, retirement, disposal) and maintains the cross-asset normalization catalog.",
      modules: [
        { dm: MOD.LIFECYCLE, interaction_level: "primary" },
        { dm: MOD.NORM, interaction_level: "secondary" },
      ],
      permissions: [
        "itam-lifecycle:manage",
        "itam-normalization-catalog:manage",
      ],
    },
    {
      role_code: "FINANCE-IT-COST-ANALYST",
      role_name: "IT Cost Analyst",
      slug: "finance_it_cost_analyst",
      business_function_id: BF.FINANCE,
      description: "Analyses IT total cost of ownership and asset-contract commitments from a Finance perspective. Read-only on ITAM modules.",
      modules: [
        { dm: MOD.PORTFOLIO, interaction_level: "primary" },
        { dm: MOD.CONTRACTS, interaction_level: "secondary" },
      ],
      permissions: [
        "itam-portfolio-reporting:read",
        "itam-contracts:read",
      ],
    },
  ];

  for (const r of roles) {
    let roleId: number;
    const existing = await get(`/roles?role_code=eq.${r.role_code}&select=id`);
    if (existing.length > 0) {
      roleId = existing[0].id as number;
      console.log(`  role ${r.role_code} already exists (id=${roleId})`);
    } else {
      await post("/roles", {
        role_code: r.role_code,
        role_name: r.role_name,
        slug: r.slug,
        description: r.description,
        origin: "model",
        business_function_id: r.business_function_id,
      });
      const reread = await get(`/roles?role_code=eq.${r.role_code}&select=id`);
      roleId = reread[0].id as number;
      console.log(`  role ${r.role_code} created (id=${roleId})`);
    }

    // role_modules
    for (const m of r.modules) {
      const existingRm = await get(`/role_modules?role_id=eq.${roleId}&domain_module_id=eq.${m.dm}&select=id`);
      if (existingRm.length > 0) continue;
      await post("/role_modules", {
        role_id: roleId,
        domain_module_id: m.dm,
        interaction_level: m.interaction_level,
        notes: m.notes ?? "",
      });
    }

    // role_permissions
    for (const pname of r.permissions) {
      const pid = permId.get(pname);
      if (!pid) {
        console.warn(`  WARNING: permission ${pname} not found, skipping bundle entry for ${r.role_code}`);
        continue;
      }
      const existingRp = await get(`/role_permissions?role_id=eq.${roleId}&permission_id=eq.${pid}&select=id`);
      if (existingRp.length > 0) continue;
      await post("/role_permissions", {
        role_id: roleId,
        permission_id: pid,
      });
    }
  }
  log("roles processed", roles.length);
}

// ---------------------------------------------------------------------------
// Section 6. Optional add-ons (module 57 description + 2 regulations)
// ---------------------------------------------------------------------------
async function section6_addons() {
  console.log("\n[6] Section 6 add-ons");

  // Module 57 description annotation
  const mod = await get(`/domain_modules?id=eq.${MOD.NORM}&select=description`);
  const current = (mod[0]?.description as string) ?? "";
  const annotation = " Computed/reconciliation layer over HAM/SAM/SMP/FINOPS/EAM masters; intentionally has no own data_objects.";
  if (!current.includes("intentionally has no own data_objects")) {
    await patch(`/domain_modules?id=eq.${MOD.NORM}`, {
      description: (current + annotation).trim(),
    });
    log("module 57 description annotated", 1);
  } else {
    log("module 57 description already annotated", 0);
  }

  // domain_regulations: SOX (5), GDPR (1)
  const regLinks: Array<{ regulation_id: number; applicability: string; notes: string }> = [
    {
      regulation_id: 5, // SOX
      applicability: "mandatory",
      notes: "SOX requires accurate fixed-asset register and contract-liability disclosure; ITAM provides primary evidence via asset_lifecycle_events and asset_contracts.",
    },
    {
      regulation_id: 1, // GDPR
      applicability: "conditional",
      notes: "Assets attributed to identifiable employees (laptops, phones) carry GDPR obligations on data destruction at disposal and on access logs to asset records.",
    },
  ];
  for (const link of regLinks) {
    const existing = await get(`/domain_regulations?domain_id=eq.${ITAM_ID}&regulation_id=eq.${link.regulation_id}&select=id`);
    if (existing.length > 0) {
      console.log(`  domain_regulations id=${link.regulation_id} already linked`);
      continue;
    }
    await post("/domain_regulations", {
      domain_id: ITAM_ID,
      ...link,
    });
  }
  log("domain_regulations attempts", regLinks.length);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("ITAM audit fix loader (2026-05-24)");
  await section1_B4();
  await section2_B12();
  await section3_B10b();
  await section4_B9b();
  await section5_E1();
  await section6_addons();
  console.log("\nDone.");
}

await main();
