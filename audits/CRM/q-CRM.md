# Customer Relationship Management (CRM): questions waiting for you

## What this domain is

Run the full sales relationship in one place: keep a clean record of every customer, contact, lead, and open deal, and move each one forward through your pipeline. Capture the calls, emails, and meetings tied to each account, and let an AI copilot layer surface the next best action on top of it all.

I researched the open sales-object candidates against the flagship CRM vendors (Salesforce, Microsoft Dynamics, HubSpot, Zoho, Pipedrive, Oracle, SAP) and against what the catalog already owns. The decisions below are all additive or non-blocking; the 5-module build itself is settled and nothing here holds it up.

---

q1: Six sales objects are genuinely CRM-native (the flagship CRMs model them as first-class records and the catalog masters none of them yet): competitors, competitor intelligence, lead-assignment rules, account hierarchies, sales playbooks, and sales territories. Which should I load? (answer this first)

- a) Load all six
- b) Load a subset (tell me which)
- c) Load none for now

Recommended: a) Load all six. competitors + lead-assignment rules + account hierarchies are Core (every flagship models them: Salesforce Competitor records, Assignment Rules, Account Hierarchy; Dynamics parent accounts; Zoho/HubSpot equivalents). competitor intelligence (battlecards), sales playbooks (Salesforce Sales Enablement, HubSpot Playbooks, Dynamics Sales Accelerator), and sales territories (Salesforce Enterprise Territory Management) are Common. Each fits an existing module (competitors + competitor intelligence -> CRM-PIPELINE-MGT; lead-assignment rules -> CRM-LEAD-MGT; account hierarchies + territories -> CRM-ACCT-MGT; playbooks -> CRM-AI-COPILOT), so none needs a new module.

a1:

---

q2: Two extra module ideas came up in earlier research: a dedicated forecasting module and a marketing-list / segment module. Should I drop both? (yes/no)

Recommended: yes, drop both. Forecasting records (revenue_forecasts, forecast submissions, adjustments, accuracy) are already mastered by the Revenue Intelligence domain (REV-INTEL), so a CRM forecasting module would master nothing new; CRM's forecasting capability is correctly the in-pipeline projection view inside CRM-PIPELINE-MGT. Marketing lists overlap CDP's audience_segments (which CRM-ACCT-MGT already consumes); HubSpot/Zoho lists are a contact-management feature, not a separate deployable. No flagship ships either as a distinct CRM module.

a2:

---

q3: Forecasting records live in REV-INTEL, but CRM has no link to them today. Should I add an optional read-only link so reps see forecast roll-ups inside the pipeline view? (yes/no)

Recommended: yes. A `consumer` (or `derived`) link from CRM-PIPELINE-MGT to REV-INTEL's `revenue_forecasts` matches how Salesforce/Dynamics surface forecast roll-ups on the pipeline without CRM owning the forecast record. Purely additive, no new master.

a3:

---

q4: Per-rep quotas, commission tracking, and partner relationships are real vendor categories, but they belong to Sales Performance Management (quotas, commissions: Xactly, Varicent, Salesforce Spiff) and Partner Relationship Management (Salesforce PRM, Microsoft Partner Center), not to CRM. Both of those domains exist as empty stubs in the catalog (no modules, no data). Want me to queue building SALES-PERF and PRM as their own domains? (yes/no)

Recommended: yes, but as separate domain builds outside this CRM pass. Quotas and commissions are a distinct incentive-comp software market; partner relationships are a distinct PRM market. Folding them into CRM would misplace three masters. CRM stays a consumer of quotas/forecasts and of co-sell opportunity links.

a4:

---

q5: CRM is tagged with GDPR and CPRA today. The flagship vendor surface implies more, but applicability depends on where you operate. What should I add? (pick one)

- a) Add TCPA + CAN-SPAM only (US outbound-calling + bulk-email rules; relevant to the activity layer regardless of region)
- b) Add TCPA + CAN-SPAM plus the privacy regimes for my regions (tell me which of LGPD Brazil, PIPEDA Canada, DPDP India, and the US state laws VCDPA / CPA / CTDPA / UCPA)
- c) Leave it at GDPR + CPRA

Recommended: a) as the baseline, since TCPA and CAN-SPAM bind any outbound calling or bulk email CRM-ACTIVITY drives, then add privacy regimes per region (option b) if you operate in Brazil, Canada, India, or the relevant US states.

a5:

---

<!-- agent map, ignore: q1=B3-CRM-COMPETITORS+B3-CRM-COMPETITOR-INTEL+B3-CRM-LEAD-RULES+B3-CRM-ACCOUNT-HIERARCHIES+B3-CRM-SALES-PLAYBOOKS+B3-CRM-SALES-TERRITORIES q2=B2-CRM-FORECAST-SPLIT+B2-CRM-MKTLIST-SPLIT q3=B3-CRM-FORECAST-CONSUMER q4=B3-CRM-SALES-QUOTAS+B3-CRM-COMMISSION+B3-CRM-PARTNER-REL q5=B3-CRM-REGULATIONS | domain_id=69 -->
