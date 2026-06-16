# Value Stream Management (VSM): questions waiting for you

## What this domain is

See how work really flows across your whole delivery toolchain, and where it gets stuck.

Value Stream Management is the market for measuring end-to-end software delivery flow across a
heterogeneous toolchain the platform does not own: value-stream mapping, flow metrics, bottleneck
detection, DORA benchmarking, and delivery-to-business-outcome alignment. It is a tool-agnostic
overlay that integrates the delivery toolchain to measure it rather than producing its artifacts,
distinct from the value-stream delivery toolchain (which builds and ships software) and from SPM
(top-down investment planning). The domain was created and fully built this pass
(Phase 0 -> A -> B -> C -> S) and modeled as a derive/overlay domain; everything sits at
record_status='new' awaiting your review.

---

q1: Author Phase E (personas + RACI) for VSM now?

- a) skip (recommended)
- b) author personas anyway

Recommended: a) skip. VSM is a derive/overlay domain with no operational_workflow masters, no lifecycle states, and no workflow gates, so personas would be read-mostly with no gated RACI to anchor them. Phase E adds little value here. EAP, by contrast, has real gates and warrants personas (see its q-file). If you do want VSM personas regardless, pick (b) and I will author a small read-oriented set.

a1:

---

<!-- agent map, ignore: q1=B2-VSM-PHASE-E | domain_id=187 -->
