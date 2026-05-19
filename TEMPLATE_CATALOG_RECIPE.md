# Template catalog recipe (monday → repeat for Airtable)

This document captures the exact pipeline used to produce [m_templates.md](m_templates.md) and [m_domains.md](m_domains.md) from monday.com, so the same shape can be repeated for Airtable as `a_templates.md` and `a_domains.md`.

The data-acquisition step depends on the vendor's frontend stack and has to be re-discovered per vendor. Everything downstream of "we have a JSON array of templates" is reusable.

---

## Output files (per vendor)

For prefix `<p>` (`m_` for monday, `a_` for airtable):

- `<p>templates.md` — **grouped catalog**: one section per category. Each section has the category title, category overview paragraph, category URL, and a table of templates with columns `Title | Overview | Description | URL`.
- `<p>domains.md` — **flat table**: one row per **unique** template (de-duped across categories) with columns `Domain | Title | Overview | Description | URL`. The `Domain` column is populated only when the template clearly maps to a software-market domain in our live `domain_map` catalog (`https://adenin.semantius.ai`, module slug `domain_map`, table `domains`). Blank `Domain` = the **delta** — a template that has no matching point-solution-market in our catalog.

The point of the two files: `<p>templates.md` mirrors the vendor's own catalog structure for browsing; `<p>domains.md` is the analytical artifact for catalog-gap analysis.

---

## Pipeline overview

```
1. Fetch the templates landing page             →  raw HTML
2. Extract the structured data blob              →  JSON
3. Map JSON shape to canonical record            →  array of templates
4. Verify by HEAD-checking constructed URLs     →  all 200
5. Build <p>templates.md (grouped by category)
6. Read live `domains` table from domain_map
7. Manually map template_id → domain_code        →  conservative MATCH table
8. Build <p>domains.md (flat, one row per template, Domain blank when no match)
9. Print match summary; surface delta to user
```

Steps 1–3 are vendor-specific. Steps 4–9 are mechanical.

---

## What worked for monday.com (reference implementation)

### Step 1 — Fetch

```bash
curl -s -L -A "Mozilla/5.0" "https://monday.com/templates/category/marketing" -o /c/tmp/monday_marketing.html
```

A single category page is enough — monday ships the full catalog on every page.

### Step 2 — Extract the data blob

monday is a Next.js site, so the JSON is in a `<script id="__NEXT_DATA__">` tag:

```js
const html = fs.readFileSync("c:/tmp/monday_marketing.html", "utf8");
const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const d = JSON.parse(m[1]);
fs.writeFileSync("c:/tmp/next_data.json", m[1]);
```

Inside `d.props.pageProps`:

- `allCategories` — `[{label, value}, …]` — 20 categories, `value` is the slug.
- `allSolutions` — `[{id, app_feature_reference_id, name, data:{shortDescription, description, categories, …}}, …]` — 84 templates, every one with categories, descriptions, and stable IDs.
- `translations` — i18n keymap. Category title/overview are at:
  - `templateCenter.category.title.<slug>` (e.g. `"monday.com for marketing"`)
  - `templateCenter.category.description.<slug>` (e.g. `"Customizable templates for all your marketing needs."`)

### Step 3 — Canonical mapping

Per template:

| Output column | Source                                      |
| ---           | ---                                         |
| `Title`       | `sol.name`                                  |
| `Overview`    | `sol.data.shortDescription` (card subtitle) |
| `Description` | `sol.data.description` (paragraph below H1) |
| `URL`         | `https://monday.com/templates/template/{sol.app_feature_reference_id}/{slugify(sol.name)}` |
| `Category`    | `sol.data.categories[]` (may be 0..n)       |

Slug rule (verified against several live URLs):

```js
const slugify = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
```

**Verification:** mapped `Marketing Strategy` to `https://monday.com/templates/template/85832/marketing-strategy`, fetched the page, confirmed `sol.data.description` matched the paragraph under the H1 verbatim. Then HEAD-checked every constructed URL — all 84 returned 200.

### Step 4 — Build `m_templates.md`

[build_m_templates.mjs](build_m_templates.mjs). One section per category in the order `allCategories` defines, table inside each section. Templates with empty `data.categories` go into an `Uncategorized` section at the bottom (monday had 4 such rows).

### Step 5 — Build `m_domains.md` (the delta file)

1. Pull the live domain list:
   ```bash
   semantius call crud postgrestRequest '{"method":"GET","path":"/domains?select=id,domain_code,domain_name,description&limit=2000&order=domain_name.asc"}' > /c/tmp/domains.json
   ```
   **Run from the project root.** Never `cd` into a subfolder first — `semantius` reads `.env` from cwd and silently switches tenant otherwise. See [CLAUDE.md](CLAUDE.md) and the domain-map-analyst skill rule #6.

2. Hand-craft a `MATCH` table mapping `template_id → domain_code`. **Be conservative — apply the point-solution-market test from the domain-map-analyst skill rule #2:** something is a match only if independent vendors compete in that named software market. Generic boards (sprint retro, single project, content calendar) get **no** match — that's the whole point of the delta.

   For monday, 21 of 84 matched. The matches were:
   ```
   ATS         ← job application form, recruitment & onboarding, recruitment process
   CRM         ← contacts, real estate CRM
   CSM         ← customer requests
   DAM         ← digital asset management
   EMP-EXP     ← employee engagement / well-being surveys
   HRSD        ← HR requests, HR services
   ITSM        ← IT management, IT service desk
   IWMS        ← facilities requests
   MA          ← client campaigns, FB ads, marketing activities, campaign planning
   ONBOARDING  ← new employee onboarding, Farfetch onboarding plan
   SPM         ← project portfolio management
   ```

