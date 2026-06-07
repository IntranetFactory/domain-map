# Kubernetes Platform (KUBE-PLAT): questions waiting for you

## What this domain is
Run production Kubernetes as a managed platform: provision and operate clusters, then deploy and keep the workloads on them healthy. This covers the cluster substrate (clusters, node pools, add-ons, upgrades, registries) and the workload layer (container workloads, Helm releases, operators, service meshes, delivery pipelines), with the day-2 operations that keep both running. It is the platform-engineering layer that gives teams production-grade Kubernetes without building it from scratch.

---

q1: (answer this first) How should Kubernetes Platform be split into modules (the sub-areas of the product)?

- a) Two modules: Distribution Ops (clusters, node pools, add-ons, upgrades, registries) and Workload Ops (container workloads, Helm releases, operators, service meshes, pipelines). Mirrors the natural cluster-versus-workload split most vendors use.
- b) One module covering the whole eight-object surface. Simpler, but the capability count will land at five to seven and force a two-module split anyway.

Recommended: a. Two modules match how the major distributions present the product and keep each area small enough to own cleanly; one module is unstable because the capability count will trip the two-module rule. This choice drives the whole unbuilt build (capabilities, solutions, lifecycle states, per-handoff module links, roles), so it unlocks everything below it.

a1:

---

q2: For the relationships between the eight Kubernetes objects (and the one clean cross-domain link to IT service incidents), should I use the proposed link shapes (clusters own their node pools; everything else is a plain reference)?

- a) Approve the proposed shapes (parent for clusters to node pools, reference for the rest, direction per the verb).
- b) You will supply the exact shape for each link.

Recommended: a. The proposed shapes follow the obvious ownership (node pools belong to a cluster) and reference (everything else is an independent object), so approving them lets the edges load.

a2:

---

q3: Should I also load vendor-brand cluster name variants (distribution-specific cluster names) as aliases once the solution records exist, or are the generic synonyms already loaded enough?

- a) Load vendor-brand cluster variants as solution-term aliases once the solutions are in place.
- b) Skip vendor-brand aliases; the generic synonyms already loaded are sufficient.

Recommended: a. Vendor-brand names are how buyers actually search, so they improve match quality; they just have to wait for the solution records to exist first.

a3:

---

q4: Kubernetes Platform itself is not a regulated market, but production clusters often host FedRAMP, PCI, HIPAA, or SOC2 workloads. Should the domain carry advisory compliance rows?

- a) No compliance rows; Kubernetes Platform is substrate-only and compliance attaches at the workload domain.
- b) Load advisory rows (FedRAMP, PCI, HIPAA, SOC2) marked as applicable only when the hosted workloads require it.

Recommended: a. The cluster is not the regulated artifact; compliance belongs to the workloads it runs, which is how the rest of the catalog treats substrate domains.

a4:

---

q5: Which neighboring-domain objects should Kubernetes Platform declare that it consumes (so its dependency map is real)?

- a) Declare services (ITSM), assets (ITAM), and vulnerabilities (vulnerability management) as optional consumed dependencies; defer secrets, identities, and git repositories until those source domains exist.
- b) Declare all six (the above plus secrets, identities, git repositories) as optional consumed dependencies.
- c) Leave all undeclared until each neighboring object is referenced by a real workflow.

Recommended: a. Services, assets, and vulnerabilities are clearly consumed today and their source domains exist; the other three depend on domains that may not be loaded yet, so they are better deferred.

a5:

---

q6: Once modules exist, should Kubernetes Platform get its own roles (cluster admin, platform engineer, namespace owner) or inherit platform-engineering roles from elsewhere?

- a) Author Kubernetes Platform roles spanning both modules.
- b) Inherit from APP-PAAS or generic platform-engineering roles in another domain (no local roles).
- c) Defer until the two-module split is in place and the natural personas surface.

Recommended: a. A two-module domain needs its own role floor, and cluster admin / platform engineer / namespace owner are the standard personas for this market.

a6:

---

q7: Service meshes are currently mastered here, but Istio, Linkerd, Consul Connect, and Cilium Service Mesh are pure-play vendors with a distinct buyer. Should service meshes be promoted to their own domain?

