# Phase B3 cluster draft — B_people_programs

Lifecycle states and pattern flags for COMP-MGMT, BEN-ADMIN, and LMS data_objects.

## Domain COMP-MGMT — Compensation Management

### compensation_benchmarks

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### compensation_plans

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Plan being designed by total-rewards team. |
| active | 2 | false | false | true | activate | Plan published and assignable to roles, levels, and locations. |
| archived | 3 | false | true | true | archive | Plan retired from new assignments and kept for historical reference. |

### compensation_statements

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Personalized total-rewards letter is per-worker content visible only to the recipient and authorized HR/comp roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Statement generated but not yet released to the worker. |
| generated | 2 | false | false | true | generate | Statement fully assembled with current totals and ready for delivery. |
| delivered | 3 | false | false | true | deliver | Statement released to the worker through the rewards portal or email. |
| acknowledged | 4 | false | true | false | _ | Worker has viewed or acknowledged the statement. |

### equity_grants

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=true

**Justification:** Grant terms are per-worker confidential content (has_personal_content); an explicit equity/board approver gates the granted state (has_single_approver).

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| proposed | 1 | true | false | false | _ | Grant proposed during hire, promotion, or refresh cycle. |
| approved | 2 | false | false | true | approve | Approver (board, compensation committee, or delegate) signs off on the award. |
| granted | 3 | false | false | true | grant | Grant issued in the equity platform with grant date and schedule fixed. |
| vesting | 4 | false | false | false | _ | Grant actively accruing vested shares against the schedule. |
| exercised | 5 | false | true | false | _ | Options exercised or RSUs released to the holder. |
| forfeited | 6 | false | true | true | forfeit | Grant cancelled due to termination or unmet performance condition. |
| expired | 7 | false | true | false | _ | Option grant reached expiration date without exercise. |

### merit_cycles

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| planned | 1 | true | false | false | _ | Cycle configured with budget pool, eligibility, and calendar. |
| open | 2 | false | false | true | open | Cycle live for managers to enter recommendations. |
| calibration | 3 | false | false | true | calibrate | Calibration step underway across leadership cohorts. |
| approval | 4 | false | false | true | approve | Recommendations routed through the approval chain. |
| closed | 5 | false | false | true | close | Approvals complete and recommendations locked for payroll posting. |
| posted | 6 | false | true | true | post | Effective-dated changes posted to HCM and payroll. |

### merit_recommendations

**Pattern flags:** has_personal_content=true; has_submit_lock=true; has_single_approver=true

**Justification:** Per-employee proposed increases are confidential manager-authored content (has_personal_content); recommendations lock on submit (has_submit_lock); a single next-level approver gates approval (has_single_approver).

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Manager entering proposed merit, bonus, and equity refresh amounts. |
| submitted | 2 | false | false | true | submit | Recommendation submitted and locked for review and calibration. |
| approved | 3 | false | false | true | approve | Next-level or comp-committee approver signs off on the recommendation. |
| finalized | 4 | false | true | true | finalize | Approved amounts posted as the effective pay-rate change to payroll. |
| rejected | 5 | false | true | true | reject | Recommendation declined and returned for revision or cycle close. |

### salary_bands

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

## Domain BEN-ADMIN — Benefits Administration

### benefit_carriers

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### benefit_dependents

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Dependent records (relationship, DOB, SSN, documents) are per-employee personal data visible only to the employee and authorized HR/benefits roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| declared | 1 | true | false | false | _ | Employee declared the dependent on the benefits portal. |
| pending_verification | 2 | false | false | false | _ | Dependent-eligibility documents requested and under review. |
| verified | 3 | false | false | true | verify | Documents reviewed and dependent eligibility confirmed. |
| inactive | 4 | false | true | true | deactivate | Dependent no longer eligible (age-out, divorce, death). |

### benefit_enrollments

**Pattern flags:** has_personal_content=true; has_submit_lock=true; has_single_approver=false

**Justification:** Per-employee elections (coverage, contributions, beneficiaries) are confidential personal data (has_personal_content); elections lock on submit at window close or QLE confirmation (has_submit_lock).

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Election started during open enrollment or a life event. |
| elected | 2 | false | false | true | elect | Election submitted and locked for the plan year or event window. |
| active | 3 | false | false | true | activate | Coverage in force after effective date and successful carrier confirmation. |
| terminated | 4 | false | true | true | terminate | Coverage ended due to termination, dependent loss, or new election. |
| waived | 5 | false | true | false | _ | Employee declined the plan during the enrollment window. |

### benefit_open_enrollments

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| planned | 1 | true | false | false | _ | Window configured with plans, eligibility, and communications. |
| open | 2 | false | false | true | open | Window live for employees to elect or change coverage. |
| closed | 3 | false | false | true | close | Window ended and elections locked for processing. |
| processed | 4 | false | true | true | process | Elections finalized, carrier feeds transmitted, and payroll deductions staged. |

