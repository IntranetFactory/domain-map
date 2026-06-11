# Changelog

Repo-wide log of meaningful changes: emitted artifacts whose shape consumers depend on, scripts that produce them, and conventions worth carrying forward. Newest entries on top.

---

## `domain-map.json` / `personas.json` / `processes.json` — current shape

Emitted by [scripts/emit_domain_map.ts](scripts/emit_domain_map.ts) from the live Semantius catalog. Reads go through [scripts/lib/catalog.ts](scripts/lib/catalog.ts) and the local cache. One run writes three files under `catalog/`:

- `domain-map.json` — domains + modules topology, now with `personas[]` and `processes[]` at both the domain grain and nested per module.
- `personas.json` — every catalog persona (`domain_roles`), with its business function and the modules / domains its `role_modules` reach touches.
- `processes.json` — only the processes USED somewhere in the catalog (the `processes` table is the full ~2k-row APQC PCF framework; this is the in-use subset).

### Commands

```sh
bun run scripts/emit_domain_map.ts                        # write all three under catalog/
bun run scripts/emit_domain_map.ts --out path.json        # custom domain-map output path
bun run scripts/emit_domain_map.ts --personas-out p.json  # custom personas output path
bun run scripts/emit_domain_map.ts --processes-out q.json # custom processes output path
bun run scripts/emit_domain_map.ts --stdout               # print domain-map to stdout, write nothing
bun run scripts/emit_domain_map.ts --cache                # emit from the local cache, no server refresh
```

By default the emitter forces a cache refresh on every run (it IS the regenerate-everything path, typically run after a load) and rewrites the cache for downstream emitters to reuse. `--cache` skips the refresh and emits from the existing cache file (offline / fast iteration; falls back to the server only if no cache file exists).

### Shape — `domain-map.json`

```jsonc
{
  "domains": [
    {
      "code": "ATS",
      "name": "Applicant Tracking System",
      "description": "...",
      "catalog_release": "2026-09-01",
      "modules": [
        {
          "code": "ATS-RECRUITMENT-PIPELINE",
          "name": "Recruitment Pipeline",
          "description": "...",
          "personas": [
            { "code": "RECRUITING-RECRUITER", "name": "Recruiter", "interaction_level": "primary" }
          ],
          "processes": [
            { "key": "manage_new_hire_re_hire", "name": "Manage new hire/re-hire", "via": "gate" },
            { "key": "identify_receive_leads", "name": "Identify/receive leads", "via": "handoff" }
          ],
          "related_modules": ["HCM-CORE-HR"]
        }
      ],
      "personas": [
        { "code": "RECRUITING-RECRUITER", "name": "Recruiter", "interaction_level": "primary" }
      ],
      "processes": [
        { "key": "manage_new_hire_re_hire", "name": "Manage new hire/re-hire", "via": "gate" }
      ],
      "related_domains": ["HCM", "ONBOARDING", "PAYROLL"]
    }
  ]
}
```

- `domains[]` sorted ascending by `code`.
- `modules[]` sorted ascending by `code`. Membership = `domain_modules.domain_id` (primary host) ∪ `domain_module_host_domains` (junction).
- `catalog_release` is a **domain-level only** field (the nullable `date` `domains.catalog_release` column straight from the catalog): the scheduled web-site-catalog release date as an ISO `YYYY-MM-DD` string, or `null` if not scheduled. Persistent value on the row itself, not a derived flag. (Replaced the former boolean `catalog` flag, which existed on both domains and modules.) Modules carry no `catalog_release`.
- **Release gate (all four artifacts).** By default `domain-map.json`, `personas.json`, `processes.json`, and `business-functions.json` are all restricted to **released** domains (a domain whose `catalog_release` is set and on or before the emit date) and the data related to them: `domain-map.json` lists only released domains with `related_domains` / `related_modules` pruned to the released set, `personas.json` / `business-functions.json` keep only personas/functions touching a released domain, and `processes.json` keeps only processes attributed to a released domain. Pass `--all` to drop the filter and emit every domain (the full internal topology). Because `catalog_release` is the public web-site-catalog go-live date, "released" means "live on the public catalog", so the default output is the public set and `--all` is the internal/full set.
- `related_domains[]` sorted, self-excluded, computed as the union of:
  - other domains touching one of this domain's `data_objects` (any role; reaches through both `domain_data_objects` and `domain_module_data_objects` for modules hosted on the domain), and
  - handoff neighbors (any row in `handoffs` where this domain is on either side).
