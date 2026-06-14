# Process Mining (PROC-MIN): questions waiting for you

## What this domain is
See how your processes actually run. Mine event logs from ERP, CRM, and case systems to surface bottlenecks, deviations, and improvement opportunities.

Pull the real activity trail out of your operational systems, then let the algorithms reconstruct the as-is process, compare it against the model it should follow, and flag where reality drifts. Spot the variants and bottlenecks that slow work down, mine the implicit business rules people actually follow, and turn each finding into a quantified improvement opportunity your operations and audit teams can act on.

---

q1: (answer this first) How should Process Mining be split into modules (the sub-areas of the product)?

- a) Four modules: Ingestion (event-log intake and extraction); Discovery (mined process models and variants); Conformance (conformance checks and mined business rules); Insights (bottlenecks and improvement opportunities).
- b) Five modules: same as (a) plus an Action module (automation that fires from a finding).
- c) Three modules: collapse Ingestion and Discovery into one Mining core module, keeping Conformance and Insights separate.
- d) Defer the split until the vendor-surface research lands.

Recommended: a. The four-module split matches how the major process-mining platforms (Celonis, SAP Signavio, UiPath) present their product, and seven proposed capabilities mean at least two modules are required anyway. This is the single highest-leverage decision: the structural sweeps, module attribution, role authoring, and handoff backfill are all blocked on it, so it unlocks the rest of the build.

a1:

---

q2: Which capability set should Process Mining adopt?

- a) The seven proposed capabilities: event-log ingestion, process discovery, process conformance checking, process variant analysis, process bottleneck identification, process improvement opportunity identification, business rule mining.
- b) The same seven plus task mining.
- c) The seven minus task mining (route task mining to its own candidate domain or a sub-module later).
- d) Rename the set to align with the APQC Process Improvement vocabulary.

Recommended: a. The seven capabilities cover the loaded masters cleanly without committing to task mining, which is still an open domain-versus-sub-module question. The capability count also drives the module count in q1, so resolve the two together.

a2:

---

q3: Should the master currently named business_rules_extracted be renamed to extracted_business_rules?

- a) Rename to extracted_business_rules (noun-phrase-plural, PCF-aligned).
- b) Leave it as business_rules_extracted.
- c) Pick another form (for example mined_business_rules or inferred_business_rules).

Recommended: a. It is the only master that reads adjective-trailing while every other master is noun-phrase-plural, and the display labels are already "Extracted Business Rule". Deciding now keeps the aliases, the trigger event, and future references consistent.

a3:

---

q4: Should event logs be marked as containing personal data, since they often carry user IDs and sometimes email addresses? (yes/no)

Recommended: yes. Event logs routinely include employee and customer identifiers, so they should be treated as personal data. This overwrites the current value, so it needs your confirmation.

a4:

---

q5: Should a discovered process model be frozen once published, so downstream conformance checks have a stable baseline? (yes/no)

Recommended: yes. Conformance results are only meaningful against a fixed reference model, so locking the model on publish protects them. This overwrites the current value, so it needs your confirmation.

a5:

---

q6: Should a conformance result be frozen once recorded, so these audit-style snapshots cannot be quietly edited? (yes/no)

Recommended: yes. Conformance results are time-stamped, audit-grade records that audit and compliance teams rely on. This overwrites the current value, so it needs your confirmation.

a6:

---

q7: Four description and business-logic cells still contain em-dashes (forbidden by the project style rule). How should they be handled?

- a) Rewrite all four cells this cycle (you supply the wording or approve drafts row by row).
- b) Defer to a cross-domain em-dash cleanup pass.
- c) Leave them (the fact-sheet emitter strips em-dashes at render time as a safety net).

Recommended: a. The em-dashes should come out of the source data rather than relying on the render-time net. Each rewrite overwrites a non-empty cell, so it needs your wording or sign-off.

a7:

---

q9: One process-mapping tag points at the wrong process. The "conformance deviation detected" handoff to the business-process-automation team is labeled "Manage non-conformance", but the business-process-model record it ships is actually handled under "Publish processes". How should the tag be fixed?

- a) Re-point the tag to "Publish processes" (13.1.3.5), where the record's work actually lives.
- b) Delete the tag and leave the handoff untagged (a later discovery pass picks a fresh one).
- c) Leave the "Manage non-conformance" tag as is.

Recommended: a. The record this handoff carries is published-process work, so "Publish processes" is the correct home; the existing label was a low-confidence automatic substring match. Re-pointing overwrites the existing tag, so it needs your sign-off.

a9:

---

## Optional (will not hold up the build)

q8: Eight additional market-surface objects show up across the flagship process-mining vendors (data-source connections, event-log extraction runs, event-log quality findings, process KPIs, improvement opportunities, automation flows that fire from a finding, compliance-control evaluations, and industry benchmarks). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules exist. The ingestion-layer candidates in particular (connections, extractions, quality findings) are the operational entry point for every process-mining workflow and are currently invisible to the catalog; each still wants a verification pass first.

a8:

---

<!-- agent map, ignore: q1=B2-MODULARIZATION q2=B2-CAPABILITIES q3=B2-NAMING-RULES q4=B2-PATTERN-FLAGS.eventlogs q5=B2-PATTERN-FLAGS.discoveredmodels q6=B2-PATTERN-FLAGS.conformance q7=B2-EM-DASHES q9=B2-B9D-MISTAG-183 q8=B3-DATA-SOURCE-CONNECTIONS,B3-EVENT-LOG-EXTRACTIONS,B3-EVENT-LOG-QUALITY,B3-PROCESS-KPIS,B3-IMPROVEMENT-OPPORTUNITIES,B3-PROCESS-AUTOMATIONS,B3-COMPLIANCE-CONTROLS-EVALUATIONS,B3-PROCESS-BENCHMARKS | domain_id=40 -->
