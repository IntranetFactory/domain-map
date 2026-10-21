# INTRANET-GOV (Intranet Content Operations & Governance) — Phase 0 Research

Date: 2026-06-10. Read-only vendor-and-entity research for a proposed white-space domain: a platform-agnostic planning / inventory / ownership / lifecycle overlay for EXISTING intranets (the internal-audience twin of WEB-CONTOPS, id 128). Not an intranet platform; it governs content other platforms own.

## 1. White-space verdict

**No pure-play vendor occupies this market. Confidence: high.** Extensive search surfaces intranet governance only as (a) a consulting/advisory practice (Prescient Digital, Habanero, ThoughtFarmer guides, 2toLead), (b) a manual spreadsheet exercise (NN/g, Habanero, and AvePoint all recommend Excel/Sheets content inventories), (c) a feature bundled inside the intranet platform itself (Simpplr, Staffbase, Happeo, Interact all publish governance frameworks for their own product), or (d) a platform-native lifecycle control bound to one stack (Microsoft SharePoint Advanced Management's inactive-site policies with a "Certify site" recertification button). Nobody sells a flagship product whose job is a cross-platform, page-level content inventory + accountable-ownership register + recertification loop spanning WordPress, SharePoint+Viva, Staffbase, Simpplr at once. The "ghost town" pain is universally named but the cure is sold as services or as a single-platform feature, never as a standalone agnostic governance system of record. This validates the owner's hypothesis: the demand is real and articulated, the dedicated tool is absent.

## 2. Adjacent partial-coverage vendors

| Vendor | What it does | How it partially touches intranet content governance | The gap (why not a clean primary) | Real neighbor domain |
|---|---|---|---|---|
| Siteimprove | Web quality/accessibility/SEO digital-governance crawler | Can crawl authenticated intranets; inventories pages, scores quality/accessibility, maps issues to owners | Built for external web; intranet auth setup takes days/weeks, no ownership-attestation/recertification workflow, no content register as system of record | WEB-CONTOPS |
| Acquia Optimize (Monsido) | Web governance: page/asset inventory, broken links, typos, accessibility, readability | Same crawl-and-inventory engine can be pointed at internal sites; produces a page inventory | Web-first; no owner-attestation loop, no cadence-driven recertification, no heterogeneous-platform connectors | WEB-CONTOPS |
| Powell Software (Powell Governance) | M365/SharePoint/Teams site governance, templates, lifecycle, sprawl control | Lists content governance (metadata, ownership, review cycles, archival) as a pillar | SharePoint/Teams-bound; governs sites/templates not page-level content across non-Microsoft intranets | COLLAB-GOV |
| Orchestry | M365 provisioning, lifecycle, archival, Workspace Review | Workspace Review recalibrates sites; archival/renewal policies; sprawl detection | Container/workspace grain, M365-only; no editorial page ownership or attestation register | COLLAB-GOV |
| AvePoint (incl. tyGraph) | M365 governance, backup, migration + tyGraph SharePoint/intranet analytics | tyGraph reports SharePoint page/intranet activity; AvePoint governs M365 broadly | Analytics + container governance, M365-bound; reports usage, does not run an ownership/recertification workflow | COLLAB-GOV |
| CardioLog Analytics (Intlock) | SharePoint/M365 usage analytics, heatmaps, governance reporting | Surfaces stale/low-engagement pages and gives content owners optimization signals | SharePoint/M365-only analytics; no accountable-owner register, no attestation lifecycle, no source connectors | COLLAB-GOV / INTRANET |
| Microsoft SharePoint Advanced Management | Inactive-site detection, owner notification, "Certify site" recertification | Closest native analog to the recertification loop; emails owners, requires certification | SharePoint Online only, site grain (not page/content), no cross-platform inventory; a platform feature not a product | (native to INTRANET stack) |
| ClearPeople Atlas | Intelligent knowledge platform on M365 with embedded lifecycle/auditability (ConneX) | Lifecycle control and governed knowledge layer with traceability | A knowledge/intranet PLATFORM on M365, not an agnostic overlay; you adopt Atlas, you don't govern your existing intranet | INTRANET |
| Content Workflow by Bynder (ex-GatherContent) | Editorial content-ops: brief-to-approval workflow, templates | Editorial workflow and review steps mirror our lifecycle capability | Authoring/production workflow for new content, not inventory/ownership/recertification of existing intranet content | WEB-CONTOPS |
| Hyperfish (LiveTiles) | Profile/directory completeness automation for M365 | Tangential: attestation-style nudges to keep data current | Governs people-profile fields, not content pages | INTRANET (out of scope) |

Strongest honest `coverage_level='partial'` candidates: Siteimprove, Acquia Optimize (cross-platform crawl-and-inventory), Powell Governance, Orchestry/AvePoint (governance-suite overlap), and SharePoint Advanced Management (the native recertification analog).

## 3. Entity surface

| Proposed entity (snake_case_plural) | Role | entity_type | Justification | Overlap check vs neighbors |
|---|---|---|---|---|
| `intranet_content_inventory_items` | master | operational_record | The crawled/registered map of pages, hubs, spaces, libraries, forms across connected intranets | GENUINELY NEW. INTRANET masters live published pages; this masters a cross-platform governance inventory record. No neighbor owns it |
| `content_ownership_assignments` | master | junction | Inventory item to accountable owner + backup + review cadence; the accountability spine | NEW. COLLAB-GOV owns permissions/site-owner data, not editorial content-owner accountability at page grain |
| `content_review_attestations` | master | operational_workflow | The recertification loop: due to attested / flagged-stale to remediated / archived | NEW. SharePoint AM "Certify site" is the closest analog but site-grain, single-platform, not a stored cross-platform attestation record |
| `connected_intranets` | master | catalog | Registry of source intranets under governance (the connector targets) | NEW. This connector registry is intrinsic to the agnostic premise; no neighbor needs it |
| `content_health_scores` | computed | computed | Derived freshness/quality/ownership-coverage scores per item | Computed from the above; CardioLog/Siteimprove compute analogous scores but not over this register |
| `intranet_improvement_items` | embed | operational_record | Improvement backlog; thin local record that defers to WORK-MGMT for execution | EMBED of WORK-MGMT (id 135), do not re-master tasks |
| `users` | consume | (built-in) | Owners, reviewers, attesters | CONSUME platform built-in |

**Unique masters: 4** (`intranet_content_inventory_items`, `content_ownership_assignments`, `content_review_attestations`, `connected_intranets`). None is mastered by INTRANET, COLLAB-GOV, or WEB-CONTOPS. The accountability + cross-platform-inventory + attestation triad is the defensible core; the domain does NOT collapse to a starter kit.

## 4. Capabilities (internal-audience adaptation of WEB-CONTOPS; SEO dropped, ownership-attestation and source-connector added)

- `INTGOV-INV` Content inventory & mapping: discover and register pages, hubs, spaces, libraries, and forms across connected intranets into a single map.
- `INTGOV-OWN` Ownership accountability: assign every inventory item an accountable owner and backup with a defined review cadence.
- `INTGOV-ATTEST` Ownership attestation & recertification: periodic owner attestation that content is current, with flag-stale, remediate, or archive outcomes.
- `INTGOV-LIFE` Content lifecycle & review: drive content from live through review-due to archived per policy.
- `INTGOV-QUAL` Content quality scanning: detect stale, broken-link, duplicate, and low-readability content for the internal audience.
- `INTGOV-A11Y` Accessibility governance: scan internal content against WCAG and surface owner-mapped issues.
- `INTGOV-PLAN` Improvement planning & backlog: maintain a prioritized improvement backlog that embeds Work Management for execution.
- `INTGOV-CONNECT` Source connectors: connect and crawl heterogeneous intranet platforms (SharePoint+Viva, Staffbase, Simpplr, WordPress) as governed sources.

## 5. Modularization hypothesis

Likely **2 modules** (the domain is thin but the connector/inventory plane and the accountability/lifecycle plane are operationally distinct):

- **Module A — Inventory & Sources:** `connected_intranets`, `intranet_content_inventory_items`, `content_health_scores`; capabilities `INTGOV-CONNECT`, `INTGOV-INV`, `INTGOV-QUAL`, `INTGOV-A11Y`.
- **Module B — Ownership, Lifecycle & Planning:** `content_ownership_assignments`, `content_review_attestations`, `intranet_improvement_items` (embedded WORK-MGMT); capabilities `INTGOV-OWN`, `INTGOV-ATTEST`, `INTGOV-LIFE`, `INTGOV-PLAN`.

A single-module build is defensible too; 2 modules is the better fit because connectors/inventory can ship and demo before the accountability layer is configured.

## 6. Domain metadata estimate

- `crud_percentage`: **70** (heavy CRUD on ownership assignments, attestations, inventory annotations; some computed/scan automation).
- `min_org_size`: **30 m <2500** (the ghost-town problem becomes acute once content volume and owner turnover exceed manual-spreadsheet tractability; mid-market and up).
- `cost_band`: **$$** (governance overlay, priced below the intranet platform itself; comparable to Siteimprove/Powell governance tiers).
- `certification_required`: **false**.
- `usa_market_size_usd_m`: **120** (ROUGH ESTIMATE; white-space, no direct market data). Triangulated as a small slice of adjacent markets: global intranet software ~USD 15-20B in 2025 and digital-workplace ~USD 40B+; web content-governance tools (Siteimprove/Acquia/Conductor class) are a low-single-digit-percent attach to their platform spend. Applying a comparable low-single-digit governance-attach rate to the US intranet/digital-workplace installed base, net of the M365-native free SAM substitution, yields a nascent serviceable US figure on the order of USD 100-150M. Treat as an order-of-magnitude placeholder, not a sourced number.
- `market_size_source_year`: **2025** (adjacent-market basis: Market Research Future / Data Bridge intranet-software sizing, 2025).
- `business_logic`: Cures the intranet "ghost town" by giving organizations a platform-agnostic system of record for what content exists, who is accountable for it, and whether it has been recertified, without forcing a rip-and-replace of their existing intranet(s).
