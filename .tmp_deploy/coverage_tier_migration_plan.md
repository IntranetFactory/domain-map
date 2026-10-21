# `tools.coverage_tier` migration plan (v2)

Synthesized from the design discussion 2026-05-26. Supersedes the v1 plan.

## Schema changes

Three changes, all on `tools` + one on `skill_tools`:

| Change | Detail |
|---|---|
| Extend `tools.operation_kind` enum | add `inbound` |
| Add `tools.coverage_tier` enum column | values `platform` / `external` / `integration`, default `external`, NOT NULL |
| Update `tools.data_object_id` rule | required for `query`/`mutate`; NULL for `side_effect`/`compute`; **optional** for `inbound` (NULL for generic primitives, set when landing target is fixed) |
| Drop `fallback` from `skill_tools.requirement_level` enum | unused across 1364 rows; conflated with `optional` empirically. Two remaining values: `required`, `optional`. |

No new tables. No new FKs. No `parent_tool_id`, no capability table — the capability pattern is handled by a small set of "abstraction" tool rows (see below), not a schema layer.

## New tool rows (19)

### Inbound family (`operation_kind='inbound'`)

| tool_name | coverage_tier | notes |
|---|---|---|
| `receive_webhook` | **platform** | `webhook_receivers` built-in covers MCP + CLI |
| `receive_email` | external | inbound mail parse (M365 / Gmail / SES / Mailgun) |
| `receive_sms` | external | Twilio / Vonage inbound |
| `receive_voice_call` | external | Twilio Voice / Genesys / Amazon Connect |
| `ingest_event_stream` | external | Kafka / Kinesis / EventBridge |
| `receive_edi_message` | external | AS2 / VAN (Cleo / OpenText / SPS Commerce) |
| `receive_file_drop` | external | SFTP pickup |

### Outbound regulatory / industry submissions (`operation_kind='side_effect'`, `coverage_tier='external'`)

`submit_regulatory_filing`, `submit_tax_filing`, `submit_breach_notification`, `submit_aml_report`, `submit_adverse_event`, `submit_esg_disclosure`, `submit_trade_report`, `submit_industry_statistics` (8 rows). Per-regulator detail in `tool_solutions`.

### Misc outbound (`operation_kind='side_effect'`, `coverage_tier='external'`)

`publish_webhook` (outbound vendor-event emission — distinct from `invoke_webhook`), `transmit_edi_message` (outbound EDI via VAN/AS2).

### Abstraction tools (`operation_kind='side_effect'`, `coverage_tier='external'`)

Two rows, capturing the only two genuine "substitutable-channel" patterns in the catalog (empirically validated — 15 skills use `notify_person`-shaped patterns; no other tool cluster has this property):

| tool_name | description |
|---|---|
| `notify_person` | Single-recipient outbound message; channel routed by recipient profile / deployment config. Backed by `send_email`, `send_sms`, `make_phone_call`, future channels. Becomes `platform` only when Semantius ships a real outbound dispatcher (recipient lookup + channel routing) on both MCP + CLI. |
| `notify_team` | Broadcast to a team (typical pattern: chat channel + email audit trail). Backed by `post_chat_message`, `send_email`, `post_social_message`. Same `platform` criterion. |

**Skills link the abstraction by default.** Concrete channel tools (`send_email`, `send_sms`, etc.) stay in `tools` as primitives — vendors implement them via `tool_solutions`, and skills that genuinely require a specific channel (CCAAS needs voice; ESIGN needs webhook callback) link concrete tools directly.

## What skill_tools changes look like (during re-analysis, not as a backfill)

Per the user instruction: **no skill_tools backfill on existing rows.** The 8 modularized domains × 31 modules will be re-analyzed (separate sessions), and that re-analysis replaces the affected skill_tools rows fresh — producing the inbound coverage and the abstraction-tool links in one pass per domain rather than as a separate retrofit.

For the 115 legacy domain-only system skills (non-modularized): they're already pending a full review per separate plan; coverage_tier work folds into that review when each domain is modularized.

**Authoring rules for the re-analysis** (codify in SKILL.md):

1. **Default to `notify_person` / `notify_team`** instead of channel-specific notification tools. Only link `send_email` / `send_sms` / `post_chat_message` / `make_phone_call` directly when the workflow genuinely requires that specific channel (CCAAS voice, ESIGN webhook callback, EDI partners, regulatory-mandated channel).
2. **Every system skill links `receive_external_event` (the inbound capability) OR a specific inbound channel** based on the same test — most skills get the generic capability; CCAAS / EDI-shaped skills link the specific channel.
3. **Multi-channel skill_tools rows mean broadcast (AND)**, not OR. With the abstraction tools, this case should largely disappear — `notify_team` covers the broadcast intent in one row.
4. **`requirement_level` stays on workflow-necessity semantics.** `required` = workflow gates without it. `optional` = workflow degrades gracefully. (`fallback` removed.)

## Catalog-level catalog setup (one-shot, before re-analysis)

These are required because they affect every row in `tools`, not just freshly-authored ones:

1. **Schema migration** (M1): add column, extend enum, drop unused enum value.
2. **Backfill existing tools' coverage_tier** (M2): `query` + `mutate` → `platform` (they ARE PostgREST CRUD, already covered by both MCP + CLI); `side_effect` + `compute` → `external`. One PATCH per kind. Not a "skill" backfill — this is just setting the field correctly on existing catalog primitives.
3. **Insert 19 new tool rows** (M3): the table above.
4. **Field/entity description cleanup** (M4): three field descriptions + one entity description.

After these four steps, the catalog is in a consistent state. The re-analysis of the 31 modules then populates `skill_tools` with the inbound + abstraction-tool links.

## SKILL.md changes (apply after catalog setup)

| Section | Change |
|---|---|
| § "Agent tooling layer" intro | Add `coverage_tier` to `tools` row's qualifier column; mention new `inbound` operation_kind; mention abstraction tools `notify_person` / `notify_team` |
| § "Semantius score" | Replace single formula with two: `strict_score = count(coverage_tier='platform')/total`; `operational_score = count(coverage_tier IN ('platform','integration'))/total`. Define "Semantius ships X" as MCP + CLI bar. |
| Rule #17 sub-invariant | Update operation_kind ↔ data_object_id pairing: required for query/mutate; NULL for side_effect/compute; OPTIONAL for inbound. |
| F4 audit check | Same pairing update. |
| New § "Channel vs capability authoring rule" | Codify the 4 authoring rules from this plan: default to abstraction tools, link channels only when channel-specific, multi-channel = broadcast = AND, `fallback` removed. |
| Existing "skill_tools.requirement_level" references | Update to drop `fallback`; keep `required` / `optional` only. |

## Execution sequence

1. **You review this plan** (especially the "Semantius ships X" definition and the abstraction-tool naming).
2. **Run M1+M2 loader**: schema + backfill existing tools' coverage_tier.
3. **Run M3 loader**: insert the 19 new tool rows.
4. **Run M4 loader**: description cleanup + `fallback` removal.
5. **I apply** the SKILL.md edits (separate diffs for review).
6. **Re-analysis** of the 31 modularized modules begins (separate sessions, one domain at a time, each producing fresh `skill_tools` rows; per Rule #1 each load is `record_status='new'` until you bulk-approve).
