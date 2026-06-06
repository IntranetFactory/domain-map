# Modularization backlog

Catalog-wide tracking of domains that have **zero `domain_modules`** (fail M1). Source of truth is live state
(`domain_modules` + `domain_module_host_domains`) intersected with `audits/*/state.yaml` `next_action_by`.
Established 2026-06-02; re-derive counts with `bun run c:/tmp/enrich_no_module_domains.ts` (or re-create that probe).

As of 2026-06-02: **104** domains had no modules, all `next_action_by: agent`. Bucketed by how much substrate
each already holds, because that determines the work each needs.

Readiness buckets (caps = `capability_domains` count; masters = `domain_data_objects role=master` count):

| Bucket | Test | Count | Work needed |
|---|---|---|---|
| READY | caps≥3 + masters≥1 | 43 | Pure modularization, **reuse existing entities** (Phase M only) |
| MASTERS-ONLY | masters≥1, caps<3 | 34 | Author capabilities first (Phase A caps), then Phase M |
| PARTIAL | some caps + masters, below READY | 11 | Top up capabilities to ≥3 (light Phase A), then Phase M |
| CAPS-ONLY | caps≥3, masters=0 | 6 | Author masters (Phase 0 + Phase B), then Phase M; apply overlay test |
| STUB | no caps, no masters | 10 | Full Phase 0 + A + B + M; apply overlay test (some stay thin) |

---

## READY — clean modularization (reuse existing entities, Phase M only)

This is the only bucket that fits the "reuse existing entities" depth. Each subagent creates the `domain_modules`,
links existing capabilities (`domain_module_capabilities`), and assigns existing data_objects
(`domain_module_data_objects`) at their existing role + necessity. No new entities.

**Done 2026-06-02 (pilot, 5):** EXPENSE, WFM, MA, SAM, FLEET-MGMT.

**Remaining (38) — rolling out in batches of 7:**

- Batch 1: ACCT-PRACT-MGMT, AGENCY-MGMT, B2C-COMM, BPA, CDP, DAIRY-MGMT, DATA-AI-PLAT
- Batch 2: DLP, DSPM, DXP, ECM, EPM, ERP-FIN, FLEET-MAINT
- Batch 3: FMIS, FOOD-TRACE, FSQM, HCMS, ITOM, KGP, LCAP
- Batch 4: LOYALTY, METRICS-LAYER, NCDB, RE-CRE, RE-INVEST, RE-PROP-MGMT, REAL-EST
- Batch 5: REMOTE-ACCESS, RMM, SALES-ENG, SMM, SPEND-MGMT, TELEMATICS, UEM
- Batch 6: VET-PRACT-MGMT, VMS, WEB-CONTOPS

---

## DEFERRED — non-READY (61). What each needs *differently* from the READY pass.

The READY pass works because the capabilities and masters already exist; the subagent only has to *group* them
into modules. The deferred buckets each fail that precondition in a specific way, which is why they need authoring
beyond "reuse existing entities" before they can be modularized.

### PARTIAL (11) — capability top-up, then modularize (lightest)

These already have masters (often many) but only 1-2 capabilities, below the ≥3 that makes a ≥2-module split
meaningful. **Different work:** author 1-2 net-new capabilities (Phase A capability slice + `capability_domains`)
to reach a coherent ≥3, then modularize exactly like READY. GRC, S2P, SPM, MDM are nearly READY (9-10 masters each,
just capability-starved).

AP-AUTO, CCAAS, DAM, GRC, KMS, LSD, MDM, MFG-OPS, RET-STORE, S2P, SPM

### MASTERS-ONLY (34) — author capabilities, then modularize

Have masters (5-12 each) but most have **zero capabilities**. A module needs ≥1 capability (M6), so you cannot
even create a valid module without authoring capabilities. **Different work:** run the Phase A capability slice
(3-6 noun-phrase capabilities per domain + `capability_domains` links), then modularize. No master research needed
(the masters are already there), so this is medium weight: Phase A caps + Phase M.

AIOPS, APIM, APP-PAAS, AUDIT, BANK-OPS, BI, CLIN-DEV, CONV-AI, DCG, DCIM, DEM, DI, DISCOVERY, DQ, EAM, ESG, ESIGN,
HC-PATIENT, IDP, INS-CLAIMS, IPAAS, KUBE-PLAT, NPMD, OBS, OMS, PROC-MIN, PS-LIC, RPA, SUP-LIFE, TELCO-BSS,
TEST-MGMT, UTIL-OPS, VIS-MGMT, VSDP

### CAPS-ONLY (6) — author masters, then modularize (heavy)

Have capabilities (≥3) but **zero masters**. A module with no mastered entity is either an overlay (consumer/derived
rows only) or an empty-module smell. **Different work:** apply the overlay test per domain (does it persist any record
no other domain masters?). If master-bearing → Phase 0 vendor surface + Phase B masters, then Phase M. If genuine
overlay → author the consumer/derived footprint (what it reads from other domains) + a non-empty derive module.
Several here are overlay/leadership-tier candidates (GTM-PLAN, SALES-PERF, ACCT-PLAN, COLLAB-GOV, INTRANET).

ACCT-PLAN, CAFM, COLLAB-GOV, GTM-PLAN, INTRANET, SALES-PERF