### benefit_plans

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Plan being configured by benefits team. |
| active | 2 | false | false | true | activate | Plan published for the plan year and available for elections. |
| inactive | 3 | false | true | true | deactivate | Plan retired from new elections and kept for in-force historical coverage. |

### carrier_feeds

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| scheduled | 1 | true | false | false | _ | Feed run scheduled per cadence or triggered by an event. |
| generating | 2 | false | false | false | _ | Outbound file or API payload being assembled. |
| transmitted | 3 | false | false | true | transmit | Feed delivered to the carrier endpoint (EDI, SFTP, API). |
| acknowledged | 4 | false | true | false | _ | Carrier returned a positive acknowledgment for the payload. |
| failed | 5 | false | true | true | fail | Feed transmission or carrier processing failed and requires remediation. |

### life_events

**Pattern flags:** has_personal_content=true; has_submit_lock=true; has_single_approver=true

**Justification:** Life events carry personal qualifying details (has_personal_content); declarations lock on submit pending documentation (has_submit_lock); a single benefits administrator approves the event (has_single_approver).

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| declared | 1 | true | false | false | _ | Employee declared the qualifying event in the portal. |
| submitted | 2 | false | false | true | submit | Event submitted with supporting documents and locked for review. |
| approved | 3 | false | false | true | approve | Benefits administrator confirmed eligibility and opened the change window. |
| processed | 4 | false | true | true | process | Resulting enrollment changes captured and pushed to carriers and payroll. |
| rejected | 5 | false | true | true | reject | Event declined due to ineligibility or missing documentation. |

## Domain LMS — Learning Management

### compliance_assignments

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| assigned | 1 | true | false | false | _ | Mandatory training assignment created for a learner with due date. |
| in_progress | 2 | false | false | false | _ | Learner has started the underlying course or activity. |
| completed | 3 | false | true | true | complete | Learner finished the assignment within the due window. |
| overdue | 4 | false | false | false | _ | Due date passed without completion and escalation policy engaged. |
| waived | 5 | false | true | true | waive | Assignment formally waived by compliance owner with audit reason. |
| expired | 6 | false | true | true | expire | Assignment closed unmet at the regulatory deadline. |

### course_enrollments

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Per-learner progress, attempts, and scores are personal learning data visible to the learner and authorized L&D and manager roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| enrolled | 1 | true | false | false | _ | Learner enrolled in the course but has not started. |
| in_progress | 2 | false | false | false | _ | Learner has begun the course content or activities. |
| completed | 3 | false | true | true | complete | Learner met all completion criteria with a passing score. |
| failed | 4 | false | true | true | fail | Learner did not meet the passing criteria within allowed attempts. |
| expired | 5 | false | true | true | expire | Enrollment closed unmet at the due date or content expiry. |
| withdrawn | 6 | false | true | true | withdraw | Learner withdrew or was unenrolled before completion. |

### courses

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Course being authored by an instructional designer or SME. |
| in_review | 2 | false | false | false | _ | Content under review by L&D or compliance reviewers. |
| published | 3 | false | false | true | publish | Course released to the catalog and available for enrollment. |
| retired | 4 | false | true | true | retire | Course removed from the catalog and kept for historical transcripts. |

### learner_certifications

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Credentials issued against a named worker are personal credential records subject to row-author visibility for the holder and authorized L&D roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| issued | 1 | true | false | true | issue | Credential awarded to the learner with issue and expiry dates. |
| active | 2 | false | false | false | _ | Credential in force and valid for compliance or role requirements. |
| renewing | 3 | false | false | false | _ | Recertification campaign engaged before expiry. |
| renewed | 4 | false | false | true | renew | Credential renewed with a fresh validity window. |
| expired | 5 | false | true | false | _ | Credential past its expiry date and no longer valid. |
| revoked | 6 | false | true | true | revoke | Credential withdrawn by the issuing body or L&D for cause. |

### learning_paths

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Path being curated by L&D with course sequencing. |
| published | 2 | false | false | true | publish | Path released and assignable to roles, skills, or audiences. |
| retired | 3 | false | true | true | retire | Path removed from new assignments and kept for historical reference. |

### learning_records

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Granular xAPI/SCORM/cmi5 statements are per-learner activity records visible to the learner and authorized L&D and reporting roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| recorded | 1 | true | false | false | _ | Statement captured from the content runtime or external source. |
| validated | 2 | false | true | true | validate | Record validated against schema and posted to the learner transcript. |
| voided | 3 | false | true | true | void | Record voided due to data error, duplicate, or content reset. |

### skill_profiles

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Per-worker skills passport carries self-assessed and inferred proficiencies that are personal-profile data visible to the worker and authorized talent roles.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| initialized | 1 | true | false | false | _ | Profile seeded for the worker from role and prior signals. |
| self_assessed | 2 | false | false | false | _ | Worker has captured self-assessed proficiency levels. |
| validated | 3 | false | false | true | validate | Manager or skills owner validated proficiency entries. |
| inactive | 4 | false | true | true | deactivate | Profile retired (worker exit or role-change reset). |
