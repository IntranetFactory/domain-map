# Account-Based Marketing Platform (ABM-PLATFORM): questions waiting for you

## What this domain is
Know which accounts are in-market, then engage them across ads, web, and orchestration before competitors do. Capture intent signals and resolve anonymous web traffic to real accounts, score engagement, and orchestrate multichannel plays. Run account-based ad campaigns and personalize the website for named accounts, all governed by consent. Ingests the ICPs and target account lists authored in Go-to-Market Planning and engages against them.

This domain was just created (the downstream engagement half of the planning-vs-engagement cut; the planning side stays in Go-to-Market Planning). Four modules, twelve master records, the flagship vendors, and the system skill are all in place at status "new". Two non-blocking choices remain.

---

q1: This domain handles contact-level intent, web-visitor resolution, and engagement, all personal data, so GDPR and CCPA genuinely apply. The compliance is already modeled with consent records and data-subject-request entities. Do you also want explicit regulation links on the domain?

- a) Link CPRA (already in the catalog) and create a GDPR regulation row, then link both.
- b) Link CPRA only (GDPR would be a new regulation row).
- c) None, the consent and data-subject-request entities already carry the obligation.

Recommended: a. ABM is the part of the stack where contact-level PII concentrates, so an explicit GDPR + CPRA tag on the domain is worth the completeness. Creating the GDPR regulation row is a new catalog entry, which is why it waits for your yes here.

a1:

---

q2: The build deferred the persona / RACI layer (ABM Strategist, Intent Analyst, Campaign Orchestration Manager, Advertising Manager), the remaining cross-domain handoffs (intent and engagement feeds toward CRM and Revenue Intelligence; CRM opportunity context inbound), and vendor-synonym aliases. The GTM-PLAN to ABM handoffs are already wired. Do these now, or hold?

- a) Go ahead now: personas, the remaining handoffs, and aliases.
- b) Hold the personas; just wire the remaining handoffs.
- c) Hold all for a later pass.

Recommended: a, once you have spot-checked the new domain. The persona layer makes it deployable; the handoffs connect engagement signals back to the revenue systems that act on them.

a2:

---

<!-- agent map, ignore: q1=B2-REGULATIONS q2=B1B-PHASE-P+B1B-HANDOFFS+B1B-ALIASES-TOOLS | domain_id=185 -->