- a) Promote: remove the service-meshes master from Kubernetes Platform and add it to a new Service Mesh domain after it is vetted.
- b) Keep service meshes mastered here and ship reference shells in a Service Mesh domain later.
- c) Defer until a Service Mesh domain is itself loaded.

Recommended: b. Keeping the master here avoids deleting a master row before the target domain exists; the reference-shell approach gives the future Service Mesh domain a foothold without a destructive move. Option (a) deletes a master row, so it needs your sign-off.

a7:

---

q8: Container registries are currently mastered here, but Harbor, JFrog Artifactory, Docker Hub, and Quay are pure-play vendors. Should container registries be promoted to their own domain?

- a) Promote: remove the container-registries master from Kubernetes Platform and add it to a new Container Registry domain after it is vetted.
- b) Keep container registries mastered here and ship reference shells in a Container Registry domain later.
- c) Defer until a Container Registry domain is itself loaded.

Recommended: b. Same reasoning as service meshes: keep the master until the target domain is real, rather than deleting a master row now. Option (a) deletes a master row, so it needs your sign-off.

a8:

---

q9: Is APP-PAAS the right parent domain for Kubernetes Platform (Kubernetes is the substrate the PaaS sits on)?

- a) Keep APP-PAAS as the parent.
- b) Create a new "Cloud Native Platform" parent domain.
- c) Clear the parent and make Kubernetes Platform top-level.

Recommended: a. APP-PAAS is the layer that runs on top of Kubernetes, so it is a sensible parent, and there is no "Cloud Native Platform" domain to point at yet.

a9:

---

q10: Eight process tags were auto-generated for the cross-domain handoffs and are sitting unapproved. Should they be promoted to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Approval is a sign-off step, so it is never applied automatically. (If you only want some, name which handoffs.)

a10:

---

q11: The catalog tagline and description for Kubernetes Platform were authored and are live in the catalog UI now. Do you approve the wording as-is? (yes/no)

Recommended: yes. The copy was written in buyer voice and is in place; answer no only if you want to supply replacement wording, which is an explicit overwrite.

a11:

---

q12: The single Kubernetes Platform system skill is currently named in kebab form ("kube-plat-system"). Should it be renamed to a snake form? (yes/no)

Recommended: no. The skill is the correct canonical domain skill; only the name style differs, and renaming is a destructive overwrite of a live value for a purely cosmetic gain.

a12:

---

## Optional (will not hold up the build)

q13: Ten cluster-level objects show up across the flagship distributions (cluster namespaces, RBAC policies, network policies, resource quotas, add-ons, upgrade plans, etcd backups, audit logs, storage classes, custom resource definitions). Should I research and add the ones that hold up across the vendor set? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Most are multi-tenancy or day-2 primitives shipped by every distribution, though they still want a verification pass first; the network-policy and CRD candidates may shift target domain depending on the service-mesh and registry promotion calls above.

a13:

---

<!-- agent map, ignore: q1=B2-MODULARIZATION q2=B2-EDGE-TUPLES q3=B2-ALIAS-TUPLES q4=B2-REGULATIONS q5=B2-CONSUMER-DMDOS q6=B2-ROLES-SCOPE q7=B2-PROMOTE-SERVICE-MESH q8=B2-PROMOTE-CONT-REG q9=B2-PARENT-DOMAIN q10=B2-APQC-APPROVAL q11=B2-CATALOG-UX-REVIEW q12=B2-LEGACY-SKILL-NAMING q13=B3-CLUSTER-NAMESPACES+B3-CLUSTER-RBAC-POLICIES+B3-CLUSTER-NETWORK-POLICIES+B3-CLUSTER-RESOURCE-QUOTAS+B3-CLUSTER-ADDONS+B3-CLUSTER-UPGRADE-PLANS+B3-CLUSTER-ETCD-BACKUPS+B3-CLUSTER-AUDIT-LOGS+B3-CLUSTER-STORAGE-CLASSES+B3-CLUSTER-CRDS | domain_id=81 -->
