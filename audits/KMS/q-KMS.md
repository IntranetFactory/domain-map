# Knowledge Management (KMS): questions waiting for you

## What this domain is
Capture, organize, and govern your organization's know-how, then surface the right answer wherever people and assistants ask for it.

Turn scattered tribal knowledge into a single trusted corpus. Authors draft articles, route them through review and approval, publish them to the audiences that need them, and retire what is out of date, with every revision tracked. Organize with categories and taxonomies, group related material into curated collections, and gather reader feedback so weak articles get flagged and fixed. See what people search for, where the answer was found, and where the search came up empty. Feed the same governed corpus to help centers, support agents, and AI assistants so everything draws from one reviewed source of truth.

---

q1: (answer this first) Who owns "knowledge articles" as the master record? Today there are two competing copies of essentially the same thing, one owned by IT Service Management, one by Knowledge Management.

- a) Knowledge Management owns ONE shared article record that IT, HR, and Customer Service all reuse. Cleanest long-term and matches Glean, ServiceNow, Confluence, Notion, but migrating the existing per-domain copies is the most work and could disturb the current IT knowledge setup.
- b) Each domain keeps its own article record, and Knowledge Management steps back to an analytics and reporting layer on top. Least migration, keeps today's structure, but you never get a single source of truth.
- c) Hybrid, two tiers: Knowledge Management owns "enterprise knowledge articles" for company-wide content, while domain-specific articles (for example IT knowledge) stay where they are. Resolves the duplicate without a risky migration.

Recommended: c. Removes the duplicate-owner problem and fits the catalog as actually built, without the costly rip-out that (a) needs. Choose (a) if you want a true single corpus and accept the migration cost. This decides which modules KMS gets and almost everything below, so it unlocks the rest of the build.

a1:

---

q2: Only if you picked (b) above: the catalog text currently describes KMS as a system of record. Should I rewrite it to an "analytics on top of your existing wikis" voice? (yes/no)

Recommended: no (keep as written), unless you chose (b), then yes.

a2:

---

q3: Should KMS advertise all eight standard knowledge capabilities (authoring, taxonomy, publication workflow, verification cycles, feedback loop, analytics, governance, AI assist)? If not all, tell me which to drop. (yes/no)

Recommended: yes. They are all standard for modern knowledge platforms, and you need at least three for a valid module split.

a3:

---

q4: Which regulations should attach? Currently only ISO/IEC 27001 is set.

- a) Add ISO 30401 (the knowledge-management standard) plus GDPR
- b) Add ISO 30401 only
- c) Add ISO 30401 plus GDPR plus some of HIPAA / SEC 17a-4 / FERPA (tell me which)
- d) Leave as is (ISO 27001 only)

Recommended: a. ISO 30401 is directly on point and GDPR covers personal data in articles and search queries. Choose (c) only if you serve healthcare, financial, or education customers.

a4:

---

q5: One incoming link (from Document Management) was auto-tagged to a process category called "Document trade", almost certainly a mistake (it matched the word "trade"). A correct tag, "Deliver approved content", is already in place. Should I remove the wrong tag? (yes/no)

Recommended: yes. It is a cleanup; removing a tag is a deletion, so I need your OK.

a5:

---

q6: Search queries people type can contain personal information (for example "how do I update Jane Doe's address"). Should search-query records be marked as containing personal data, so retention and privacy controls apply? (yes/no)

Recommended: yes.

a6:

---

q7: Should I add simple status workflows to two objects: article revisions (draft, in review, approved, published, superseded) and collections (draft, published, archived)? They are optional. (yes/no)

Recommended: yes. Cheap, and it makes the workflow explicit.

a7:

---

q8: 17 cross-domain "knowledge flow" links have been drafted and are waiting for your sign-off to become final (for example: when an HR case resolves, feed it to the knowledge base; when an article publishes, notify Customer Service). Should I approve all 17? (yes/no)

Recommended: yes. I cannot approve my own drafts; your OK flips them to final.

a8:

---

## Optional (will not hold up the build)

q9: Should I add an article-owner / steward entity (who maintains each article)? Other candidates (article subscriptions, scheduled verification cycles, search synonyms) wait until q1 is settled. (yes/no)

Recommended: yes. Article ownership is universal across knowledge platforms.

a9:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7 q8=B1B-H1-APPROVE q9=B3-1 | domain_id=33 -->
