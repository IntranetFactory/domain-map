# Embedded-master / standalone-vs-holistic backfill — Workspace cluster

Cluster: DXP, WSC, COLLAB-GOV, INTRANET, CONV-AI, CCAAS, ESIGN (7 domains).

Schema in play (per SKILL.md Phase 2 / Phase 4):
- `role ∈ {master, embedded_master, contributor, consumer, derived}`
- `necessity ∈ {required, optional}`
- Signal 1 = `count(role IN ('master','embedded_master') AND necessity='required')` per data_object.

Domain IDs:
- DXP=77, WSC=75, COLLAB-GOV=127, INTRANET=126, CONV-AI=34, CCAAS=98, ESIGN=94.

Canonical masters confirmed for upstream records this cluster touches:
- `employees` (id=31) — HCM, PAYROLL, IGA, MDM (multi-master).
- `customers` (id=97) — CRM, CSM, SUB-MGMT, CDP, MDM.
- `contacts` (id=98) — CRM.
- `documents` (id=429) — ECM.
- `policies` (id=285) — GRC.
- `products` (id=384) — B2C-COMM.

---

## Section 1 — DXP (id=77)

DXP is a customer-facing point solution (Sitecore, Adobe Experience Manager, Optimizely, Acquia). It runs marketing/web/commerce experiences and *holds local copies* of customer/contact identity, marketing content/assets, and product catalog snippets — but in a holistic deployment defers to CRM/CDP for customers, CRM for contacts, B2C-COMM for products, ECM for documents/assets, and HCM for any internal staff users.

Existing rows are all `master + required` on Phase-B-Lite scaffolded objects (`web_pages`, `content_components`, `experiences`, `personalization_rules`, `ab_tests`, `segments_dxp`, `journey_steps`). Those stay as canonical DXP masters — no domain else owns the experience-platform-side personalization/page/test surface.

### Existing rows — keep as-is (canonical masters)

| id | data_object | role | necessity | rationale |
|---|---|---|---|---|
| 690 | web_pages | master | required | DXP is the canonical owner; no other domain masters the customer-facing rendered page lifecycle. |
| 691 | content_components | master | required | DXP-owned reusable content blocks. ECM masters underlying source documents, DXP masters the experience-layer composition. |
| 692 | experiences | master | required | DXP canonical. |
| 693 | personalization_rules | master | required | DXP canonical (orchestration logic lives only here). |
| 694 | ab_tests | master | required | DXP canonical (experimentation engine). |
| 695 | segments_dxp | master | required | DXP-side segment. Note: distinct from `segments_cdp` if/when CDP segments land — name preserves the separation. |
| 696 | journey_steps | master | required | DXP-side journey orchestration. |

### Proposed NEW rows for DXP

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| customers (id=97) | consumer | required | DXP rendering needs customer identity to personalize. Canonical master is CRM/CDP. NOT embedded_master — DXP doesn't write a full customer record; it reads the resolved profile from CDP/CRM. Some DXPs do hold a "lightweight visitor" record but it's anonymous-to-known resolution, modeled as CDP master rather than DXP duplication. |
| contacts (id=98) | consumer | required | Same shape as customers — DXP reads CRM contact identity for known-user personalization. |
| products (id=384) | consumer | required | DXP renders product cards/listings; product master is B2C-COMM (or PIM if loaded). |
| documents (id=429) | embedded_master | optional | DXP holds its own asset/document copies in the DAM/asset-library slice (Sitecore Media Library, AEM Assets). Canonical master is ECM; many DXP deployments skip ECM integration entirely (assets live only in DXP). → `embedded_master + optional`. Demotion path: "DXP local-masters assets when no ECM is deployed; reads from ECM when present." |
| employees (id=31) | consumer | optional | Only relevant for internal-portal DXP deployments; pure customer-facing DXP doesn't touch the employee record. → optional. |

### Marketing content / campaigns

`marketing_content` doesn't exist as a data_object yet — see Section 6.

---

## Section 2 — WSC (id=75) — Workstream Collaboration

WSC = Slack, Microsoft Teams, Google Chat, Mattermost. Point solution per the SKILL.md test: standalone Slack is a coherent product. Workspaces/channels/messages/meetings are WSC-canonical (no other domain masters them). Users in WSC are always embedded — Slack holds its own user table standalone, but defers to IGA/HCM in a holistic deployment.

WSC currently has **zero `domain_data_objects` rows in the catalog** — its data_objects haven't been loaded. This is a Phase-B gap. Most rows below are blocked on Section 6 prerequisites.

