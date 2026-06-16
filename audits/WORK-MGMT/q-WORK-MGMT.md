# Work Management (WORK-MGMT): questions waiting for you

## What this domain is
Run every team's projects, tasks, and goals in one place, from first request to finished work.

Bring structured work out of scattered spreadsheets and inboxes. Create projects, break them into assignable tasks with owners and due dates, map dependencies, and watch progress on boards, timelines, and dashboards that update as the work moves. Set team objectives and key results, then connect them to the tasks that move them so progress rolls up automatically. Standardize repeatable work with templates, and let automations handle status changes, reminders, and routing. Built for operations, marketing, and any team running cross-functional work that needs one shared view of who is doing what, by when.

---

q1: Four masters were given a default entity-type classification on a judgment call. You asked how other vendors treat them. Here is the read, then a pick: keep all four as classified, or override one or more?

- a) Keep all four as-is: work automations = catalog, work sections = catalog, work milestones = operational record, OKR key results = operational record.
- b) Override one or more. Tell me which and the new type. The most defensible overrides are work milestones to operational workflow and OKR key results to operational workflow if you read their reached/missed and committed/achieved/missed gates as a steered workflow.

Recommended: a. Vendor reality: work automations are configure-once / fire-many rule definitions a buyer authors and toggles on or off (Asana Rules, monday.com Automations, ClickUp Automations, Wrike) so the definition reads as a catalog config object, and its gated enable/disable lifecycle is permission control over that config, which catalog permits. Work sections are structural containers a buyer defines per project (Asana sections, monday.com groups, ClickUp lists), again a configuration object, so catalog. Work milestones are zero-duration dated gates that are reached or missed (Smartsheet, Wrike, monday.com, MS Project): they carry a state pair but no buyer-steered permission-gated transitions, so operational record fits better than operational workflow. OKR key results are measurable records updated and scored on a cadence (Asana Goals, monday.com, ClickUp, Workfront): operational record is the conservative call, though their committed/achieved/missed lifecycle on the goals module is real, so if you weight those gates as a steered workflow, key results (and arguably milestones) flip to operational workflow. Each is a single-column PATCH either way.

a1:

---

<!-- agent map, ignore: q1=B2-ENTITY-TYPE-AMBIGUOUS | domain_id=135 -->
