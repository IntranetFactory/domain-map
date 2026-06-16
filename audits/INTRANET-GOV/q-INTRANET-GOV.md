# Intranet Governance (INTRANET-GOV): questions waiting for you

## What this domain is
Know what is in every intranet, who owns it, and whether it is still true, without replacing the intranet you have.

Map every page, hub, library, and form across the intranets you already run, then make someone accountable for each one. Assign owners and review cadences, run recertification cycles so content gets confirmed current or flagged stale, and turn what you find into a prioritized improvement backlog. Connect SharePoint, Viva, Staffbase, Simpplr, or WordPress as governed sources and govern them from one place. Built for the digital-workplace and internal-comms teams who inherit stale, abandoned, unowned content nobody trusts. It is an accountability layer over your existing intranets, not another intranet to migrate to.

> Note on your last answers: a1, a3, and a4 were questions back to me rather than picks, so I answered them and re-folded each into the question below (they are still open for your decision). a2 was blank, which I read as "go with the recommendation" (the findings entity), but that one depends on q1, so I have parked your preference and it will apply automatically once you pick q1, nothing was written to the catalog yet.

---

q1: (answer this first) The domain stores per-content recertification records but nothing that DRIVES recertification on a schedule across many pages at once. Should I add the engine that runs the cycles, and if I split the Governance module, can the setup half be an optional add-on you only turn on at scale?

You asked: "could one part of the split become an optional module, used when volume justifies it?" Yes. In this catalog an optional module (a deploy-time opt-in) is exactly the mechanism for that, and the Policy & Campaign setup layer is the deferrable half: you do not need scheduled cycles until content volume and owner turnover outgrow doing it by hand, while the day-to-day attesting and fixing belongs in the base module. So I have added that as option (c).

- a) Add two things to the existing Governance module (no split): a governance policy (the rules: how often to review, what counts as stale, what to archive, which content it applies to) and a recertification campaign (a scheduled batch that asks every owner to confirm their content and tracks who has and has not responded).
- b) Add both AND split Governance into two always-deployed modules: a Policy & Campaign setup module and an Attestation & Remediation execution module.
- c) Add both AND make the Policy & Campaign setup layer an OPTIONAL add-on module (turn it on once volume justifies scheduled cycles), keeping the day-to-day attesting and fixing in the base module.
- d) Leave it as-is: owners attest content one page at a time, with no scheduled cycle.

Recommended: a. Running recertification on a cadence is the domain's headline promise, and every adjacent tool drives it from exactly this pair: Microsoft SharePoint Advanced Management ships a recurring "Site Attestation Policy" plus inactive-site policies, Orchestry runs "Review Recurrence" campaigns with archival/renewal policies, ShareGate Protect runs recurring access reviews, and Simpplr enforces per-page validation windows. All package the cadence driver as a policy (the rules) that spawns a batch (the campaign) of per-record attestations, which is exactly the pair we lack. The 2-module split we already have matches vendor packaging; splitting Governance further into setup vs execution (b/c) only pays off once policies, campaigns, and findings all exist, so add the entities first and revisit the split then. Your volume-gated instinct is sound: if you do want it modular now, (c) is the better split than (b) because the vendors themselves phase it that way (per-page validation first, a campaign engine when scale demands). Choice (d) keeps the MVP honest but means no scheduled cycle, which undercuts the main reason to buy this. This decision gates q2 and q3.

a1:

---

q2: Right now "stale" or "orphaned" content is only a number on a health score. Should each problem become its own trackable record (what is wrong, how bad, which page, who is fixing it, is it resolved)?

Note: you left this blank last time, which I read as the recommendation (option a). I have saved that preference, but this one depends on q1 (the findings live wherever q1 puts the engine), so I did not create anything yet, it will apply automatically once you answer q1.