### Proposed NEW rows for WSC (blocked on missing data_objects)

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| workspaces | master | required | WSC canonical. Slack workspace / Teams tenant / Mattermost team are the top-level container; no other domain masters it. **Blocked — `workspaces` data_object missing (Section 6).** |
| channels | master | required | WSC canonical (channel = conversation topology). **Blocked — missing.** |
| messages | master | required | WSC canonical (the message log is what WSC *is*). **Blocked — missing.** |
| meetings | master | required | Teams/Slack Huddles/Google Meet — when WSC is the meeting platform. Some deployments use a separate meeting tool (Zoom) and WSC only chats; that case → optional or consumer. Default `master + required` here. **Blocked — missing.** |
| recordings | master | optional | Meeting recordings; only present when meetings master is. **Blocked — missing.** |
| users (or user_accounts) | embedded_master | required | Slack/Teams hold a full local user record (display name, email, status, presence). Canonical is IGA (`employees` id=31 acts as identity record at HCM/IGA/MDM). When IGA/SCIM is wired, WSC users are provisioned from IGA; standalone Slack maintains it. → `embedded_master + required`. **Blocked — `users` data_object missing as a distinct entity. Could alternatively reference `employees` (id=31).** |
| employees (id=31) | embedded_master | required | If we reuse `employees` as the user identity record (catalog convention so far), WSC embedded-masters it. Demotion path: "WSC local-masters user accounts standalone; reads from IGA/HCM in holistic deployments." |
| documents (id=429) | consumer | optional | WSC surfaces shared files but ECM is canonical. Some deployments use WSC as ad-hoc file share without ECM → could be `embedded_master + optional`. Defaulting to `consumer + optional` since the file is usually a pointer/preview, not a WSC-mastered copy. |

**Recommendation:** Decide whether the catalog uses `users` as a distinct data_object from `employees`. If single-entity convention (employees-as-identity), use `employees` everywhere. Otherwise create `users` first.

---

## Section 3 — COLLAB-GOV (id=127) — Collaboration Governance

Collaboration governance is a leadership-layer / aggregation-tier domain per the SKILL.md rule (line 423: "Leadership-layer / aggregation-tier domains often master nothing of their own"). It reads workspaces/channels/users/policies/messages across WSC, ECM, IGA, GRC, and DLP and publishes derived governance signals (orphaned channels, external-share risk, retention violations, ungoverned guests).

COLLAB-GOV has **zero rows in catalog today**. All proposed rows are `derived` or `consumer` — no masters, no embedded_masters.

### Proposed NEW rows for COLLAB-GOV

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| workspaces | derived | required | Aggregates orphan/owner/external-guest risk across WSC workspaces. Republishes `workspace.governance_risk` signal. **Blocked — missing.** |
| channels | derived | required | Same shape — derives channel ownership/external-share/retention findings. **Blocked — missing.** |
| users (or employees id=31) | consumer | required | Reads IGA/HCM identity to attribute risk to a person; doesn't republish a derived user record itself. → consumer, not derived. |
| messages | derived | optional | Derives DLP/retention violations from message content. Optional because some COLLAB-GOV products skip content scanning and only govern metadata. **Blocked — missing.** |
| policies (id=285) | consumer | required | GRC masters policies; COLLAB-GOV reads them to enforce. |
| documents (id=429) | derived | required | Sharing-risk findings on shared files (orphaned shares, external-link-aged-out, sensitive-label leakage). ECM is master, COLLAB-GOV republishes governance signal. |

**Note:** No `master` rows for COLLAB-GOV — correct per leadership-layer rule. Don't scaffold synthetic data_objects to give it ownership.

---

## Section 4 — INTRANET (id=126) — Employee Communications & Intranet

INTRANET (SharePoint, Staffbase, Simpplr, LumApps, Workvivo) is *partially* leadership-layer (it aggregates internal-comms reach/engagement metrics across channels) and *partially* a point solution that masters its own content surface: announcements, news_posts, employee-facing intranet sites/pages, communities, broadcast messages.