3. Generate the flat table — one row per unique template — with `Domain` filled in only where MATCH has an entry. See [build_m_domains.mjs](build_m_domains.mjs).

---

## Adapting to Airtable

### Step 1–3 will differ — Airtable is NOT Next.js

Investigated `https://www.airtable.com/templates`:

- The page is a thin SPA shell that bootstraps `https://static.airtable.com/esbuild/.../run_explore.js`.
- `window.initData` exists but only carries CSRF token + feature flags — no catalog.
- No `__NEXT_DATA__`, no inline JSON template payload.
- Common API paths probed (all 404): `/v0/templates`, `/api/templates`, `/templates.json`, `/v0/explore/templates`, `/api/explore/templates`.

So we **don't** have a clean equivalent of monday's `allSolutions` blob from a server-rendered page. Options to investigate in a follow-up session:

- **Open DevTools → Network on the live page** and capture the XHR/fetch that hydrates the template grid. That request is the real catalog endpoint; replay it with `curl`. This is the highest-likelihood path.
- **Inspect `run_explore.js`** for the path string used to fetch the catalog. The bundle is large but greppable for `template` / `explore`.
- **Try a sitemap**: `https://www.airtable.com/sitemap.xml` or `/sitemap_index.xml` often lists every template URL. URLs alone wouldn't give descriptions, but combined with a fetch per template page (scraping the H1 + paragraph) it could work — slower but viable.
- **Check the public schema-API**: `https://www.airtable.com/api/meta/...` — no public docs but worth probing.

Once a JSON shape is in hand, identify the analogues of:

| Monday field                          | What we need for Airtable                                                       |
| ---                                   | ---                                                                             |
| `app_feature_reference_id`            | stable id used in the template URL                                              |
| `name`                                | template title                                                                  |
| `data.shortDescription`               | card-subtitle / overview                                                        |
| `data.description`                    | paragraph under the H1 on the template detail page                              |
| `data.categories[]`                   | category slug(s) the template belongs to                                        |
| URL pattern                           | recover from a known template (currently `https://www.airtable.com/templates/<slug>` with no category, e.g. `https://www.airtable.com/templates/marketing-campaign-tracking`) |
| `allCategories`                       | category list with display label + slug                                         |
| `templateCenter.category.title.<>`    | per-category headline                                                           |
| `templateCenter.category.description` | per-category overview paragraph                                                 |

If the per-category title/overview isn't in the API payload, fetch one category page per category (e.g. `https://www.airtable.com/templates/c/marketing`) and grep the H1 + paragraph. There are ~20 categories — cheap.

### Steps 4–9 — reuse the monday scripts almost verbatim

Copy [build_m_templates.mjs](build_m_templates.mjs) → `build_a_templates.mjs`, copy [build_m_domains.mjs](build_m_domains.mjs) → `build_a_domains.mjs`. The only edits needed are:

1. Input JSON path (`c:/tmp/airtable_data.json` instead of `c:/tmp/next_data.json`).
2. Field accessors — wherever the code reads `s.app_feature_reference_id`, `s.name`, `s.data.shortDescription`, `s.data.description`, `s.data.categories`, point those at the Airtable equivalents identified above.
3. `urlFor()` — switch to Airtable's URL pattern (likely `https://www.airtable.com/templates/<slug>` with no numeric id; if Airtable templates have stable slugs in the JSON, use them directly instead of slugifying the title).
4. Category translations — if Airtable's catalog payload includes per-category title/description text, plumb it through; otherwise fall back to the category slug as the header.
5. Output paths: `a_templates.md` and `a_domains.md`.
6. **Re-validate the URL pattern** by HEAD-checking all of them before generating the markdown. The slug rule for Airtable is unverified — confirm against several known live templates before committing.

### Step 5 (domain matching) — same MATCH-table approach, fresh decisions

The `MATCH` table from monday is **not transferable** — Airtable's template set is different (Airtable leans heavier into "ops trackers" and "vertical industry" templates; monday leans into project management and HR/sales workflows). Build a fresh hand-crafted MATCH for Airtable using the same point-solution-market test against the 100-domain live catalog.

Decision rule: a match exists only if you can name three independent point-solution vendors whose flagship product is the domain in question. Generic boards, planning templates, and industry-flavored project trackers do **not** match — they go into the delta. The delta is the deliverable.

After generating `a_domains.md`, print the same summary the monday script prints: list every match grouped by domain, then list every unmatched template. The unmatched list is what the user will scan to decide whether new domains should be added to the catalog.

---

## Hard rules carried over from CLAUDE.md / domain-map-analyst skill

These apply identically when working with Airtable data:

1. **Never `cd` away from the project root before invoking `semantius`** — it switches tenants silently. Always run loaders from `c:/dev/domain-map` with absolute paths.
2. **No memory writes.** This document, and any per-vendor notes, lives in committed files only. See [CLAUDE.md](CLAUDE.md).
3. **No catalog writes from this workflow.** The delta file is a research artifact only — do not insert anything into `domains`, `solutions`, or any `domain_map` table based on what monday/airtable templates suggest. Surface the delta to the user; let them decide what (if anything) to add to the catalog via the normal domain-map-analyst skill workflow.
4. **Conservative matching.** When in doubt, leave `Domain` blank. The reviewer's job is to look at the delta and decide; pre-classifying weak matches as confirmed pollutes the analytical value.

---

## Files produced for monday (use as references)

- [m_templates.md](m_templates.md) — grouped catalog
- [m_domains.md](m_domains.md) — flat delta table (21/84 matched)
- [build_m_templates.mjs](build_m_templates.mjs) — generator for the grouped file
- [build_m_domains.mjs](build_m_domains.mjs) — generator for the delta file (also contains the hand-crafted MATCH table)
