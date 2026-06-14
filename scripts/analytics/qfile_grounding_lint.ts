// qfile_grounding_lint.ts: grounding gate for q-/<CODE>.md files (SKILL.md Rule #22).
//
// A market-shape q-question (module split/count, scope, master-vs-consume,
// promote-to-domain, where an entity is mastered) must ground its `Recommended:`
// reason in named-vendor evidence copied from the b2 item's `evidence` field, NOT
// in build-convenience ("cleanest", "maps cleanly onto", "minimal shape", ...).
//
// Usage:
//   bun run scripts/analytics/qfile_grounding_lint.ts <DOMAIN_CODE>   # one domain, exit 1 on FAIL
//   bun run scripts/analytics/qfile_grounding_lint.ts --all          # scan every q-file, ranked
//
// Exit code 1 if any market-shape question carries a forbidden build-convenience
// phrase on its Recommended line (the high-precision signal that caught ACCT-PLAN q2).
// WARN findings (market-shape question with no detectable named-vendor token) are
// printed but do not by themselves fail the run, since vendor names are open-vocabulary.

import { readdirSync, readFileSync, existsSync } from "fs";

const AUDITS = "audits";

// Phrases Rule #22 explicitly forbids as a market-shape rationale. High precision.
const FORBIDDEN: RegExp[] = [
  /\bcleanest\b/i,
  /maps? (cleanly|neatly) onto/i,
  /\bminimal shape\b/i,
  /unblocks? the build/i,
  /small enough to own/i,
  /what(?:'s| is) already built/i,
  /\balready built\b/i,
  /keeps? (each )?(area|the edge|it) (small|clean)/i,
];

// A question is "market-shape" if its text is about module/master/domain shape.
// Bare /scope/ and /domain/ were dropped: they over-flag (almost any question mentions
// a domain). Ownership signals (/master/, /consume/) stay, with NON_MARKET below
// excluding the necessity / attribution / self-containment false positives they catch.
const MARKET_SHAPE: RegExp[] = [
  /\bmodule(s)?\b/i, /\bsplit\b/i, /\bmodular/i, /\bmaster(s|ed|ing)?\b/i,
  /\bconsume(s|r|d)?\b/i, /\bpromote\b/i, /\bsub-?market\b/i,
  /\bown domain\b/i, /\bseparate domain\b/i, /\bedition(s)?\b/i, /\bpackage(s|d)?\b/i,
];

// High-precision exclusions: a flagged question matching ANY of these is NOT a
// market-shape decision (it is event/handoff attribution, naming, notes/copy, pattern
// flags, RACI/role authoring, regulation tagging, lifecycle/entity_type classification,
// self-containment, process-tag, or additive-entity research). Build-convenience
// rationale is legitimate there, so the gate must not flag it. Derived from the
// 2026-06-14 classification pass (audits/_qfile-grounding-worklist.md): ~2/3 of the
// raw flags were these classes. Kept specific so genuine market-shape questions
// (module split/count, promote-to-domain, master-vs-consume) still flag.
const NON_MARKET: RegExp[] = [
  /\bem-?dash\b|british|spelling/i,
  /re-?point|re-?attribut|attribution|\bpublisher\b|which event|trigger.event|\bfires? (to|into)\b|subscrib/i,
  /\bcanonical\b|bare-?word|\brename\b|naming rationale|\brelabel\b/i,
  /\bnotes?\b.{0,40}(revert|wording|trailer|pollut|provenance|auto-?populat|incorrect)|forbidden auto/i,
  /\btagline\b|catalog_description|buyer-?voice|catalog copy|marketing copy/i,
  /pattern flag|submit-?lock|single-?approver|personal[- ]content|charter-?freeze|\bfreeze\b|\bhas_[a-z]/i,
  /\bpersona\b|\bRACI\b|author (the )?roles?|role-?set|which roles|role authoring/i,
  /\bregulation|\bFCRA\b|\bHIPAA\b|\bGDPR\b|\bOSHA\b|\bFERPA\b|\bFINRA\b|\bCCPA\b|\bSOX\b|compliance framework|statutory|landlord-?tenant/i,
  /\bentity_?type\b|lifecycle (state|exemption|modeling)|config-?shape|classif(y|ication)/i,
  /self-?contain|embedded[- ]?master|\bnecessity\b|deployab|required-?vs-?optional/i,
  /process tag|\bAPQC\b|\bPCF\b|process-?label|process-?mapping/i,
  /research and add|additive (entit|master)|discretionary|will not hold up/i,
];

// Common capitalized words that are NOT vendor names (to reduce WARN false-negatives).
const NON_VENDOR_CAPS = new Set([
  "The", "This", "That", "These", "Those", "Pick", "Option", "Options", "Recommended",
  "Both", "Either", "Neither", "Add", "Keep", "Move", "Consolidate", "Delete", "Replace",
  "One", "Two", "Three", "Four", "Five", "Six", "Seven", "It", "If", "Use", "A", "An",
  "Rule", "Phase", "Bucket", "CRM", "CSM", "ATS", "Sales", "Customer", "Success",
  "Strategic", "Account", "Marketing", "Yes", "No", "We", "You", "Independent",
]);

function hasVendorToken(reason: string): boolean {
  // Strip the leading "Recommended: <letter>." and the first word of the sentence.
  const body = reason.replace(/^Recommended:\s*/i, "").replace(/^[a-z]\b\.?\s*/i, "");
  // A vendor token: a Capitalized word (>=3 letters, mixed case) not in the stoplist,
  // appearing anywhere after the first character.
  const toks = body.match(/[A-Z][a-zA-Z][a-zA-Z.+&-]+/g) || [];
  return toks.some((t, i) => {
    if (NON_VENDOR_CAPS.has(t)) return false;
    if (/^[A-Z]{2,}$/.test(t)) return false; // all-caps domain code like DEMANDFARM unlikely; skip
    // skip if it's the very first token AND looks like a sentence starter
    if (i === 0 && /^(Matches|Mirrors|Vendor|Flagship)/.test(t)) return true;
    return true;
  });
}

type Finding = { code: string; q: string; level: "FAIL" | "WARN"; line: string };

function lintFile(code: string): Finding[] {
  const f = `${AUDITS}/${code}/q-${code}.md`;
  if (!existsSync(f)) return [];
  const text = readFileSync(f, "utf8");
  const lines = text.split(/\r?\n/);
  const findings: Finding[] = [];
  let curQ: { id: string; stem: string; text: string } | null = null;
  // Questions under the "## Optional (will not hold up the build)" heading are b3 ideas
  // (promote-to-domain / research-and-add) by the Rule #22 q-file format. They are
  // non-blocking and never market-shape gates, so the grounding gate does not apply.
  let inOptional = false;
  for (const raw of lines) {
    const l = raw.trim();
    if (/^#{1,4}\s+optional\b/i.test(l)) { inOptional = true; curQ = null; continue; }
    if (inOptional) continue;
    const qm = l.match(/^(q\d+):\s*(.*)$/i);
    if (qm) { curQ = { id: qm[1], stem: qm[2], text: qm[2] }; continue; }
    // accumulate option lines into the question text so MARKET_SHAPE sees them
    if (curQ && /^-\s*[a-z]\)/i.test(l)) { curQ.text += " " + l; continue; }
    const rm = l.match(/^Recommended:\s*.*/i);
    if (rm && curQ) {
      // MARKET_SHAPE reads the full text (an option body may carry the "module" signal).
      // NON_MARKET reads ONLY the question STEM: the subject of the question lives there.
      // It must NOT read the options (a module-split question's options describe each
      // module's master/embedded_master/consumer/necessity roles) nor the Recommended line
      // (which describes downstream consequences like "drives the lifecycle attribution and
      // the module FK on every handoff"). Both legitimately use exclusion words while still
      // being genuine market-shape questions; only the stem reliably names the decision.
      const isMarket = MARKET_SHAPE.some((re) => re.test(curQ!.text)) && !NON_MARKET.some((re) => re.test(curQ!.stem));
      if (isMarket) {
        const forbidden = FORBIDDEN.some((re) => re.test(l));
        const vendor = hasVendorToken(l);
        if (forbidden && !vendor) {
          findings.push({ code, q: curQ.id, level: "FAIL", line: l.slice(0, 180) });
        } else if (forbidden && vendor) {
          // forbidden phrase present but a vendor token is also there: soft warn
          findings.push({ code, q: curQ.id, level: "WARN", line: l.slice(0, 180) });
        } else if (!vendor) {
          findings.push({ code, q: curQ.id, level: "WARN", line: l.slice(0, 180) });
        }
      }
      curQ = null;
    }
  }
  return findings;
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: bun run scripts/analytics/qfile_grounding_lint.ts <DOMAIN_CODE> | --all");
  process.exit(2);
}

if (arg === "--all") {
  const dirs = readdirSync(AUDITS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  let totalFail = 0, totalWarn = 0;
  const perFile: { code: string; fail: number; warn: number; findings: Finding[] }[] = [];
  for (const code of dirs) {
    const fs = lintFile(code);
    if (!fs.length) continue;
    const fail = fs.filter((x) => x.level === "FAIL").length;
    const warn = fs.filter((x) => x.level === "WARN").length;
    totalFail += fail; totalWarn += warn;
    perFile.push({ code, fail, warn, findings: fs });
  }
  perFile.sort((a, b) => (b.fail - a.fail) || (b.warn - a.warn));
  console.log(`q-files with findings: ${perFile.length}   total FAIL: ${totalFail}   total WARN: ${totalWarn}`);
  console.log(`(FAIL = market-shape question with a build-convenience phrase and no vendor token)\n`);
  for (const p of perFile) {
    if (p.fail === 0 && p.warn === 0) continue;
    console.log(`${p.code.padEnd(22)} FAIL=${p.fail} WARN=${p.warn}`);
    for (const fnd of p.findings) console.log(`   [${fnd.level}] ${fnd.q}: ${fnd.line}`);
  }
  // --all is a triage scan; never fail the process on it.
  process.exit(0);
} else {
  const code = arg.toUpperCase();
  const fs = lintFile(code);
  const fails = fs.filter((x) => x.level === "FAIL");
  const warns = fs.filter((x) => x.level === "WARN");
  if (!existsSync(`${AUDITS}/${code}/q-${code}.md`)) {
    console.log(`No q-file at audits/${code}/q-${code}.md (nothing to lint).`);
    process.exit(0);
  }
  if (!fs.length) { console.log(`${code}: q-file grounding OK (no market-shape findings).`); process.exit(0); }
  for (const f of fs) console.log(`[${f.level}] ${code} ${f.q}: ${f.line}`);
  console.log(`\n${code}: ${fails.length} FAIL, ${warns.length} WARN.`);
  if (fails.length) {
    console.log(`FAIL = build-convenience rationale on a market-shape question. Pull grounding from the b2 evidence field (Phase 0 if empty) and rewrite the Recommended line.`);
    process.exit(1);
  }
  process.exit(0);
}
