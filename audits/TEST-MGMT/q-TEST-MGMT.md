# Test Management (TEST-MGMT): questions waiting for you

## What this domain is
Author, run, and track software tests in one place, then tie results back to the requirements and releases they cover.

Build test cases and suites, group them into plans, execute manual and automated runs across your test environments, and manage the defects those runs surface. Keep automation scripts organized, trace every test back to the requirement it verifies, and feed pass/fail signals out to your delivery pipeline, work tracker, and compliance evidence so release readiness is always visible.

---

q1: (answer this first) How should Test Management be split into modules (the sub-areas of the product)?

- a) One module: a single Test Management Platform covering all eight objects (cases, suites, plans, runs, defects, environments, traceability, automation scripts).
- b) Two modules: Authoring (test cases, suites, plans, requirement traceability) and Execution (test runs, defects, environments, automation scripts).
- c) Four modules: Case Management; Plan Management; Execution; Defects.

Recommended: b. It mirrors the Xray-versus-TestRail surface split, where Xray leads with a case-authoring and requirement-traceability tier and TestRail leads with a run-and-result execution tier, so the two-module authoring-versus-execution shape tracks how these flagship tools actually package the market. This choice is unbuilt today and drives every module, capability, lifecycle, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Two domains, Test Management and your remote-monitoring (RMM) tooling, both claim "automation scripts" as their canonical object, but they mean different things (CI/QA test scripts versus remote endpoint scripts). Which side should rename so the name stops colliding?

- a) Rename the Test Management side to "qa automation scripts" and let RMM keep the bare "automation scripts".
- b) Rename the RMM side to "rmm automation scripts" and let Test Management keep the bare term.
- c) Keep both, demoting one side to an embedded copy rather than a shared master.

Recommended: a. The two are genuinely distinct concepts, and the existing bare object is RMM-shaped (its live description is about remote endpoint execution), so the Test Management side is the cleaner one to qualify. This renames an existing master, so it needs your sign-off before it runs.

a2:

---

q3: Should I schedule your value-stream delivery domain (VSDP) to be modularized alongside this build, so the three test-run handoffs between the two can be fully wired in the same pass? (yes/no)

Recommended: yes. Three handoffs (failed run, completed run, failed pipeline run feeding back) cannot finish their module links until VSDP also modularizes; pairing the two avoids leaving them in a backlog. Say no to accept that those three stay pending until VSDP is audited separately.

a3:

---

q4: Should test defects be flagged as holding personal data? (yes/no)

Recommended: yes if you operate in a regulated industry. Defects routinely carry screenshots, error logs, repro steps, and console output that can include customer data (PII/PHI in healthcare or banking). Keep it off only if your deployment is pure dev-tooling where customer data in defects is incidental.

a4:

---

## Optional (will not hold up the build)

q5: Beyond the eight core objects, several flagship test tools expose deeper execution-side objects (data-driven test data sets, test execution logs, flaky-test signals, and release test gates). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Some of these may turn out to be derived views or fields on test runs rather than first-class objects, so they want a verification pass first.

a5:

---

q6: Two adjacent surfaces look like they may be separate domains rather than part of Test Management: a pure-play test-automation platform (AI/visual/cross-browser execution, including visual baselines) and pure-play API testing. Should I run a research pass to decide whether each is its own domain, a capability here, or a capability elsewhere? (yes/no)

Recommended: yes, but non-blocking. Confirming whether automation-platform-shaped objects belong here re-routes the visual-baseline candidate out of Test Management, so it is worth settling before the module split is finalized, though it does not gate the build.

a6:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B3-1+B3-2+B3-4+B3-5 q6=B3-3+B3-6+B3-7 | domain_id=8 -->
