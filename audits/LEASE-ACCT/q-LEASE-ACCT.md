# Lease Accounting and Administration (LEASE-ACCT): questions waiting for you

## What this domain is

Audit-ready ASC 842 and IFRS 16 lease accounting from contract to disclosure.

Put every lease on the balance sheet with the right right-of-use asset, lease liability, and amortization schedule, then generate the journal entries, disclosures, and audit trail your external auditors will accept. Classify finance versus operating leases under ASC 842 or run the single lessee model under IFRS 16, handle modifications and remeasurements without rebuilding spreadsheets, and track critical dates and lease documents in one place. Built for the controller's team to stay compliant and close on time across the whole lease portfolio.

> Grounding: backed by a fresh Phase 0 vendor-surface study (2026 product docs and M&A) saved at `.tmp_deploy/LEASE-ACCT-phase0-2026-06-14.md`. The point-solution-market test passes: three independent pure-plays whose flagship IS lease accounting (FinQuery/LeaseQuery, Trullion, Occupier). The accounting kernel was built as a clear, unowned market; the two questions below are about the lease-ADMINISTRATION layer, which genuinely overlaps the real-estate domains.

---

q1: (answer this first) Where should the lease ADMINISTRATION record live? The ASC 842 / IFRS 16 accounting kernel is built and unambiguous; this is only about who masters the lease record, critical dates, and documents.

- a) Keep Lease Administration in this domain, mastering its own lease agreements, critical dates, and documents (what is built now).
- b) Thin Lease Administration: read the lease record from Real Estate (property leases) and Commercial Real Estate (commercial leases) as an embedded/consumed record, and keep only the accounting-subledger fields here.
- c) Drop Lease Administration entirely: this domain becomes accounting-only and consumes the lease record from the real-estate domains.

Recommended: a. Every flagship lease-accounting vendor exposes both layers internally, but the three independent pure-plays that make this a market bundle them as one product on the lessee/tenant side: FinQuery (LeaseQuery) masters the lease record and the accounting subledger in one product; Trullion abstracts the lease record from source documents into its own accounting objects; Occupier explicitly markets lease administration plus transaction management plus accounting as one tenant-side platform. The suite players keep administration in the real-estate platform instead: CoStar Real Estate Manager and Nakisa carry the lease record in the RE/IWMS layer with accounting as a subledger on top. The existing Real Estate domain holds leases only as workplace-occupancy records and Commercial Real Estate holds landlord-side commercial leases, neither as an ASC 842 / IFRS 16 audited subledger, so the lessee accounting record is genuinely unowned today. Option (a) matches the pure-plays that define the market; (b) and (c) match the suite shape where a separate RE platform already masters the lease. Note: choosing (c) would leave a seven-capability domain with one module and force re-homing the administration capability.

a1:

---

q2: Should this domain additionally record a consumer link onto the Real Estate and Commercial Real Estate lease records, to make the lessee-versus-occupancy data overlap explicit? (yes/no)

Recommended: no. Real Estate masters property leases as a workplace-occupancy record and Commercial Real Estate masters commercial leases as a landlord-side record, while this domain models lease agreements as the lessee accounting-subledger view: three legitimately different masters of the same real-world lease. The three pure-plays (FinQuery, Trullion, Occupier) do not consume an external real-estate record at all, they master the lease themselves, so the build records only cross-domain reference edges (lease agreements account for the commercial/property lease; lease journal entries post to the general ledger). Add the explicit consumer links (answer yes) only if you run a CoStar or Nakisa-style deployment where the RE platform already masters the lease and this domain reads it; in that case the consumer rows make the silo visible. For the pure-play shape, the reference edges already in place are sufficient.

a2:

---

## Optional (will not hold up the build)

q3: Should I research and add the deeper lease substrate that flagship vendors model (renewals, terminations, payment terms, components, leased assets, GL account mappings, discount and index rate tables, accounting-period closes, SOX control evidence)? (yes/no)

The ten masters loaded cover the certification-grade kernel and the headline administration records. Phase 0 confirmed a deeper substrate uniform across FinQuery, Trullion, Occupier, CoStar Real Estate Manager, and Nakisa: renewals and terminations as first-class events, separable payment terms and lease components, a leased-assets master for equipment leasing, GL mapping and discount/index rate tables (config), accounting-period closes (close control), and explicit SOX control-evidence objects. These are additive and fit the existing two-module shape; some are config/catalog entity types and the SOX-conditional ones ship optional.

Recommended: yes, but additive and after the two questions above are settled, since the scope answer (q1) determines which module the administration-side substrate attaches to.

a3:

---

<!-- agent map, ignore: q1=B2-SCOPE q2=B2-OVERLAP q3=B3-SUBSTRATE | domain_id=175 | modules=356,357 | phase0=.tmp_deploy/LEASE-ACCT-phase0-2026-06-14.md | reversed: none -->
