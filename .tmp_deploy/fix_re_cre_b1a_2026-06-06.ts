// RE-CRE b1a execution (2026-06-06)
//
// B1A-SYS-SKILLS: author 3 module-level system skills (Rule #17) on the 3 RE-CRE
//   modules (278/292/293), bind their tools (split the 8 legacy skill_tools rows by
//   master ownership; switch send_email -> notify_person per F7; keep sign_document on
//   leasing), then DELETE legacy domain-level system skill 96 once bindings are migrated.
// B1A-CATALOG-UX: write buyer-voice catalog_tagline + catalog_description into the EMPTY
//   fields on domains row 145 (Rule #20 backfill; empty-guard per field).
//
// Idempotent. record_status OMITTED on every insert (DB default 'new'). No notes writes.
// semantius CLI only. No em-dashes. American English.

type Row = Record<string, unknown>;

async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const payload: Row = { method: req.method, path: req.path };
  if (req.body !== undefined) payload.body = req.body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`semantius exited ${code} for ${req.method} ${req.path}\nSTDERR: ${err}\nSTDOUT: ${out}`);
  }
  const trimmed = out.trim();
  if (trimmed.includes("required audience not found")) {
    throw new Error(`JWT-AUDIENCE ERROR (STOP): ${trimmed}`);
  }
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

const get = (path: string) => call({ method: "GET", path });