### STUB (10) — full domain build (heaviest)

No capabilities and no masters. **Different work:** full pipeline — Phase 0 (vendor surface) + Phase A
(capabilities; solutions mostly already exist) + Phase B (masters, after the overlay test) + Phase M. Several are
overlay candidates (FINOPS, SECOPS, SOAR, THREAT-INTEL) and several are master-bearing-but-unbuilt
(VULN-MGMT → vulnerabilities; TPRM → third-party assessments; PRIV-MGMT → DSARs; PRM → partner deal registrations;
BCM/OP-RES → resilience records). Each needs the overlay test before deciding master-bearing vs derive/overlay.

BCM, FINOPS, OP-RES, PRIV-MGMT, PRM, SECOPS, SOAR, THREAT-INTEL, TPRM, VULN-MGMT

---

## Common thread

- **45 domains (PARTIAL + MASTERS-ONLY)** are blocked on **missing capabilities** only. A focused Phase-A
  capability-authoring pass unblocks all of them to READY-style modularization.
- **16 domains (CAPS-ONLY + STUB)** are blocked on **missing masters** and need Phase 0 vendor research + the
  overlay test before any masters are authored.

## Pre-existing catalog issues surfaced during the READY pass (NOT introduced by it)

- **`equity_grants` (data_object 158) is mastered in two modules catalog-wide** (a global M7 hard-fail the blueprint emitter would throw on): `COMP-INCENTIVES` (COMP-MGMT) id 399 and `CAP-TABLE-GRANTS` (CAP-TABLE) id 66. Both modules predate this session (ids 79 / 21, well below today's 191-323 range) and the legacy `domain_data_objects` rollup lists both COMP-MGMT and CAP-TABLE as masters. Neither domain is in the 43 READY set, so this pass did not create it. **Fix (needs a user judgment call):** pick the canonical owner (CAP-TABLE is the stronger claim, equity grants live on the cap table; COMP-MGMT references them as part of total comp) and demote the other's row to `embedded_master`. Tracked here as an out-of-scope follow-up, not loaded.

## Out of scope for the modularization pass (tracked per-domain, not here)

Every modularized domain still owes, after Phase M: per-module **tool requirements** on
`domain_module_tools` (Rule #17, F3; the domain's single domain-grain `system` skill derives its
toolset from these) and buyer-facing **catalog UX copy** (`catalog_tagline` / `catalog_description`,
M8/A4, needs user-approved wording). These are recorded as `b1a` items in each domain's `state.yaml`,
not in this file.

The earlier per-module-`system`-skill instruction (author one `<module_code>_agent` per module, then
delete the domain-level skill) is SUPERSEDED by the per-domain-skill migration
(plans/per-domain-skill-restoration.md): tools now live on modules via `domain_module_tools`, and each
domain carries exactly one domain-grain `system` skill that derives its toolset (no `skill_tools`).
Author tools onto modules, never onto skills.

## Per-module tool re-authoring (post per-domain-skill migration, 2026-06-06)

The per-domain-skill restoration (plans/per-domain-skill-restoration.md) retired the per-module
`system` skills and moved tool requirements onto modules (`domain_module_tools`) and value-stream
processes (`process_tools`). As part of it, the 528 domain-grain tool requirements stored on the 61
per-domain `system` skills were PURGED (retained in `plans/snapshots/skill_tools.json`). The
authoritative way tools reach modules is the per-module tool authoring a domain audit performs, so
re-authoring these is standing audit-backlog work, tracked here.

**57 domains owe per-module tool authoring** (their per-domain skill carried tool requirements that
were purged; their modules carry none yet):

- **45 zero-module domains** (modularize first, then author tools; already enrolled in the buckets above):
  AIOPS, AP-AUTO, APIM, APP-PAAS, AUDIT, BANK-OPS, BI, CCAAS, CLIN-DEV, CONV-AI, DAM, DCG, DCIM, DEM,
  DI, DISCOVERY, DQ, EAM, ESG, ESIGN, GRC, HC-PATIENT, IDP, INS-CLAIMS, IPAAS, KMS, KUBE-PLAT, LSD,
  MDM, MFG-OPS, NPMD, OBS, OMS, PROC-MIN, PS-LIC, RET-STORE, RPA, S2P, SPM, SUP-LIFE, TELCO-BSS,
  TEST-MGMT, UTIL-OPS, VIS-MGMT, VSDP
- **12 un-authored multi-module domains** (have modules but no `domain_module_tools` yet; author tools
  onto the existing modules):
  AGENCY-MGMT, COMP-MGMT, CPQ, FLEET-MGMT, HAM, IWMS, MSP-PSA, PA, PAYROLL, SUB-MGMT, SWP, WFM

The 4 already-authored full-module domains (72 CDP, 91 ECM, 130 RMM, 149 FLEET-MAINT) kept their
per-module tools through the migration and are NOT enrolled.

**5 generic `side_effect` links with no module counterpart** that per-module re-authoring will NOT
auto-restore (domain-grain only; retained in the snapshot; re-add them explicitly when these already
authored domains gain or revise tools):

- domain 72 (CDP): `send_email`
- domain 130 (RMM): `send_email`, `post_chat_message`
- domain 149 (FLEET-MAINT): `send_email`, `sign_document`
- domain 91 (ECM): none
