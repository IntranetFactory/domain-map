# Customer Relationship Management (CRM): questions waiting for you

## What this domain is

Run the full sales relationship in one place: keep a clean record of every customer, contact, lead, and open deal, and move each one forward through your pipeline. Capture the calls, emails, and meetings tied to each account, and let an AI copilot layer surface the next best action on top of it all. Everything below is optional research: the build shape (5 modules) and every blocking decision are already settled, so none of these will hold up the build.

---

## Optional (will not hold up the build)

q1: Several sales objects show up across the flagship CRM vendors that we do not model yet (sales territories, per-rep quotas, sales forecasts, sales playbooks, competitors, competitor intelligence, lead-assignment rules, account hierarchies, partner relationships, and commission records). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and only after a boundary check. Several of these likely belong elsewhere (quotas and commissions to a sales-performance or commissions domain, partner relationships to PRM), so each needs a verification pass before it lands in CRM.

a1:

---

q2: Two possible extra module surfaces show up in the vendor set: a dedicated forecasting module (split out of the current pipeline module if forecast and quota records ever land) and a marketing-list / segment module (which overlaps with the CDP audience-segment surface). Should I research whether either is worth its own module? (yes/no)

Recommended: yes, but non-blocking. The forecasting module only makes sense once the forecast and quota records exist, and the marketing-list boundary against CDP needs clarifying before adding a module.

a2:

---

q3: Today CRM is tagged with two privacy regulations (GDPR and CPRA). Should I research and add the broader set the flagship vendors imply (for example LGPD, PIPEDA, TCPA on outbound calling, CAN-SPAM on bulk email, India's DPDP Act, and the US state laws VCDPA, CPA, CTDPA, UCPA)? (yes/no)

Recommended: yes, but additive and non-blocking. These broaden compliance coverage for outbound calling and email activity; add the ones that apply to your operating regions.

a3:

---

<!-- agent map, ignore: q1=B3-CRM-SALES-TERRITORIES+B3-CRM-SALES-QUOTAS+B3-CRM-SALES-FORECASTS+B3-CRM-SALES-PLAYBOOKS+B3-CRM-COMPETITORS+B3-CRM-COMPETITOR-INTEL+B3-CRM-LEAD-RULES+B3-CRM-ACCOUNT-HIERARCHIES+B3-CRM-PARTNER-REL+B3-CRM-COMMISSION q2=B3-CRM-FORECAST-MODULE+B3-CRM-MARKETING-LIST-MODULE q3=B3-CRM-REGULATIONS | domain_id=69 -->