async function main() {
  // ---- Pre-flight: re-read shared catalog state immediately before any write ----
  const toolNames = [
    "query_commercial_leases",
    "query_tenant_credit_records",
    "query_sublease_transactions",
    "query_investment_properties",
    "query_cam_charges",
    "query_stacking_plans",
    "query_building_certifications",
    "notify_person",
    "sign_document",
  ];
  const tools: Array<{ id: number; tool_name: string }> = await get(
    `/tools?tool_name=in.(${toolNames.join(",")})&select=id,tool_name`,
  );
  const toolId = new Map(tools.map((t) => [t.tool_name, Number(t.id)]));
  for (const n of toolNames) {
    if (!toolId.has(n)) throw new Error(`Missing shared tool row: ${n}. Aborting (Rule #9 dedup pre-flight).`);
  }

  // ---- Skill specs: one system skill per module, tools split by master ownership ----
  type SkillSpec = {
    skill_name: string;
    domain_module_id: number;
    description: string;
    tools: string[]; // all required
  };
  const skillSpecs: SkillSpec[] = [
    {
      skill_name: "re_cre_leasing_agent",
      domain_module_id: 278,
      description:
        "System skill for the Commercial Leasing Pipeline module. Runs workflows over commercial leases, tenant credit records, and sublease transactions, reading the investment property each lease attaches to and notifying the parties through lease execution.",
      tools: [
        "query_commercial_leases",
        "query_tenant_credit_records",
        "query_sublease_transactions",
        "query_investment_properties",
        "notify_person",
        "sign_document",
      ],
    },
    {
      skill_name: "re_cre_cam_ops_agent",
      domain_module_id: 292,
      description:
        "System skill for the CAM Reconciliation and Rent Escalations module. Runs workflows over common-area-maintenance charges and recurring-billing escalations, distributing reconciliation statements to tenants.",
      tools: ["query_cam_charges", "notify_person"],
    },
    {
      skill_name: "re_cre_space_market_agent",
      domain_module_id: 293,
      description:
        "System skill for the Space Inventory and Market Intelligence module. Runs workflows over stacking plans and building certifications, and notifies stakeholders of certification status and tenant-relations events.",
      tools: ["query_stacking_plans", "query_building_certifications", "notify_person"],
    },
  ];

  // ---- Author skills (idempotent by skill_name) ----
  const existingSkills: Array<{ id: number; skill_name: string }> = await get(
    `/skills?skill_name=in.(${skillSpecs.map((s) => s.skill_name).join(",")})&select=id,skill_name`,
  );
  const skillIdByName = new Map(existingSkills.map((s) => [s.skill_name, Number(s.id)]));

  const skillsToInsert = skillSpecs
    .filter((s) => !skillIdByName.has(s.skill_name))
    .map((s) => ({
      skill_name: s.skill_name,
      skill_type: "system",
      domain_id: 145,
      domain_module_id: s.domain_module_id,
      description: s.description,
      // record_status omitted -> DB default 'new'
    }));

  if (skillsToInsert.length > 0) {
    const inserted: Array<{ id: number; skill_name: string }> = await call({
      method: "POST",
      path: "/skills",
      body: skillsToInsert,
    });
    for (const r of inserted) skillIdByName.set(r.skill_name, Number(r.id));
    console.log(`Inserted ${inserted.length} system skills:`, inserted.map((r) => `${r.skill_name}=${r.id}`).join(", "));
  } else {
    console.log("No new skills to insert (all present).");
  }

  // ---- Author skill_tools (idempotent by skill_id+tool_id) ----
  const allSkillIds = skillSpecs.map((s) => skillIdByName.get(s.skill_name)).filter(Boolean) as number[];
  const existingBindings: Array<{ skill_id: number; tool_id: number }> = await get(
    `/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,tool_id`,
  );
  const bindingKey = (sid: number, tid: number) => `${sid}|${tid}`;
  const haveBinding = new Set(existingBindings.map((b) => bindingKey(Number(b.skill_id), Number(b.tool_id))));

  const bindingsToInsert: Row[] = [];
  for (const spec of skillSpecs) {
    const sid = skillIdByName.get(spec.skill_name)!;
    for (const tn of spec.tools) {
      const tid = toolId.get(tn)!;
      if (!haveBinding.has(bindingKey(sid, tid))) {
        bindingsToInsert.push({
          skill_id: sid,
          tool_id: tid,
          requirement_level: "required",
          // notes omitted (Rule #15), record_status omitted -> default 'new'
        });
      }
    }
  }

  if (bindingsToInsert.length > 0) {
    const insertedBindings: Array<{ id: number; skill_id: number; tool_id: number }> = await call({
      method: "POST",
      path: "/skill_tools",
      body: bindingsToInsert,
    });
    console.log(`Inserted ${insertedBindings.length} skill_tools bindings.`);
  } else {
    console.log("No new skill_tools to insert (all present).");
  }

  // ---- Verify every new skill has >= 1 skill_tools before retiring legacy skill 96 ----
  for (const spec of skillSpecs) {
    const sid = skillIdByName.get(spec.skill_name)!;
    const bound: Array<{ id: number }> = await get(`/skill_tools?skill_id=eq.${sid}&select=id`);
    if (bound.length < 1) {
      throw new Error(`Skill ${spec.skill_name} (${sid}) has 0 skill_tools; aborting before legacy delete (Rule #17 F3).`);
    }
    console.log(`  ${spec.skill_name} (${sid}): ${bound.length} skill_tools`);
  }

  // ---- DELETE legacy domain-level system skill 96 (its skill_tools cascade) ----
  const legacy: Array<{ id: number; skill_name: string; domain_module_id: number | null }> = await get(
    `/skills?id=eq.96&select=id,skill_name,domain_module_id`,
  );
  if (legacy.length > 0) {
    await call({ method: "DELETE", path: "/skills?id=eq.96" });
    console.log(`Deleted legacy skill 96 (${legacy[0].skill_name}); its skill_tools cascade-deleted.`);
  } else {
    console.log("Legacy skill 96 already absent.");
  }

  // ---- B1A-CATALOG-UX: PATCH domains 145 catalog fields with empty-guard ----
  const domainRows: Array<{ id: number; catalog_tagline: string; catalog_description: string }> = await get(
    `/domains?id=eq.145&select=id,catalog_tagline,catalog_description`,
  );
  const d = domainRows[0];

  const tagline =
    "Manage commercial leases, CAM reconciliations, rent escalations, and stacking plans across office, retail, and industrial portfolios.";
  const description =
    "Run the full commercial leasing pipeline in one place. Move deals from letter of intent through negotiation to an executed lease, underwrite tenant credit before signing, and track subleases and assignments as the head lease changes hands. Every lease term, option, and escalation lives in a single record your team can act on.\n\n" +
    "Reconcile common-area-maintenance charges and recurring rent escalations without the spreadsheet scramble. Build expense pools, apply gross-ups and audit caps, calculate annual escalations, and produce clean reconciliation statements your tenants can trust at year-end.\n\n" +
    "See your buildings the way asset managers do. Maintain stacking plans that show who occupies every floor, keep building certifications and green ratings current, and use market context to guide renewals, vacancies, and tenant relationships across the portfolio.";

  const patch: Row = {};
  if (!d.catalog_tagline || d.catalog_tagline.trim() === "") patch.catalog_tagline = tagline;
  if (!d.catalog_description || d.catalog_description.trim() === "") patch.catalog_description = description;

  if (Object.keys(patch).length > 0) {
    await call({ method: "PATCH", path: "/domains?id=eq.145", body: patch });
    console.log(`Patched domains 145 catalog fields: ${Object.keys(patch).join(", ")}`);
  } else {
    console.log("domains 145 catalog fields already non-empty; left untouched (overwrite protection).");
  }

  // ---- Final verification ----
  const finalSkills: Array<{ id: number; skill_name: string; skill_type: string; domain_module_id: number | null }> =
    await get(
      `/skills?domain_id=eq.145&select=id,skill_name,skill_type,domain_module_id&order=domain_module_id.asc`,
    );
  console.log("\n=== Final RE-CRE skills ===");
  console.log(JSON.stringify(finalSkills, null, 2));

  const finalBindings: Array<{ id: number; skill_id: number; tools: { tool_name: string } }> = await get(
    `/skill_tools?skill_id=in.(${allSkillIds.join(",")})&select=skill_id,requirement_level,tools(tool_name)&order=skill_id.asc`,
  );
  console.log("\n=== Final skill_tools on new skills ===");
  console.log(JSON.stringify(finalBindings, null, 2));

  const finalDomain: Array<{ catalog_tagline: string; catalog_description: string }> = await get(
    `/domains?id=eq.145&select=catalog_tagline,catalog_description`,
  );
  console.log("\n=== Final domains 145 catalog fields ===");
  console.log(`tagline len: ${finalDomain[0].catalog_tagline.length}; description len: ${finalDomain[0].catalog_description.length}`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
