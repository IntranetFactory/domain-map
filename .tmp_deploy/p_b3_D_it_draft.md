# Phase B3 cluster draft — D_it

## Domain ITSM

### knowledge_articles

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=false

**Justification:** Authoring follows draft → in_review which locks the body from further free editing until reviewer action; content is shared organizational knowledge, not per-user.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Author is drafting the article; freely editable. |
| in_review | 2 | false | false | false | _ | Submitted for editorial/SME review; body locked from free edits. |
| published | 3 | false | false | true | publish_article | Article is live and visible to consumers. |
| retired | 4 | false | true | false | _ | Article withdrawn from circulation; retained for audit. |

### service_catalog_items

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### service_changes

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Each change requires explicit CAB / change-manager approval before implementation; the `approved` transition is gated by a single designated approver.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Change record being authored by the requester. |
| submitted | 2 | false | false | false | _ | Submitted to CAB / change manager for review. |
| approved | 3 | false | false | true | approve_change | Approver has authorized the change to proceed. |
| implementing | 4 | false | false | false | _ | Change is being executed in the implementation window. |
| review | 5 | false | false | false | _ | Post-implementation review (success, back-out, lessons). |
| closed | 6 | false | true | false | _ | Change record finalized after PIR. |
| rejected | 7 | false | true | false | _ | Approver rejected the change; will not be implemented. |
| cancelled | 8 | false | true | false | _ | Change withdrawn by requester before approval/implementation. |

### service_incidents

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| new | 1 | true | false | false | _ | Incident has been logged; not yet triaged or routed. |
| assigned | 2 | false | false | false | _ | Triaged and assigned to a support group or agent. |
| in_progress | 3 | false | false | false | _ | Assignee is actively diagnosing or working the incident. |
| resolved | 4 | false | false | true | _ | Workaround or fix delivered; awaiting reporter confirmation. |
| closed | 5 | false | true | true | _ | Resolution confirmed; incident archived and SLA clock stopped. |
| cancelled | 6 | false | true | false | _ | Incident withdrawn (duplicate, invalid, raised in error). |

### service_problems

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| identified | 1 | true | false | false | _ | Problem record opened from one or more correlated incidents. |
| analyzed | 2 | false | false | false | _ | Root-cause analysis in progress. |
| known_error | 3 | false | false | false | _ | Root cause identified; workaround documented. |
| resolved | 4 | false | false | true | _ | Permanent fix delivered (typically via a change). |
| closed | 5 | false | true | false | _ | Problem record finalized; no further action required. |

### service_requests

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Catalog-driven requests typically require an explicit single approver (line manager or budget owner) to authorize fulfillment.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| submitted | 1 | true | false | false | _ | Requester has submitted the catalog request. |
| approved | 2 | false | false | true | _ | Approver has authorized fulfillment. |
| fulfilling | 3 | false | false | false | _ | Fulfillment team is provisioning or executing the request. |
| fulfilled | 4 | false | false | false | _ | Item or access has been delivered to the requester. |
| closed | 5 | false | true | false | _ | Request archived after requester confirmation. |
| cancelled | 6 | false | true | false | _ | Request withdrawn or rejected before fulfillment. |

### service_slas

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

## Domain CMDB

### ci_baselines

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### ci_classes

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### ci_relationships

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### configuration_items

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| discovered | 1 | true | false | false | _ | CI auto-detected by discovery feed; not yet curated. |
| registered | 2 | false | false | false | _ | CI record curated and accepted into the CMDB of record. |
| in_use | 3 | false | false | false | _ | CI is actively in operational use. |
| retired | 4 | false | false | false | _ | CI taken out of service but record retained. |
| archived | 5 | false | true | false | _ | CI record archived after retirement; read-only for audit. |

### service_maps

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

## Domain ITAM

### asset_contracts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Contract record being entered into the ITAM index. |
| active | 2 | false | false | false | _ | Contract is in force and covering the linked assets. |
| expiring | 3 | false | false | false | _ | Contract within the renewal window; action required. |
| expired | 4 | false | true | false | _ | Contract term ended without renewal. |
| terminated | 5 | false | true | false | _ | Contract ended early by either party. |

### asset_lifecycle_events

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

## Domain KMS

### article_feedback

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Each feedback row is scoped to the submitting user (their rating, vote, comment); visibility/edit default to the row author.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| submitted | 1 | true | false | false | _ | Feedback captured from the consumer. |
| triaged | 2 | false | false | false | _ | KB team has reviewed the signal and routed any follow-up. |
| closed | 3 | false | true | false | _ | Feedback acknowledged and any follow-up completed. |

### article_revisions

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### knowledge_base_articles

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=false

**Justification:** Authoring follows draft → in_review which locks the body from further free editing until reviewer action; content is shared organizational knowledge, not per-user.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Author is drafting the article; freely editable. |
| in_review | 2 | false | false | false | _ | Submitted for editorial/SME review; body locked from free edits. |
| published | 3 | false | false | true | publish_article | Article is live and visible to consumers. |
| retired | 4 | false | true | false | _ | Article withdrawn from circulation; retained for audit. |

### knowledge_categories

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### knowledge_collections

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### knowledge_search_queries

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
