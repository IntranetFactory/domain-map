# Services Procurement / SOW: verdict + design (FOR REVIEW, NOTHING LOADED)

Date: 2026-06-19. Research + design only. No catalog writes. Grounding: live audit (below)
+ `.tmp_deploy/SOW-phase0-2026-06-19.md` (Zivio, Globality, SAP Fieldglass, Beeline, Workday
VNDLY, Coupa, Ivalua). The companion gate is `audits/SVCS-PROC/q-SVCS-PROC.md`.

---

## 1. Live audit: nothing already owns this market

Query (the task's audit filter) returned only unrelated matches: `audit_engagements`,
`candidate_engagements`, `creative_deliverables`, `contract_milestones`,
`project_billing_milestones`, `client_engagements`, `outside_counsel_engagements`, etc. None
is a buyer-side SOW / services-engagement master. So:

- **No `statements_of_work`, `services_engagements`, `sow_milestones`, `service_deliverables`,
  or `milestone_invoices` exists today.** The market is unowned.
- **Adjacent masters that DO exist and will be consumed/embedded, not re-mastered:**
  - `suppliers` (id 206) - mastered by **SRM** (domain 28); consumed by S2P (27), and ~10 others.
  - `legal_contracts` (id 66) - mastered by **CLM** (domain 26). The SOW-as-contract-document.
  - `rate_cards` (id 189) - mastered by **CWM** (domain 64).
  - `contract_milestones` (id 1054) - a CLM obligation-side object, NOT the SOW delivery milestone.
- **The CWM Phase-B draft (`.tmp_deploy/CWM-phaseB-draft-2026-06-19.md`, NOT loaded) already
  proposes "Services Procurement / SOW" as CWM module #3** with `statements_of_work`,
  `sow_milestones`, `sow_deliverables` (all `optional`, channel-bound), plus renaming entity 187
  `pm_work_orders` -> `sow_work_orders`. That draft is the "module inside CWM" option. This
  analysis is the decision on whether SOW should instead be its own domain. The two are mutually
  exclusive on the SOW masters: whoever masters them, the other consumes/embeds.

## 2. Point-solution test (Rule #2): FAILS the strict >=3 pure-play bar

From Phase 0:

| Vendor | Pure-play? | Evidence |
|---|---|---|
| **Zivio** | YES (genuine pure-play) | "AI-powered Services Procurement System" for SOW-contracted outsourced services; explicit anti-VMS: "You will no longer have to force your SOW management processes into a VMS designed for contingent workforce." |
| **Globality** | NEAR (disqualified as strict 3rd) | Autonomous services-sourcing flagship, but now markets "AI-Driven Savings For All Enterprise Spend" across all categories, not SOW-only. |
| (third) | NONE | Every other vendor bundles: Fieldglass/Beeline/VNDLY/Magnit/SimplifyVMS are VMS; Coupa/Ivalua/Jaggaer/Ariba are S2P. AtriumWORKS etc. are MSP managed services, not software. |

So: **1 pure-play + 1 near-pure-play + a wall of bundlers.** The strict Rule #2 bar
(>=3 independent flagship vendors) is NOT met. By the letter of Rule #2 this argues for a
**cross-cutting module**, not an `established_market` domain.

BUT the shape is the textbook `emerging_market` signal under Rule #2: a real, named pure-play
that owns its own masters and explicitly rejects being a VMS/S2P sub-feature, with only thin
/`partial` independent `primary` coverage. `emerging_market` is exactly "owns its own masters
but only `partial` vendor coverage; surface the candidate rather than defaulting it." That is
this market precisely.

## 3. Verdict: genuine 50/50 -> present BOTH at the gate

This is the dual-modeling gray zone the user described, and it does NOT resolve cleanly to one
answer. The honest framing for the q-file gate is two coherent options, with the trade-off
surfaced rather than hidden:

- **Option A - own `emerging_market` domain `SVCS-PROC` (Services Procurement).** Master the SOW
  cluster here; CWM and S2P each `embedded_master`/`consume` it. Justified by Zivio's existence
  and anti-VMS stance: the pure-play says SOW is its OWN thing, not a VMS tab. `emerging_market`
  is the kind built for exactly "one real pure-play, thin coverage." Cost: a near-empty market
  (one pure-play, one near-pure-play) carried as a full domain with its own skill and modules.
- **Option B - cross-cutting module, no new domain.** SOW lives as a module mastered once and
  hosted on CWM (primary) + S2P via `domain_module_host_domains`; CLM masters the contract, SRM
  the supplier. Justified by the bundler reality (everyone but Zivio ships SOW as a tab) and by
  the fact CWM has already drafted exactly this. Cost: it under-weights the one vendor (Zivio)
  whose whole thesis is that SOW is NOT a VMS module.

**Lean (stated honestly, not forced):** Option A (own `emerging_market` domain) edges it, because
the catalog ALREADY honors the same shape elsewhere (a single named pure-play that rejects the
incumbent suite is precisely what `emerging_market` exists to record), and because hosting the
SOW masters on CWM bakes in the "SOW is contingent-workforce" framing that Zivio exists to deny.
The point-solution test failing only rules out `established_market`, not `emerging_market`. But
Option B is fully defensible and is the lower-structure choice; the user decides. Either way the
SOW masters are mastered ONCE and the other side consumes - the embed/consume map below is
identical under both options; only the home of the `master` rows differs.

## 4. Proposed name + code

- **Name:** `Services Procurement` (buyer-side; the market term Spend Matters/Zivio use).
- **Code:** `SVCS-PROC`.
- Rationale: "SOW" names the artifact, not the market; "Services Procurement" is the category
  label the pure-play (Zivio: "Services Procurement System") and the bundler modules
  (SAP Fieldglass Services Procurement, Coupa Services Procurement) all use. `SVCS-PROC` reads
  cleanly and does not collide with `S2P` (Source-to-Pay) or `SRM`. Alternative `SOW-MGMT` is
  available if the user prefers the artifact framing; `SVCS-PROC` is the recommendation.

## 5. Rule #8 domain metadata (Option A only; a module needs none)

| Field | Proposed value | Basis |
|---|---|---|
| `crud_percentage` | 80 | Forms + state workflow (SOW lifecycle, milestone acceptance, change-order approval, milestone-invoice gating) is JsonLogic-declarable; the residual is outcome/deliverable evaluation and AI sourcing match (Globality), not declarable. |
| `business_logic` | "Deliverable and milestone acceptance scoring, services-bid evaluation and AI supplier match, and change-order impact assessment sit beyond the declarable CRUD + state-workflow slice." | crud_percentage < 95, so required. |
| `min_org_size` | `30 m <2500` | Buyer-side services procurement at SOW scale is a mid-market-and-up concern; below that, services spend is handled in AP/PO. |
| `cost_band` | `$$` ($25k-$100k) | Thin standalone market; Zivio/Globality are mid-five-figure platforms for a 500-user buyer, well below VMS/S2P suite pricing. |
| `certification_required` | false | No statutory product certification; commercial buyer software. |
| `usa_market_size_usd_m` | 600 | TRIANGULATED, not sourced: services-procurement-specific software (standalone slice, excluding the VMS/S2P suites that bundle it) is a small fraction of the ~$3-4B US VMS/services-procurement total; the pure-play standalone slice is order-of-hundreds-of-millions. FLAG to user: this is an estimate to be replaced with a Gartner/Spend-Matters figure before load. |
| `market_size_source_year` | 2025 | Paired with the estimate; replace on sourcing. |

(If the user picks Option B, none of this applies: a cross-cutting module carries no domain
metadata; it homes on CWM, whose metadata already exists.)

## 6. Module split (Option A) - Rule #14

Services Procurement has 3 natural capabilities (sourcing/bidding; SOW authoring + engagement
execution; milestone-based settlement), so Rule #14 wants >=2 full modules. Proposed 2 modules:

| Module (proposed code) | Masters | Realizes |
|---|---|---|
| **Services Sourcing & Engagement** (`SVCS-PROC-ENGAGEMENT`) | `statements_of_work` (master, required), `services_engagements` (master, required), `services_proposals` (master, optional), `sow_change_orders` (master, optional) | SOW authoring, bid/proposal intake, engagement execution, change control |
| **Milestone Delivery & Settlement** (`SVCS-PROC-SETTLEMENT`) | `sow_milestones` (master, required), `service_deliverables` (master, optional), `milestone_invoices` (master, required), `service_acceptances` (master, optional) | Milestone tracking, deliverable acceptance, milestone-based invoicing |

Under Option B there is ONE cross-cutting module (`SVCS-PROC` or `CWM-SOW-MGMT`) carrying the
same master set, hosted on CWM + S2P.

## 7. Masters: mastered vs consumed

**MASTERED by Services Procurement (Option A) / by the SOW module (Option B):**

| data_object | role | necessity | Rule #16 basis |
|---|---|---|---|
| `statements_of_work` | master | required | D: the headline noun; every surveyed vendor masters it; the market does not exist without it. |
| `services_engagements` | master | required | D: the firm-level engagement spine milestones/invoices bind to; Core (>=3 vendors). |
| `sow_milestones` | master | required | D within this market: milestone-based settlement is the SOW payment mechanic; Core. |
| `milestone_invoices` | master | required | D: settlement record; Core (Zivio, Fieldglass, Beeline, Coupa, Ivalua). |
| `service_deliverables` | master | optional | C: pure-plays partial, may collapse into `sow_milestones` at modeling time. |
| `services_proposals` (bids) | master | optional | C: present everywhere but some buyers run SOW off a pre-awarded MSA without a bid round. |
| `sow_change_orders` | master | optional | C: Fieldglass/Beeline/VNDLY/Coupa/Ivalua master it; Globality does not; not every engagement amends. |
| `service_acceptances` | master | optional | C: bundlers model formal acceptance; Globality does not; some buyers accept implicitly on invoice. |

**CONSUMED / embedded from other domains (never re-mastered here):**

| data_object | mastered by | how Services Procurement uses it |
|---|---|---|
| `suppliers` (206) | **SRM** (28) | `consume` - the services firm IS a supplier; SOW references it, adds only engagement-scoped scorecard data. Phase 0: pure-plays consume the buyer's supplier master. |
| `legal_contracts` (66) | **CLM** (26) | `consume` - the SOW/MSA contract document is CLM's; Services Procurement references the contract id, does not own the clause/obligation surface. Phase 0: "reference, do not master." |
| `rate_cards` (189) | **CWM** (64) | `consume` (optional) - only when a tenant prices SOW work on a rate card; pure-plays barely surface rate cards (outcome-based). Common-not-Core. |

No new `regulations`: services procurement is lightly regulated. The one real risk
(SOW-as-disguised-staff-augmentation / co-employment) is an attribute/classification on the
engagement, not a compliance table, and the worker-classification masters already live in CWM.

## 8. Embed / consume relationships (the dual-modeling map) - identical under A and B

Whoever masters the SOW cluster, the cross-domain wiring is the same; only the location of the
`master` rows differs (in `SVCS-PROC` under A, in the cross-cutting module's primary host CWM
under B). The map:

```
                 CLM (26) ── master ──> legal_contracts (66)
                    ^ consume (the SOW contract document)
                    |
 SRM (28) ─ master ─> suppliers (206)
                    ^ consume (the services firm)
                    |
            ┌───────┴────────────────────────────────┐
            │   SOW master cluster                    │
            │   statements_of_work, services_         │   <- mastered in SVCS-PROC (A)
            │   engagements, sow_milestones,          │      OR in the cross-cutting
            │   milestone_invoices, service_          │      module hosted on CWM+S2P (B)
            │   deliverables, services_proposals,     │
            │   sow_change_orders, service_acceptances│
            └───────┬───────────────────────┬─────────┘
                    │                        │
       embedded_master / consume    embedded_master / consume
                    │                        │
            CWM (64) ◄─┘                      └─► S2P (27)
   "SOW is an extended-workforce      "S2P sources and pays for the
    engagement channel" (the          services; the SOW is the spend
    bundler-VMS framing)              object it pays against"
```

- **CWM (64)** carries the SOW cluster as `embedded_master` (Option B: it IS the primary host
  and master) or `consume` (Option A: CWM links SOW engagements to its contingent-workforce
  spine `contingent_workers`). Either way CWM does NOT re-master the SOW nouns; the
  single-master rule holds.
- **S2P (27)** `consume`s the SOW cluster: S2P sources (RFP/PO) and pays (invoice/payment) for
  services; the SOW/engagement is the spend object it settles against. S2P does not own SOW
  execution (milestones/deliverables/acceptance) - that is Services Procurement's.
- **CLM (26)** masters `legal_contracts`; Services Procurement consumes it (the SOW document).
- **SRM (28)** masters `suppliers`; Services Procurement consumes it (the services firm).
- **RFP/sourcing** homes in **S2P** (the parallel task), not here; Services Procurement picks up
  AFTER award, at SOW authoring. `services_proposals` here is the bid attached to a specific SOW,
  not the open RFP event (that is S2P's).

## 9. Necessity (Rule #16) summary

All four `required` masters are case-D (workflow-universal within this market). The four
`optional` masters are case-C (>=1 of the 7 surveyed vendors does not master them and the
workflow degrades gracefully). No case-B statute-bound masters: the SOW market has no
statute-prefixed entities (unlike CWM's worker-classification cluster). The consumed rows
(`suppliers`, `legal_contracts`, `rate_cards`) are `optional` per Rule #16-A (a smaller buyer can
inline the supplier/contract reference).

## 10. Capabilities + skill (Option A)

- Capabilities (>=3, satisfies Rule #14 2-module floor): `Services Sourcing & Bidding`,
  `SOW Authoring & Engagement`, `Milestone & Deliverable Settlement`, `Services Supplier
  Performance` (the scorecard slice).
- One `skill_type='domain'` skill `svcs-proc` (Rule #17), deriving its toolset from the two
  modules' `domain_module_tools`. Trigger keywords: statement of work, SOW, services procurement,
  deliverable, milestone invoice, services engagement, outcome-based services.

Under Option B the cross-cutting module derives no skill of its own; it ships under CWM's domain
skill (or S2P's when installed there), per Rule #17/#19.

## 11. Necessity of the domain itself (Rule #16 sense / Rule #2 honesty)

Is SVCS-PROC a NECESSARY domain row? Marginally. The strict point-solution test fails, so the
catalog is NOT obligated to mint it as `established_market`. The case for minting it as
`emerging_market` rests entirely on Zivio (one real pure-play, explicit anti-VMS) + Globality
(near-pure-play). That is enough to SURFACE the candidate (which is all `emerging_market`
requires), but it is the user's call whether the catalog records a one-pure-play market as its
own domain or folds it into CWM+S2P as a cross-cutting module. Hence the q-file leads with this
exact gate.