- `personas[]` (domain and module grain) sorted by `code`, deduped. Attached via the `role_modules` REACH edge (persona ↔ module). A module lists every persona whose reach touches it; a domain lists the union across its hosted modules. `interaction_level` is `primary` / `secondary`, and when a persona reaches a domain through several modules the **strongest** level wins (primary > secondary). Only the concrete `role_modules` edge is used (not the aspirational `business_function` coverage), so domains whose persona layer (Phase E) has not been authored yet show `"personas": []`.
- `processes[]` (domain and module grain) sorted by `key`, deduped, each tagged with `via`:
  - `via: "gate"` — a module realizes the process as a lifecycle gate (`data_object_lifecycle_states.process_id` + `domain_module_id`). "Owns / runs it." Rolled up to the domain across its modules.
  - `via: "handoff"` — the process implements one of the unit's handoffs (`handoff_processes` → `handoffs` endpoints). Module grain uses the handoff's module endpoints (which can be NULL, skipped); domain grain uses the always-present domain endpoints, so the domain list is the more complete of the two.
  - A process attached both ways to the same unit is listed once with `via: "gate"` (the ownership signal wins).

### Shape — `personas.json`

```jsonc
{
  "personas": [
    {
      "code": "RECRUITING-RECRUITER",
      "name": "Recruiter",
      "description": "...",
      "business_function_id": 12,
      "business_function": "Recruiting",       // null for cross-functional personas
      "record_status": "new",
      "module_count": 6,
      "domain_count": 2,
      "modules": ["ATS-OFFERS", "ATS-RECRUITMENT-PIPELINE"],
      "domains": ["ATS", "HCM"],
      "processes": [
        { "key": "recruit_source_candidates", "name": "Recruit/Source candidates", "raci": "responsible" }
      ]
    }
  ]
}
```

- Every `domain_roles` row (the full persona set), sorted by `code`. `modules[]` / `domains[]` are the reverse of the `role_modules` reach (domains derived from the reached modules' host domains).
- `processes[]` is the persona's responsibility edge from `process_raci` (`actor_role_id` = this persona), sorted by `key`. `raci` is the full enum word (`responsible` / `accountable` / `consulted` / `informed`). Only personas with authored RACI rows have a non-empty list; the rest are `[]`. This is the inverse of `personas[]` in `processes.json`.

### Shape — `processes.json`

```jsonc
{
  "processes": [
    {
      "key": "manage_new_hire_re_hire",
      "code": "7.2.1.1",                        // APQC PCF hierarchy code (null for the rare unset)
      "name": "Manage new hire/re-hire",
      "external_id": "10491",                   // APQC PCF id ("" for custom rows)
      "hierarchy_level": 4,
      "source_framework": "apqc_pcf_cross_industry",  // or "custom"
      "usage": { "gate": true, "raci": true, "handoff": true, "tool": false },
      "personas": [
        { "code": "RECRUITING-RECRUITER", "name": "Recruiter", "raci": "responsible" }
      ]
    }
  ]
}
```

- Only processes USED somewhere, sorted by `key`. "Used" = referenced by any of four edges: `data_object_lifecycle_states.process_id` (gate), `process_raci.process_id` (raci), `handoff_processes.process_id` (handoff), `process_tools.process_id` (tool). The `usage` object flags which edges reference each process. The full `processes` table (~2k APQC PCF rows) is deliberately NOT emitted, only the in-use subset (~400).
- `personas[]` is the RACI actors on this process from `process_raci` (`process_id` = this process, persona actors only, skill actors excluded), sorted by `code`. `raci` is the full enum word (`responsible` / `accountable` / `consulted` / `informed`). This is the inverse of `processes[]` in `personas.json`; only the ~39 gated processes carry personas today.
