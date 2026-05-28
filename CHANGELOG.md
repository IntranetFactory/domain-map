# Changelog

Repo-wide log of meaningful changes: emitted artifacts whose shape consumers depend on, scripts that produce them, and conventions worth carrying forward. Newest entries on top.

---

## `domain-map.json` — current shape

Emitted by [scripts/emit_domain_map.ts](scripts/emit_domain_map.ts) from the live Semantius catalog. Reads go through [scripts/lib/catalog.ts](scripts/lib/catalog.ts) and the local cache.

### Commands

```sh
bun run scripts/emit_domain_map.ts                  # write domain-map.json at repo root
bun run scripts/emit_domain_map.ts --out path.json  # custom output path
bun run scripts/emit_domain_map.ts --stdout         # print to stdout, do not write
```

The emitter forces a cache refresh on every run (it IS the regenerate-everything path, typically run after a load) and rewrites the cache for downstream emitters to reuse.

### Shape

```jsonc
{
  "domains": [
    {
      "code": "ATS",
      "name": "Applicant Tracking System",
      "description": "...",
      "catalog": true,
      "modules": [
        {
          "code": "ATS-RECRUITMENT-PIPELINE",
          "name": "Recruitment Pipeline",
          "description": "...",
          "catalog": true
        }
      ],
      "related_domains": ["HCM", "ONBOARDING", "PAYROLL"]
    }
  ]
}
```

- `domains[]` sorted ascending by `code`.
- `modules[]` sorted ascending by `code`. Membership = `domain_modules.domain_id` (primary host) ∪ `domain_module_host_domains` (junction).
- `catalog` on a domain or module is the boolean `domains.catalog` / `domain_modules.catalog` column straight from the catalog. Persistent classification on the row itself, not a derived flag.
- `related_domains[]` sorted, self-excluded, computed as the union of:
  - other domains touching one of this domain's `data_objects` (any role; reaches through both `domain_data_objects` and `domain_module_data_objects` for modules hosted on the domain), and
  - handoff neighbors (any row in `handoffs` where this domain is on either side).