- a) Add a governance findings record for the content problems we already detect (stale, orphaned, inactive), and make the health score a roll-up of those findings.
- b) Same as (a), and also track permissions / oversharing problems (who can see content that should be restricted).
- c) Keep it as a score only, no per-problem record.

Recommended: a. Orchestry, SharePoint Advanced Management, ShareGate Protect, Acquia Optimize, and Siteimprove all make findings a first-class record you can assign and close, and all treat the score as a view over the findings, not a replacement. A bare score tells you something is wrong but gives the workflow nothing to route or close. Start with the content-quality findings we already detect (a); oversharing / permissions (b) is real but overlaps with collaboration-governance tooling and can wait. This depends on q1 (findings are generated by the policies you add there).

a2:

---

q3: The Accessibility Governance capability is currently just a scan. Should accessibility become a tracked, standards-anchored record (which standard, what level, pass or fail, with an audit trail), and if so, where should it live?

You asked: "would that be an optional module?" It could be, but the cleaner home is the base Inventory module, where the accessibility scan already lives. A separate opt-in accessibility module only pays off if you deploy accessibility governance selectively for some orgs and not others. Neither accessibility vendor sells conformance as a separable add-on, it sits in the same product as the scan, so I have framed this as base-module (a) vs optional-module (b).

- a) Add an accessibility conformance record AND register the standards (WCAG 2.2, EN 301 549, the European Accessibility Act), in the base Inventory module where the scan already lives. (I already linked ADA and Section 508 to this domain in the earlier pass.)
- b) Same as (a), but ship the conformance record as its own OPTIONAL accessibility module (deploy-time opt-in).
- c) Just register the standards, keep accessibility as a scan only (no conformance record).
- d) Neither: leave accessibility as a scan with no standards or conformance tracking.

Recommended: a. Both accessibility specialists in this space (Siteimprove, Acquia Optimize) model conformance as a first-class, audited record evaluated against WCAG and EN 301 549: Siteimprove tracks conformance plus QA issues and content policies, and Acquia Optimize keeps an accessibility tracker with an audit log, PDF audits, and remediation requests. The European Accessibility Act has been enforceable since June 2025, so "we scanned it once" is no longer the same as "we can show conformance over time". Because the conformance record is realized by the same Accessibility Governance capability whose scan already lives in the base Inventory module, that is its natural home (a); split it into an optional module (b) only if you want accessibility governance to be a deploy-time choice. Pick (c) if you want the regulations on file but are not ready to model conformance as a tracked entity; (d) only if accessibility governance is out of scope (in which case the Accessibility Governance capability itself should be reconsidered).

a3:

---

## Optional (will not hold up the build)

q4: Improvements found during governance currently become a generic work item handed to Work Management. Should there be a dedicated, typed improvement / remediation record instead (linking a finding to its fix to the content it cleared)? (yes/no)

You asked: "can we have a basic embedded Work Management?" You already do. The domain embeds Work Management today: improvements become generic work items (mastered by Work Management, embedded into the Governance module as an optional embed), so basic embedded task handling is live now. This q4 is only about whether to add a domain-specific remediation record ON TOP of that generic embed.

Recommended: yes, but only after q2. The build originally proposed a typed improvement record and dropped it in favor of the generic work-item handoff (which works fine today). A typed record pays off once findings (q2) exist, because then you can trace finding -> remediation -> recertified. Acquia Optimize and Siteimprove both model typed remediation requests; ShareGate touches it secondarily. Non-blocking: the generic embedded handoff is fine until then.

a4:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B3-S1 | domain_id=171 | phase0=.tmp_deploy/INTRANET-GOV-phase0-2026-06-10.md | market-surface=.tmp_deploy/INTRANET-GOV-market-surface-2026-06-10.md | a-file processed 2026-06-16: a1/a3/a4 were user questions (kept open, answers folded in); a2 empty=recommended(a) but blocked on B2-S1 (preference parked) | reversed: A3-mark-solutions-primary (build phase0 white-space verdict overrode it) -->
