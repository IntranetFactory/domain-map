# FRONTLINE-COMMS Phase 0 - Vendor Surface

Candidate: Frontline / Deskless Worker Communication Platform
Date: 2026-06-14
Tenant: adenin (org=adenin, https://adenin.semantius.ai)
Mention count: 3 (WFM audit, INTRANET audit, RET-STORE audit)

## Verdict

**promote-as-domain** (domain_code FRONTLINE-COMMS).

The point-solution-market test passes with 5 independent pure-plays, and the unifying "frontline digital workplace" wedge (mobile-first comms + task/checklist execution + shift-swap conversations + microlearning + recognition for non-desk workers, bought by store/plant ops) is NOT folded whole into any single existing domain. The existing INTRANET domain claims only the *communications* slice (one capability), aimed at a different buyer (Internal Comms / HR), so the candidate is a distinct market, not a duplicate.

## Live catalog overlap check (CLI, not MCP)

| domain_code | id | domain_name | relevant scope | crud% | cost | overlap verdict |
| --- | --- | --- | --- | --- | --- | --- |
| INTRANET | 126 | Employee Communications & Intranet | Has capability 146 "Frontline and Deskless Worker Communications" (kiosk, SMS, supervisor cascade), 141 targeted news + mandatory-read ack, 143 mobile app. Buyer = Internal Comms / HR. No modules loaded yet. | 88 | $$$ | Claims the COMMS slice only; office-comms buyer. Partial overlap, not a fold target. |
| WFM | 59 | Workforce Management | Cap 31 Shift Scheduling includes "swap"; cap 312 scheduling/dispatch. The swap *mechanic* lives here. | 55 | $$$ | Owns the shift record + swap approval. Candidate owns the swap *conversation*; hand off to WFM. |
| RET-STORE | 48 | Retail Store Operations | Task management + store-associate workflows, retail only. | 95 | $$$ | Owns retail task execution. Candidate's task push spans manufacturing/healthcare/hospitality too, and is the worker-facing surface. |
| EMP-EXP | 62 | Employee Experience and Engagement | Surveys / pulse / 360 / lifecycle listening / action planning only. No recognition, no comms. | 95 | $$ | Listening, not broadcast. No overlap with broadcast or recognition-as-feed. |
| INTRANET-GOV | (gov) | Intranet Governance | Accountability layer over intranet content. | 70 | $$ | No overlap. |

Existing solutions already in catalog touching this space:
- WorkJam (solution id 256) -> linked to WFM (59) + RET-STORE (48). Described "Frontline digital workplace, communications, and WFM." It is mis-shelved: its flagship IS frontline comms/ops, so it belongs on FRONTLINE-COMMS (add solution_domains edge, keep existing edges).
- Staffbase (451), Simpplr (452), Firstup (453) -> linked to INTRANET (126). These are intranet/comms-led; Staffbase reaches frontline as a feature but is an INTRANET vendor, correctly shelved there. Do not move.

## Flagship vendors

| Vendor | URL | Specialist in | Independence / M&A | Why included |
| --- | --- | --- | --- | --- |
| WorkJam | workjam.com | Frontline digital workplace: comms + task + scheduling + training + shift swap + surveys | Independent, ~$167M raised | Category leader; user-named; broadest surface |
| YOOBIC | yoobic.com | Frontline engagement + task/ops execution + microlearning | Independent | Pure-play; strong learning + task surface (retail, restaurants, grocery, beauty, pharma, logistics, mfg) |
| Speakap | speakap.com | White-label frontline employee experience app | Independent | Pure-play; mid-market; retail/hospitality/mfg/construction/logistics |
| Flip | getflip.com | Frontline comms (news feed, chat, docs, shift-plan integration, surveys, onboarding) | Independent (German) | Pure-play; EU regional leader; simplicity-led |
| Blink | joinblink.com | Frontline employee experience app | Independent (London) | Pure-play; healthcare/transit/mfg/logistics/construction; active 2026 |
| Beekeeper | beekeeper.io | Frontline success platform (secure chat, workflows, announcements) | Merged with LumApps Jul 2025 (Bridgepoint, ~$1B combined "AI Employee Hub") | Suite-absorbed but product persists as the frontline arm; load as solution, note merger in description |

Point-solution-market test: **PASS**. >=3 INDEPENDENT flagship pure-plays = WorkJam, YOOBIC, Speakap, Flip, Blink (five). Suite-absorbed adjacents (Beekeeper->LumApps, Workvivo->Zoom, Microsoft Teams Frontline / Viva Connections as suite module, Crew->Square/Block 2019, Workpop->Cornerstone 2018->Cornerstone Frontline) confirm the category is real enough that suites buy in; they do not collapse it.

M&A corrections to candidate metadata:
- "Crew -> Cornerstone" is imprecise. Crew was acquired by **Square/Block (2019)**; it merely *integrated* with Cornerstone OnDemand. Cornerstone's frontline play came from acquiring **Workpop (2018)** -> Cornerstone Frontline.
- "Workvivo -> Zoom" correct (2023).
- Beekeeper -> **LumApps** merger (Jul 2025), not a standalone exit.

## Distinct-market argument (the fold gate)

INTRANET, WFM, RET-STORE, EMP-EXP each own ONE slice. No existing domain owns the **unified worker-facing frontline operations app** the pure-plays sell:

1. Buyer is different: store ops / plant ops / field ops, not Internal Comms or HR (INTRANET's buyer) and not the WFM scheduler.
2. Audience constraint is structural: workers with NO corporate email, NO workstation, mobile-first, kiosk/shared-device, supervisor cascade. This shapes every entity (acknowledgements, read receipts, channel primitives, identity tied to HCM employee + WFM shift).
3. Scope is broader than comms: comms is necessary but the wedge that makes it a market is task/checklist push + shift-swap conversations + microlearning + recognition fused in ONE app. That fusion is the product; none of the four adjacents fuses it.
4. Hand-offs, not ownership: shift-swap *approved* hands to WFM; task *completed* hands to store/plant ops (RET-STORE et al.); the swap record and the shift live in WFM, the task definition in store ops. FRONTLINE-COMMS owns the worker-facing conversation/acknowledgement/execution surface and emits events.

Conclusion: promote as a thin-but-distinct operational domain that consumes HCM employees + WFM shifts and hands work back to WFM / store ops. INTRANET keeps its frontline-comms capability as the office-comms platform's reach feature; FRONTLINE-COMMS is the ops-led platform.

## Proposed capabilities (domain-grain)

1. Frontline Broadcast Messaging
2. Frontline Task and Checklist Execution
3. Shift Swap and Coverage Conversations
4. Frontline Microlearning
5. Frontline Recognition

## Surface matrix

Vendors: WJ=WorkJam, YO=YOOBIC, SP=Speakap, FL=Flip, BL=Blink.

| Entity | Category | WJ | YO | SP | FL | BL | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| frontline_broadcasts | Master | x | x | x | x | x | Core | BROADCAST-ENGAGEMENT |
| frontline_message_channels | Master | x | x | x | x | x | Core | BROADCAST-ENGAGEMENT |
| content_acknowledgements | Junction/compliance | x | x | x | x | x | Core | BROADCAST-ENGAGEMENT |
| frontline_recognitions | Master | x | x | x | . | x | Core | BROADCAST-ENGAGEMENT |
| broadcast_audiences | Config | x | x | x | x | x | Core | BROADCAST-ENGAGEMENT |
| frontline_tasks | Master | x | x | x | . | x | Core | TASK-EXECUTION |
| frontline_checklists | Master/config | x | x | x | . | . | Common | TASK-EXECUTION |
| task_submissions | Junction | x | x | x | . | . | Common | TASK-EXECUTION |
| shift_swap_requests | Master (workflow) | x | . | x | x | x | Core | TASK-EXECUTION |
| frontline_learning_modules | Master | x | x | . | . | . | Common | TASK-EXECUTION (or own module if expanded) |
| learning_completions | Junction | x | x | . | . | . | Common | TASK-EXECUTION |

(frontline_message_channels + frontline_broadcasts give the comms master per module-Rule #14; lifecycle states attach to frontline_broadcasts, frontline_tasks, shift_swap_requests.)

## Compliance entities

Market is not a named regulated regime (no FCRA/HIPAA/SOX/GDPR-specific surface mandated for the *comms* function itself). The relevant non-optional substrate is union/works-council content rules (esp. EU, Flip/Beekeeper emphasize "deliver content in compliance with union or worker policies") and read-receipt/acknowledgement audit. Modeled as `content_acknowledgements` (mandatory-read proof) rather than a regulator table. No dedicated compliance table required; defer any GDPR consent surface to INTRANET / HCM which already own employee PII.

## Modularization hypothesis

Two full modules.
- **FRONTLINE-COMMS-BROADCAST-ENGAGEMENT**: masters frontline_broadcasts + frontline_message_channels; carries content_acknowledgements, broadcast_audiences, frontline_recognitions. The mobile-first reach + engagement surface.
- **FRONTLINE-COMMS-TASK-EXECUTION**: masters frontline_tasks + frontline_checklists; carries task_submissions, shift_swap_requests (lifecycle workflow), frontline_learning_modules + learning_completions. The do-the-work surface that emits hand-offs to WFM (swap approved) and store/plant ops (task completed).

Both consume HCM `employees` and WFM `shifts`; frontline worker + frontline manager are user-typed (Rule #10).

## Sources

- https://www.beekeeper.io/platform/ ; https://www.lumapps.com/insights/news/lumapps-and-beekeeper-to-join-forces-creating-the-leading-employee-experience-platform-for-the-future-of-work (Beekeeper/LumApps merger Jul 2025)
- https://www.forrester.com/blogs/lumapps-and-beekeeper-come-together-to-deliver-an-ai-powered-employee-hub/
- https://www.cbinsights.com/company/workjam (WorkJam ~$167M)
- https://www.joinblink.com/intelligence/yoobic-alternatives ; https://www.joinblink.com/intelligence/flip-alternatives
- https://www.g2.com/categories/frontline-worker-communication-platforms (category definition)
- https://www.mangoapps.com/articles/best-frontline-communication-software ; https://staffbase.com/blog/frontline-communication-tools
- https://www.businesswire.com/news/home/20180912005394/en/ (Cornerstone/Workpop 2018)
- Square/Block acquisition of Crew (2019)
