#!/usr/bin/env bun
// B9d (handoff payload realization) classifier for HCM (domain 54). READ-ONLY.
// Classifies each OUTBOUND cross-domain handoff_processes payload tag against the
// realized set, first-match order: RESOLVED / ROLL-UP / ORPHAN / MIS-TAG.
// Realized = a process whose id is a gated data_object_lifecycle_states.process_id
// AND that carries process_raci with >=1 R and >=1 A.

type Row = Record<string, any>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`fail: ${err}`);
  const t = out.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });

// dotted-code ancestor/descendant test
function related(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(b + ".") || b.startsWith(a + ".");
}

async function main() {
  // 1. Outbound cross-domain tags
  const tags = await get(
    `/handoff_processes?select=handoff_id,process_id,record_status,proposal_source,process:processes(id,process_code,process_name,external_id,hierarchy_level),handoffs!inner(id,source_domain_id,target_domain_id,data_object_id,target_domain:domains!handoffs_target_domain_id_fkey(domain_code),payload:data_objects!handoffs_data_object_id_fkey(data_object_name),trigger_event:trigger_events(event_name))&handoffs.source_domain_id=eq.54&handoffs.target_domain_id=neq.54&order=handoff_id.asc`,
  );

  // 2. Realized set: gated process_ids that also carry process_raci with >=1 R and >=1 A
  const gated = await get(`/data_object_lifecycle_states?process_id=not.is.null&select=process_id`);
  const gatedIds = new Set<number>(gated.map(r => r.process_id));
  const raci = await get(`/process_raci?select=process_id,raci`);
  const rByProc = new Map<number, Set<string>>();
  for (const r of raci) {
    if (!rByProc.has(r.process_id)) rByProc.set(r.process_id, new Set());
    rByProc.get(r.process_id)!.add(String(r.raci).toUpperCase());
  }
  const hasRA = (pid: number) => {
    const s = rByProc.get(pid); return !!s && s.has("R") && s.has("A");
  };
  const realizedIds = [...gatedIds].filter(hasRA);

  // 3. process_codes for realized ids (for hierarchy matching)
  const realizedProcs = realizedIds.length
    ? await get(`/processes?id=in.(${realizedIds.join(",")})&select=id,process_code,process_name`)
    : [];
  const realizedCodes = realizedProcs.map(p => ({ id: p.id, code: String(p.process_code || ""), name: p.process_name }));

  // 4. Classify each tag
  console.log(`Outbound cross-domain handoff_processes tags: ${tags.length}`);
  console.log(`Realized processes (gated + R+A): ${realizedIds.length}\n`);
  const verdicts: Row[] = [];
  for (const t of tags) {
    const C = String(t.process?.process_code || "");
    const pid = t.process_id;
    const cat = C.split(".")[0];
    let verdict = "", detail = "";

    // 1 RESOLVED: exact code realized (this process_id is gated AND has R+A)
    if (gatedIds.has(pid) && hasRA(pid)) {
      verdict = "RESOLVED"; detail = "exact code gated + R/A";
    } else {
      // 2 ROLL-UP: a strict ancestor/descendant code is realized
      const rel = realizedCodes.filter(rc => related(C, rc.code) && rc.code !== C);
      if (rel.length) {
        verdict = "ROLL-UP";
        detail = `realized at ${rel.map(r => `${r.code}(#${r.id})`).join(", ")}`;
      } else {
        // exact-code realized but via a DIFFERENT process row sharing the code? check realizedCodes equal
        const exact = realizedCodes.filter(rc => rc.code === C);
        if (exact.length) {
          verdict = "RESOLVED"; detail = `realized at same code ${C}(#${exact[0].id})`;
        } else {
          // 4 MIS-TAG vs 3 ORPHAN: category check. HCM=cat 7. flag non-7 for family review.
          if (cat && cat !== "7") {
            verdict = "MIS-TAG?"; detail = `category ${cat} (not HR cat 7) -> verify target family`;
          } else {
            verdict = "ORPHAN"; detail = `no realized ancestor/descendant of ${C}`;
          }
        }
      }
    }
    verdicts.push({
      handoff_id: t.handoff_id, target: t.handoffs?.target_domain?.domain_code,
      event: t.handoffs?.trigger_event?.event_name, payload: t.handoffs?.payload?.data_object_name,
      code: C, lvl: t.process?.hierarchy_level, proc: t.process?.process_name,
      src: t.proposal_source, rs: t.record_status, verdict, detail,
    });
  }

  // 5. Print grouped
  const order = ["RESOLVED", "ROLL-UP", "ORPHAN", "MIS-TAG?"];
  const counts: Record<string, number> = {};
  for (const v of verdicts) counts[v.verdict] = (counts[v.verdict] || 0) + 1;
  console.log("VERDICT COUNTS:", JSON.stringify(counts), "\n");
  for (const grp of order) {
    const rows = verdicts.filter(v => v.verdict === grp);
    if (!rows.length) continue;
    console.log(`\n===== ${grp} (${rows.length}) =====`);
    for (const v of rows) {
      console.log(`  h${v.handoff_id} ->${v.target} [${v.event}] payload=${v.payload}`);
      console.log(`     tag ${v.code} L${v.lvl} "${v.proc}" (${v.src}/${v.rs})`);
      console.log(`     ${v.detail}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
