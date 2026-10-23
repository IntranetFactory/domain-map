# 68 tools to double-check (tier unchanged)

Their tier was set from the verb in the name only. Their description contains a word that can hint at multi-record logic or an outside call (`flag word`). Decide if the tier is right: `ok`, or the tier you want.

| # | tool | tier | flag word | description | your tier |
|---|---|---|---|---|---|
| 1 | approve_content_document | semantius_workflow | via | Record an approval decision on a content document in a workflow via Semantius CRUD. | |
| 2 | approve_contract_template | semantius_workflow | template | Approve a template for publication. Workflow gate (in_review -> approved). | |
| 3 | approve_work_approval_step | semantius_workflow | via | Approve a pending approval step on a work item or project via Semantius CRUD. | |
| 4 | archive_library_patron | semantius_workflow | account | Archive a library patron account. | |
| 5 | assess_library_fine | semantius_workflow | account | Assess a fine against a patron account for an overdue, lost, or damaged item. | |
| 6 | certify_entitlement | semantius_workflow | via | Confirm via access certification that the entitlement is still appropriate. Resets the certification timer. | |
| 7 | certify_metric_definition | semantius_workflow | all | Transition a metric definition to certified so it serves all consumers. | |
| 8 | complete_service_project | semantius_workflow | all | Mark a project delivery_complete: all scoped tasks delivered and customer-accepted. | |
| 9 | deprecate_contract_template | semantius_workflow | template | Deprecate a template. Workflow gate. | |
| 10 | mark_integration_degraded | semantius_workflow | sync | Mark an integration as degraded (sync failures). | |
| 11 | open_trust_account | semantius_workflow | account | Transition a trust account into the active operating state. Workflow gate. | |
| 12 | publish_contract_template | semantius_workflow | template | Publish an approved template to the library. | |
| 13 | publish_document_version | semantius_workflow | via | Publish a new authoritative version of a document via Semantius CRUD. | |
| 14 | publish_posting | semantius_workflow | posting | Publish a job posting to job boards / careers site (draft → published). Lifecycle-gate workflow tool. | |
| 15 | retire_inventory_record | semantius_workflow | inventory | Retire a web content inventory record, marking the page out of the governed estate. | |
| 16 | route_content_document | semantius_workflow | via | Route a content document into an approval or review workflow via Semantius CRUD. | |
| 17 | schedule_materialization_refresh | semantius_workflow | refresh via | Schedule a materialization refresh on a cadence via Semantius CRUD. | |
| 18 | subscribe_continuous_monitoring | semantius_workflow | post | Subscribe a worker to post-hire continuous monitoring. | |
| 19 | void_signature_record | semantius_workflow | all | Void a signature envelope before all signers complete. Workflow gate. | |
| 20 | create_beta_program | semantius_crud | cohort | Stand up a beta program for one or more product_features with a defined participant cohort and success criteria. | |
| 21 | create_business_capability_map | semantius_crud | via | Create a business capability map record via Semantius CRUD. | |
| 22 | create_business_process_model | semantius_crud | via | Create a business process model record via Semantius CRUD. | |
| 23 | create_candidate | semantius_crud | via | Create a new ATS candidate record via Semantius CRUD. | |
| 24 | create_change_request | semantius_crud | via | Open a new ITSM change request via Semantius CRUD. | |
| 25 | create_chat_message | semantius_crud | posted | Create a chat message in a channel or DM. Emits chat_message.posted. | |
| 26 | create_contact | semantius_crud | account | Create a contact record under an account. | |
| 27 | create_contract_template | semantius_crud | template | Create a new contract template (draft state). | |
| 28 | create_crm_contact | semantius_crud | via | Create `crm_contacts` records via the platform CRUD primitive. | |
| 29 | create_customer | semantius_crud | account | Create a customer/account record. | |
| 30 | create_dispatch_record | semantius_crud | via | Assign a field visit to a technician via a dispatch record. | |
| 31 | create_engagement_letter | semantius_crud | template | Draft a new engagement letter from a template. | |
| 32 | create_frontline_recognition | semantius_crud | post | Post a recognition for a frontline worker into the team feed. | |
| 33 | create_frontline_task | semantius_crud | push | Push a task or checklist instance to a frontline worker or location. | |
| 34 | create_incident | semantius_crud | via | Open a new ITSM incident via Semantius CRUD. | |
| 35 | create_job_application | semantius_crud | posting | Create a job application linking a candidate to a posting at an initial stage. | |
| 36 | create_job_posting | semantius_crud | posting | Create a job posting record (role title, location, requirements, posting channel). | |
| 37 | create_license_audit | semantius_crud | via | Open a license audit / true-up case record via Semantius CRUD. | |
| 38 | create_metric_access_policy | semantius_crud | via | Create a metric access policy in draft state via Semantius CRUD. | |
| 39 | create_metric_definition | semantius_crud | via | Create a new metric definition in draft state via Semantius CRUD. | |
| 40 | create_notification_template | semantius_crud | template | create a notification template. | |
| 41 | create_okr_check_in | semantius_crud | via | Record an OKR check-in update via Semantius CRUD. | |
| 42 | create_okr_key_result | semantius_crud | via | Create a key result under an objective via Semantius CRUD. | |
| 43 | create_sales_activity | semantius_crud | account | Log a sales activity (call, email, meeting, task) against an account, contact, lead, or opportunity. | |
| 44 | create_sales_quote | semantius_crud | via | Create `sales_quotes` records via the platform CRUD primitive. | |
| 45 | create_social_post | semantius_crud | post | Draft / schedule a social post in the SMM tool. | |
| 46 | create_software_license | semantius_crud | via | Create a software license entitlement record via Semantius CRUD. | |
| 47 | create_software_title | semantius_crud | via | Add a new normalized software product entry to the SAM catalog via Semantius CRUD. | |
| 48 | create_trust_account | semantius_crud | account | Create an IOLTA trust account for a client or matter. | |
| 49 | create_value_stream | semantius_crud | via | Create a value stream record via Semantius CRUD. | |
| 50 | record_advocacy_share | semantius_crud | posted | Record an employee share and advance it through queued, posted, or failed states. | |
| 51 | register_third_party | semantius_crud | inventory | Register a new third party in the inventory from an intake request. | |
| 52 | update_application_value_score | semantius_crud | refresh | Refresh an application's value-score snapshot. | |
| 53 | update_business_process_model | semantius_crud | via | Update a business process model record via Semantius CRUD. | |
| 54 | update_cloud_database | semantius_crud | inventory | Update a cloud database inventory record (mark inventoried, decommissioned, or amend metadata). | |
| 55 | update_cloud_storage_bucket | semantius_crud | inventory | Update a cloud storage bucket inventory record (mark inventoried, decommissioned, or amend metadata). | |
| 56 | update_content_document | semantius_crud | via | Update a content document's metadata, owner, or lifecycle state via Semantius CRUD. | |
| 57 | update_contract_template | semantius_crud | template | Update a template's draft content or metadata before approval. | |
| 58 | update_customer | semantius_crud | account | Update fields on an existing customer/account. | |
| 59 | update_data_warehouse | semantius_crud | inventory | Update a data warehouse inventory record (mark inventoried, decommissioned, or amend metadata). | |
| 60 | update_employee_record | semantius_crud | via | Mutate employee master fields (status, manager, location) via Semantius CRUD. | |
| 61 | update_intranet_content_inventory_record | semantius_crud | inventory | Update inventory record metadata, type classification, or governance status. | |
| 62 | update_license_audit | semantius_crud | via | Update a license audit case (evidence gathered, submitted, negotiating, resolved) via Semantius CRUD. | |
| 63 | update_resource_skill_inventory | semantius_crud | refresh | Refresh a consultant's certified skills, proficiencies and certifications. | |
| 64 | update_saas_app_instance | semantius_crud | inventory | Update a SaaS app instance inventory record (mark inventoried, decommissioned, or amend metadata). | |
| 65 | update_software_license | semantius_crud | via | Update a software license entitlement record (activation, renewal, expiry, retirement) via Semantius CRUD. | |
| 66 | update_software_title | semantius_crud | via | Update a normalized software product entry in the SAM catalog via Semantius CRUD. | |
| 67 | update_target_account_list | semantius_crud | account | Create or update a target account list. | |
| 68 | update_value_stream | semantius_crud | via | Update a value stream record via Semantius CRUD. | |
