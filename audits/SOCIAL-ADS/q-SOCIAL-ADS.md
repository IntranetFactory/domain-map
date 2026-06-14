# Paid Social Advertising (SOCIAL-ADS): questions waiting for you

## What this domain is
Run paid social across Meta, TikTok, and LinkedIn from one place: orchestrate campaigns, optimize
creative, and reallocate budget to what converts.

Structure campaigns, ad sets, and ads against your connected social ad accounts and run them across
the major ad platforms. Build and sync audiences, set and auto-reallocate budgets on a pacing and
ROAS signal, and version your creative while dynamic creative optimization tests the combinations and
promotes the winners. Ingest server-side conversion events, watch performance in real time, and tie
spend back to conversions with attribution and incrementality so you know what actually drove revenue.

> Grounding: these recommendations are backed by a fresh vendor-surface study (5 flagship vendors,
> 2025-2026 product docs and M&A) saved at `.tmp_deploy/SOCIAL-ADS-phase0-2026-06-14.md`. The domain
> was built live at `record_status='new'` (domain 177, modules 360 / 361). The build assumes the
> recommended answers below; if you change q1, the domain placement changes.

---

q1: (answer this first) Should paid social advertising stay its own domain, or fold into Social Media Management (SMM)?

- a) Keep SOCIAL-ADS as a distinct domain (as built).
- b) Fold paid social into SMM as a module.

Recommended: a. Paid social ad management is served by independent flagship PURE-PLAYS whose flagship
product IS paid social campaign orchestration, not organic publishing: Smartly.io is a cross-channel
"paid social OS" with dynamic creative optimization across Meta, TikTok, Snapchat, and Pinterest;
Madgicx is an AI Meta-ads optimization super app (audiences, creative analytics, automated bid and
budget); Strike Social runs AI-optimized paid social and YouTube ad campaigns; Adsmurai does paid
social plus product-feed dynamic creative. Skai (formerly Kenshoo) carries paid social as a dedicated
product line inside its omnichannel performance platform. By contrast the SMM leaders (Sprinklr,
Hootsuite, Sprout Social) master organic publishing, scheduling, engagement, and listening; their paid
surface is secondary (Hootsuite had to ACQUIRE AdEspresso to add paid social, then folded it into the
suite). The paid entity surface this domain models, ad accounts, ad sets, budget reallocation,
audiences, server-side conversion events, dynamic creative optimization, and creative variants, is not
what SMM models, and ADV-AD-TECH does not exist in the catalog, so there is no broader ad-tech home to
fold into. Keeping it distinct matches how the pure-plays package the market.

a1:

---

q2: Approve the buyer-voice catalog copy and the new content for stamping approved?

The domain and both modules (Campaign Orchestration, Creative Optimization) were given a tagline and
description in buyer voice, and the whole build sits at `record_status='new'` awaiting your review.

Recommended: yes. The copy was authored into empty fields per the catalog-UX rule and frames workflow
plus value (orchestrate campaigns, optimize creative, reallocate budget, attribute conversions). Review
in the catalog UI and approve, or tell me what to edit.

a2:

---

## Optional (will not hold up the build)

q3: Should I add the measurement entities the omnichannel leaders model (attribution_models, incrementality_tests)? (yes/no)

Skai models incrementality / conversion-lift testing and attribution as first-class, and Smartly.io
exposes attribution and measurement. Today the domain captures the conversion signal
(`ad_conversion_events`) and hands it to Revenue Intelligence for attribution, but does not master an
attribution-model config or an incrementality-test entity. These are additive (they fit the Campaign
Orchestration module, no split needed) and could alternatively master in REV-INTEL.

Recommended: yes, additive, after the gate decision. Also flag where they should master (here vs
REV-INTEL).

a3:

---

q4: Should bid_strategies be promoted to its own config master (separable from the ad set)? (yes/no)

Smartly.io, Madgicx, Strike Social, and Skai all expose bid strategy as a configurable object separable
from the ad set; today it is folded into `social_ad_sets`. Promoting it is additive and non-blocking.

Recommended: defer unless you want bid strategy managed as a reusable object. Low stakes.

a4:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B3-S1 q4=B3-S2 | domain_id=177 | modules=360,361 | phase0=.tmp_deploy/SOCIAL-ADS-phase0-2026-06-14.md | reversed: none -->
