# Phase 0 Vendor Surface: HRSD-JOURNEY-MGMT (`employee_journeys`)

Scope: should HRSD gain a module mastering an `employee_journeys` entity for NON-onboarding employee moments (return-from-leave, role change, promotion, relocation, leave of absence, exit/offboarding transitions, parental leave)? ONBOARDING and EMP-EXP already exist.

Date: 2026-06-09. Read-only vendor-surface research.

## 1. Flagship vendors

- **Workday Journeys** - configurable "journeys" of cards that guide employees through transitions and moments-that-matter (job change, promotion, leave, relocation, exit, open enrollment), targeted by Workday data.
- **Enboarder** - multi-stakeholder journey orchestration with timed nudges across email/SMS/Slack/Teams; behavior-change framing, expanding from onboarding to "hire to impact and disruption to alignment".
- **Applaud (Journeys)** - drag-and-drop experience engine for transitions and long leave; templates for onboarding, offboarding, first-time-manager, internal mobility, reviews, benefits, with manager/buddy views and pulse feedback.
- **ServiceNow Employee Journey Management (HRSD)** - lifecycle events plus Journey Accelerator plans; cross-department workflows, experience packs (blueprints), listening posts, audiences.
- **Microsoft Viva (Glint)** - lifecycle "moments that matter" via onboarding/exit lifecycle surveys and manager action plans; listening-led, not task orchestration.
- **Leena AI** - GenAI virtual assistant automating full lifecycle from preboarding to offboarding (clearance, KT sessions, exit surveys).
- **HR Cloud (Onboard)** - customizable workflows and self-service portals across the lifecycle; onboarding-centric, lighter on non-onboarding moments.

## 2. Recurring first-class entities

Across the orchestration vendors (Workday, Enboarder, Applaud, ServiceNow), the same modeling primitives recur:

- **Journey templates / blueprints** (ServiceNow "experience packs", Workday/Applaud templates).
- **Journey instances / assignments / plans** (the template activated for a person; ServiceNow "journey plan").
- **Steps / tasks / cards / activities** (typed: article, learning, link, to-do, e-sign, child case; ServiceNow "activity sets" + activities).
- **Nudges / reminders / notifications** (multi-channel; explicit first-class in Enboarder, present in all).
- **Milestones / stages** (named phases inside a journey).
- **Triggers / moments-that-matter / lifecycle events** (the event that launches a journey: promotion, leave, transfer, exit).
- **Audiences / eligibility / employee groups** (who a journey applies to, by location/job/level).
- **Stakeholder roles** (employee, manager, buddy/mentor, HR, IT) and **sentiment/pulse feedback**.

## 3. Vendor-by-entity surface matrix

Core = headline first-class object; Common = present/named; Specialist = niche or partial; absent = not modeled.

| Entity | Workday | Enboarder | Applaud | ServiceNow | Viva | Leena AI | HR Cloud |
|---|---|---|---|---|---|---|---|
| Journey template/blueprint | Core | Core | Core | Core | absent | Common | Common |
| Journey instance/plan | Core | Core | Core | Core | Specialist | Common | Common |
| Steps/tasks/cards/activities | Core | Core | Core | Core | absent | Core | Core |
| Nudges/reminders | Common | Core | Common | Common | Specialist | Common | Common |
| Milestones/stages | Common | Common | Common | Core | absent | Common | Common |
| Triggers/lifecycle events | Core | Common | Common | Core | Common | Common | Specialist |
| Audiences/eligibility | Core | Core | Common | Core | Common | Specialist | Specialist |
| Stakeholder roles (mgr/buddy) | Common | Core | Core | Core | Common | Common | Common |
| Sentiment/pulse feedback | Specialist | Common | Common | Common | Core | Common | absent |

Takeaway: template, instance/plan, steps, triggers, and audiences form a tight, consistent five-entity core across every dedicated orchestration vendor, and the entity surface is the SAME whether the moment is onboarding or non-onboarding (the moment is just a different trigger feeding the same machinery).

## 4. Boundary question

**Distinct module argument.** The non-onboarding moments (return-from-leave, promotion, relocation, leave, exit) are real, span HR/IT/Finance, and every flagship vendor markets one journey engine that covers them as peers of onboarding, not as onboarding sub-features. ServiceNow explicitly separates "lifecycle events" (the engine) from any single event. The orchestration machinery (templates, instances, tasks, triggers, audiences) is generic and reusable.

**Fold-in argument.** That same observation cuts the other way: because the entity surface is identical for onboarding and non-onboarding, a separate module would duplicate ONBOARDING's template/instance/task structure with only a different `trigger` value. EMP-EXP already owns sentiment/pulse and moments-that-matter listening. The vendors do NOT ship a separate "non-onboarding" product; onboarding is one trigger inside a single Journeys engine. A module that excludes onboarding by definition has no real-world analog.

## 5. Modularization hypothesis

`employee_journeys` would master the journey-orchestration backbone: **journey_templates**, **employee_journeys** (instances), **journey_steps/tasks**, **journey_milestones**, **journey_triggers / moments**, and **journey_audiences**. It would consume / embedded_master:

- **HCM** - `employees` (subject), job/position, location, manager (embedded_master employee identity).
- **ONBOARDING** - shares the template/instance/task pattern; onboarding is one journey type, so this overlaps rather than feeds.
- **EMP-EXP** - pulse/sentiment and listening posts (consume for feedback steps).
- **LMS** - learning courses as a step type.
- **ITSM/Service catalog** - provisioning/de-provisioning tasks (exit, role change).
- **Absence/Leave** - leave events as triggers (return-from-leave, parental leave).

The honest read: the master is "journeys" in general, not "journeys minus onboarding". Scoping it to exclude onboarding forces an artificial seam through one coherent entity.

## 6. Recommendation

**Verdict: (b), fold into a single journey-orchestration capability rather than build a separate non-onboarding HRSD-JOURNEY-MGMT module.** The strongest reason is the matrix: no flagship vendor models non-onboarding journeys as a distinct product, and every one of them uses ONE template/instance/step/trigger/audience engine where onboarding is simply one trigger among promotion, leave, relocation, and exit. A module defined by the absence of onboarding has no vendor analog and would duplicate ONBOARDING's exact entity surface. Preferred shape: promote the shared backbone to a single **journey-management capability** (ideally a master `employee_journeys` cluster in HRSD that ONBOARDING consumes as the onboarding-typed instance), with EMP-EXP continuing to own sentiment/listening. If organizational reality forces onboarding to stay a hard-walled module, then position journey orchestration as a peer HRSD module covering ALL moments including onboarding-by-reference, never as "non-onboarding only".