For the *aggregation* slice → `derived` on `employees` (engagement readership), `derived` on `channels` (cross-channel reach). For the *content* slice → `master` on intranet-native pages/announcements/news (but those data_objects don't exist yet).

INTRANET has **zero rows in catalog**.

### Proposed NEW rows for INTRANET

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| announcements | master | required | INTRANET-native lifecycle (draft → publish → expire). **Blocked — missing.** |
| news_posts | master | required | Same. **Blocked — missing.** |
| sites / intranet_sites | master | required | Top-level workspace container in SharePoint/Simpplr. **Blocked — missing.** |
| pages (intranet pages, not DXP web_pages) | master | required | Distinguished from DXP `web_pages` by audience (internal vs customer). **Blocked — missing; recommend `intranet_pages` to avoid name collision with `web_pages`.** |
| communities | master | required | Yammer/Viva/Workvivo community surface. **Blocked — missing.** |
| broadcast_messages | master | required | Mass internal broadcasts (CEO email-via-intranet). **Blocked — missing.** |
| employees (id=31) | embedded_master | optional | Intranets hold a local user/employee directory standalone (e.g., legacy SharePoint user info lists, Simpplr profiles). When HCM/HRSD is integrated, INTRANET reads from there; many deployments skip deep HCM integration and let the intranet maintain its own profile fields (bio, photo, skills). → `embedded_master + optional`. Demotion path: "INTRANET local-masters employee profiles standalone; reads from HCM in holistic deployments — but many real intranets skip HCM integration entirely." |
| departments (data_object missing) | consumer | optional | Departments drive org-tree-based audience targeting; INTRANET reads but doesn't master. **Blocked — `departments` data_object missing.** |
| documents (id=429) | embedded_master | optional | SharePoint *is* a document store; standalone SharePoint masters documents directly. When ECM is canonical (or SharePoint is the ECM), differs. Default `embedded_master + optional` for non-SharePoint intranets (Simpplr, Staffbase) which surface ECM docs as embeds. Demotion path: "INTRANET local-masters published files standalone (SharePoint pattern); references ECM documents when ECM is canonical." |
| policies (id=285) | consumer | required | Policies are surfaced as intranet content; GRC masters. |
| channels | derived | optional | Cross-channel reach analytics if INTRANET aggregates WSC engagement. **Blocked — missing.** |

**Pattern note:** INTRANET sits between leadership-layer (derived) and point-solution (master + embedded_master). Most rows above are master on intranet-native objects and embedded_master+optional on upstream-canonical objects (employees, documents). The `derived` rows only appear when the intranet aggregates external-channel signals (Staffbase's omnichannel module).

---

## Section 5 — CONV-AI (id=34) — Conversational AI

Existing rows: `ai_agents` (consumer, required), `conversation_transcripts` (master, required), `intent_detections` (master, required). Solid base — keep.

CONV-AI builds bots/voicebots/digital assistants (Cognigy, Kore.ai, IBM Watsonx Assistant, Google Dialogflow CX, Amazon Lex, Yellow.ai). It masters intents (the trained semantic units), conversation transcripts (turn-by-turn dialog), and the bot/flow definitions themselves. It *consumes* knowledge_articles from KMS/INTRANET to ground answers (the RAG pattern).

### Existing rows — keep as-is

| id | data_object | role | necessity | rationale |
|---|---|---|---|---|
| 399 | ai_agents | consumer | required | Correct — AI-agent registry is platform-owned, CONV-AI invokes. |
| 443 | conversation_transcripts | master | required | Correct — CONV-AI canonical. |
| 444 | intent_detections | master | required | Correct — runtime intent classification result lives in CONV-AI. |

### Proposed NEW rows for CONV-AI

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| intents (the trained intent definition, distinct from runtime detection) | master | required | CONV-AI masters the trained intent vocabulary. **Blocked — `intents` data_object missing.** |
| knowledge_articles (id=51) | consumer | required | RAG-style grounding reads KMS/INTRANET articles. CONV-AI doesn't author articles. |
| customers (id=97) | consumer | required | Customer-facing voicebots need customer identity for personalization/auth. Canonical is CRM/CDP. |
| contacts (id=98) | consumer | optional | Lighter customer-facing flow (anonymous bot) doesn't need contact lookup. |
| employees (id=31) | consumer | optional | Internal HR-bot variants only; pure customer-facing CONV-AI skips. |

---

## Section 6 — Missing data_objects (Phase-B prerequisite gaps)

The following data_objects must be created before the rows in sections 2/3/4/5 referencing them can land. Order roughly by load-bearing-ness:

1. **`users`** (or commit to using `employees` everywhere). Decision needed: separate `users` for service/system/external accounts vs reusing `employees`? Most catalog precedent uses `employees` as the identity record (HCM/Payroll/IGA all master it). Recommend reusing `employees` and treating Slack-only/Teams-only guest accounts as embedded slice in WSC notes.
2. **`workspaces`** — WSC canonical container. Needed for WSC master + COLLAB-GOV derived.
3. **`channels`** — WSC canonical. Needed for WSC master + COLLAB-GOV derived + INTRANET derived.
4. **`messages`** — WSC canonical. Needed for WSC master + COLLAB-GOV derived.
5. **`meetings`** — WSC master (when WSC owns meetings) and CCAAS-adjacent.
6. **`recordings`** — WSC master, optional; CCAAS `call_recordings` (id=122) already exists, separate concept.
7. **`announcements`** — INTRANET master.
8. **`news_posts`** — INTRANET master.
9. **`intranet_sites`** — INTRANET master (named to distinguish from DXP web sites).
10. **`intranet_pages`** — INTRANET master (NOT `pages` — collides with DXP `web_pages` and the leadership-layer distinction matters).
11. **`communities`** — INTRANET master (Viva Engage / Workvivo / Yammer surface).
12. **`broadcast_messages`** — INTRANET master.
13. **`intents`** — CONV-AI master (distinct from runtime `intent_detections` id=260; the trained intent vocabulary itself).
14. **`departments`** — referenced by INTRANET targeting. Likely HCM canonical when created.
15. **`marketing_content`** — referenced earlier for DXP consumer; likely MARKETING-AUTO or B2C-COMM canonical.
16. **`policies`** already exists (id=285).
17. **`call_records`** vs existing `call_recordings` (id=122) — CCAAS-specific call event records (CDR-style metadata, not the audio recording). Could potentially be merged with `support_sessions` (id=256) — see Section 7.

---

## Section 7 — Update existing rows + CCAAS / ESIGN

### CCAAS (id=98) — three existing rows

CCAAS is a customer-facing point solution (Genesys, NICE CXone, Talkdesk, Five9, Amazon Connect). It is the canonical master for the *contact-center session* slice but **embedded_master**s customers and contacts (CRM/CDP are canonical). The existing `contact_records` row (id=441) is currently `master + required` with notes mentioning "CCAAS-side identity reconciliation; CSM/CRM contributors when their identifiers feed in." That description is already an embedded_master pattern in disguise.

#### Existing rows — proposed updates

| id | data_object | current → proposed | rationale |
|---|---|---|---|
| 440 | support_sessions | master+required → **keep** | CCAAS canonical (the session is what CCAAS *is*). |
| 441 | contact_records | master+required → **change to `embedded_master + required`** | The notes already admit this: CSM/CRM are canonical contributors and the real "contact" record is CRM `contacts` (id=98). CCAAS holds a session-time contact identity locally. Demotion path note to add: "CCAAS local-masters contact identity within a session; reconciles to CRM `contacts`/`customers` in holistic deployments." Alternative: if `contact_records` is genuinely a CCAAS-only session artifact (not the underlying contact identity), it stays `master` and a separate `contacts (id=98)` row is added as `embedded_master + required`. **Recommendation: add the separate `contacts (id=98)` embedded_master row and keep `contact_records` as session-local CCAAS master.** |
| 442 | queue_statistics | master+required → **keep** | CCAAS canonical operational metric. |

#### Proposed NEW rows for CCAAS

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| customers (id=97) | embedded_master | required | CCAAS standalone holds a customer record (Five9 has its own Customer DB). When CRM/CDP is integrated, CCAAS reconciles. Demotion path: "CCAAS local-masters customers when no CRM is deployed; reads from CRM/CDP in holistic deployments." |
| contacts (id=98) | embedded_master | required | Same shape — CCAAS holds contact identity to route the call; CRM canonical. Demotion path: "CCAAS local-masters contacts standalone; reconciles to CRM contacts in holistic deployments." |
| customer_cases (id=103) | consumer | required | Most CCAAS deployments create cases in CSM, not CCAAS. Consumer + required: agent needs to read the case history to handle the call. Some CCAAS suites (Genesys Cloud) master internal cases — those deployments would be `embedded_master + optional`. Default `consumer + required` for the holistic pattern. |
| call_recordings (id=122) | master | optional | CCAAS canonical when recording is enabled; optional because some deployments disable recording for compliance. |
| knowledge_articles (id=51) | consumer | required | Agent assist surfaces KMS articles during a call. |
| employees (id=31) | embedded_master | required | Agent identity. CCAAS standalone has its own agent table (Five9 agent management); IGA canonical when integrated. → embedded_master + required. |

### ESIGN (id=94) — one existing row

ESIGN (DocuSign, Adobe Sign, Dropbox Sign, PandaDoc) is a focused point solution. It masters envelopes (the signature workflow) and produces signed PDFs that flow back into ECM/CLM.

#### Existing rows — keep

| id | data_object | current → proposed | rationale |
|---|---|---|---|
| 439 | envelopes | master+required → **keep** | ESIGN canonical. |

#### Proposed NEW rows for ESIGN

| data_object | proposed role | necessity | rationale |
|---|---|---|---|
| documents (id=429) | embedded_master | optional | ESIGN holds source PDFs and produces signed PDFs. ECM is canonical for document storage. In many real deployments, ESIGN is the *only* place the signed document lives (users skip ECM integration, just download the signed PDF) → optional captures the "many ESIGN deployments don't push back to ECM" pattern. Demotion path: "ESIGN local-stores signed documents standalone; pushes to ECM in holistic deployments — many deployments skip the ECM push entirely." |
| contacts (id=98) | embedded_master | optional | ESIGN holds signer contact info (email, name, role-in-signing-flow). CRM canonical. Optional because some envelope flows use ad-hoc emails with no contact-record creation. |
| customers (id=97) | consumer | optional | When ESIGN is wired into a CRM-driven sales flow, customer identity flows from CRM. Optional because many ESIGN deployments don't have CRM integration (legal-team-only usage). |
| employees (id=31) | consumer | optional | Internal signer identity reads from IGA/HCM. Optional. |

---

## Summary of proposed changes

### Existing-row updates (1)

- CCAAS `contact_records` (id=441) — keep as session-local CCAAS master AND add a new `contacts (id=98) — embedded_master + required` row. Notes update on id=441 to explicitly state the session-local scope.

### NEW rows proposed (by domain)

| domain | new rows proposed | unblocked (referenced data_object exists) | blocked on Section 6 |
|---|---|---|---|
| DXP (77) | 5 | 5 (customers, contacts, products, documents, employees) | 0 |
| WSC (75) | 8 | 2 (employees as user-stand-in, documents) | 6 (workspaces, channels, messages, meetings, recordings, users-if-distinct) |
| COLLAB-GOV (127) | 6 | 3 (employees, policies, documents) | 3 (workspaces, channels, messages) |
| INTRANET (126) | 10 | 3 (employees, documents, policies) | 7 (announcements, news_posts, intranet_sites, intranet_pages, communities, broadcast_messages, departments, channels) |
| CONV-AI (34) | 5 | 4 (knowledge_articles, customers, contacts, employees) | 1 (intents) |
| CCAAS (98) | 6 | 6 (customers, contacts, customer_cases, call_recordings, knowledge_articles, employees) | 0 |
| ESIGN (94) | 4 | 4 (documents, contacts, customers, employees) | 0 |
| **TOTAL** | **44** | **27** | **17 (blocked on 13 missing data_objects)** |

### Signal-1 impact (when fully landed)

`employees` (id=31) gains embedded_master rows from WSC, INTRANET, CCAAS — three additional point-solution silos. Combined with existing canonical masters (HCM, PAYROLL, IGA, MDM), `employees` Signal 1 rises from 4 → 7. Strong flagship reinforcement.

`customers` (id=97) gains embedded_master from CCAAS (+1) on top of CRM/CSM/SUB-MGMT/CDP/MDM canonical masters. Signal 1: 5 → 6.

`contacts` (id=98) gains embedded_master from CCAAS, ESIGN. Signal 1: 1 → 3.

`documents` (id=429) gains embedded_master from DXP (optional, excluded from Signal 1), INTRANET (optional, excluded), ESIGN (optional, excluded). Signal 1 unchanged but "extended footprint" view picks up four point-solution silos — useful operational signal.

`policies` (id=285), `products` (id=384), `knowledge_articles` (id=51) gain only `consumer` rows — no Signal 1 change.

### Anti-pattern check

- No `master` proposed for COLLAB-GOV (leadership-layer rule respected).
- No synthetic data_objects scaffolded — Section 6 enumerates real prerequisites instead.
- Every `embedded_master` row includes a demotion-path note as required by SKILL.md line 455.
- No `embedded_master + optional` rows counted in the Signal 1 impact summary (per Phase 4 formula).
- Existing CCAAS `contact_records` distinguished from `contacts` to avoid the "two records for the same identity" trap — `contact_records` is session-local CCAAS-mastered, `contacts` is CRM-canonical and CCAAS-embedded-master.

### Open decisions for the user

1. **`users` vs `employees`** — collapse into `employees` (catalog precedent) or create separate `users` data_object for external/system accounts? Recommendation: reuse `employees`, treat external/guest accounts in notes.
2. **CCAAS `contact_records` vs `contacts`** — keep both (recommended) or fold contact_records into contacts? Recommended: keep distinct, contact_records = session artifact, contacts = identity record.
3. **`intranet_pages` vs `pages` vs `web_pages`** — recommend `intranet_pages` to avoid collision with DXP `web_pages` (id=441).
