# IT Operations Starter (IT-OPS-STARTER): questions waiting for you

## What this domain is

Run your whole IT shop from one place: tickets, devices, SaaS renewals, and contracts, without the spreadsheets.

One place to manage IT for a small team. Track the hardware you own and who has it, every SaaS app and when its subscription renews, and the contracts behind them, so nothing slips through a spreadsheet and no renewal catches you off guard. Add a lightweight helpdesk for tickets and requests if you do not already run one, or keep the one you have. Start with the renewal and contract essentials and turn on the device, SaaS, and helpdesk pieces as you need them. Built for IT teams that have outgrown spreadsheets but do not need a full enterprise IT suite.

---

q1: Two states of a SaaS application say other systems act: "IGA provisioning, FINOPS spend tracking, and ITAM registration activated" and "ITSM closes related tickets; IGA revokes access; FINOPS terminates spend". A deployment of this starter may have none of those systems. Reword these states so they do not claim actions by other systems? (yes/no)

- State `sanctioned`, now: "App is officially supported; IGA provisioning, FINOPS spend tracking, and ITAM registration activated."
- State `sanctioned`, new: "App is officially supported."
- State `deprovisioned`, now: "App removed tenant-wide. ITSM closes related tickets; IGA revokes access; FINOPS terminates spend."
- State `deprovisioned`, new: "App removed tenant-wide."

Recommended: yes. Facts about other systems belong in handoffs, and these sentences are false wherever those systems are not installed, which also includes the full SMP modules deployed alone. I have not checked that a handoff exists for each one, so tell me if you want that checked first. It needs your sign-off because it overwrites existing text.

a1:

---

<!-- agent map, ignore: q1=B2-SUBSET-TEXT-SAAS-APPLICATIONS | domain_id=190 -->
