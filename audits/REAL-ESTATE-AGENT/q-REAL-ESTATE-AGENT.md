# Real Estate Agent (solo / small firm bundle) (REAL-ESTATE-AGENT): questions waiting for you

## What this domain is

A working surface for the real-estate agent.

Bring contacts, listings, and the documents behind each deal into one agent-facing workspace. Move leads forward, keep listing and transaction paperwork organized, and stay on top of every active deal from a single view that travels with the agent across the systems they already use.

---

q1: A lead is described as converting into "a contact, account, and opportunity", but this bundle carries contacts only, with no accounts or opportunities. Reword this text so it stays true here? (yes/no)

- Catalog description, now: "Prospects captured before qualification, tracking source, score, status, assigned rep, and the contact and account they would convert into."
- Catalog description, new: "Prospects captured before qualification, tracking source, score, status, assigned rep, and what they would convert into."
- Analyst description, new: "Pre-qualification prospect record: source, score, status (new/working/qualified/disqualified/converted), assigned rep, and what it would convert into."
- State `converted`, now: "Lead has been converted into a contact, account, and opportunity."
- State `converted`, new: "Lead has been converted."

Recommended: yes. The text is shared with CRM-LEAD-MGT, RE-BROK-AGENT-OPS, B2C-COMM-ORDER-CAPTURE and SMM-ENGAGEMENT. The new wording stays true there, and the relationships from a lead to accounts and opportunities stay in the catalog. It needs your sign-off because it overwrites existing text.

a1:

---

q2: A sold listing is described as triggering events to "property-management, CRE, and investment systems", which this bundle does not have. Reword this state so it does not claim actions by other systems? (yes/no)

- State `sold`, now: "Transaction closed; listing terminated as a sale. Triggers downstream events to property-management, CRE, and investment systems."
- State `sold`, new: "Transaction closed; listing terminated as a sale."

Recommended: yes. Facts about other systems belong in handoffs, and this sentence is false wherever those systems are not installed. I have not checked that a handoff exists for each one, so tell me if you want that checked first. It needs your sign-off because it overwrites existing text.

a2:

---

q3: A closed transaction is described as "Commission splits become payable; downstream domains notified", but this bundle does not carry commission splits. Reword this state so it stays true here? (yes/no)

- State `closed`, now: "Deed recorded, funds disbursed via escrow; transaction complete. Commission splits become payable; downstream domains notified."
- State `closed`, new: "Deed recorded, funds disbursed via escrow; transaction complete."

Recommended: yes. The brokerage modules (RE-BROK-AGENT-OPS, RE-BROK-BROKERAGE-OPS) lose the sentence, but the relationship from a transaction to its commission splits stays in the catalog. It needs your sign-off because it overwrites existing text.

a3:

---

q4: Two contract states describe things this bundle does not have: a draft "created in CLM-AUTHORING" or received "from CPQ/sourcing", and an amendment as "a separate record". Reword these states so they stay true here? (yes/no)

- State `draft`, now: "Initial draft created in CLM-AUTHORING from a template, or received via inbound handoff from CPQ/sourcing."
- State `draft`, new: "Initial draft created from a template, or received from another party or system."
- State `amended`, now: "An amendment has been executed against this contract. Amendment is a separate record; this contract row reflects the amended terms going forward."
- State `amended`, new: "An amendment has been executed against this contract; this row reflects the amended terms going forward."

Recommended: yes. The new wording stays true in all nine modules that hold contracts, and it removes a module code from text a buyer can read. It needs your sign-off because it overwrites existing text.

a4:

---

<!-- agent map, ignore: q1=B2-SUBSET-TEXT-CRM-LEADS q2=B2-SUBSET-TEXT-RE-LISTINGS q3=B2-SUBSET-TEXT-RE-TRANSACTIONS q4=B2-SUBSET-TEXT-LEGAL-CONTRACTS | domain_id=188 -->
