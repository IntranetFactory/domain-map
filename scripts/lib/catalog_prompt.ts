// scripts/lib/catalog_prompt.ts
//
// Turns a domain's buyer-voice catalog_tagline into domains.catalog_prompt: a one-sentence command
// a buyer would give an agent to build the system. Used by scripts/fill_catalog_prompts.ts.
//
// The opener is picked by a hash of the domain code, so a domain keeps its wording across runs.
// Verb-led taglines ("Run every ...") follow a "... to" opener; noun-led ones ("A working
// surface ...", "Audit-ready ...") follow a noun opener. Taglines address the buyer ("your
// practice"); the prompt is the buyer speaking, so second person becomes first person plural.
// "agent" is always singular. The two lists are parallel: index i is the same voice in both.
// Openers ending in "?" turn the prompt into a question.

export const VERB_OPENERS = [
  "I need a system to",
  "Build me a system to",
  "My agent needs a system to",
  "I want to",
  "We need a tool to",
  "Set up a system that lets us",
  "Help me build an app to",
  "Create a system so we can",
  "I'm looking for a way to",
  "Our team needs software to",
  "Give my agent a system to",
  "Can you build us something to?",
  "We want to",
  "Design a system that helps us",
];
export const NOUN_OPENERS = [
  "I need",
  "Build me",
  "My agent needs",
  "I want",
  "We need",
  "Set up",
  "Help me build",
  "Create",
  "I'm looking for",
  "Our team needs",
  "Give my agent",
  "Can you build us?",
  "We want",
  "Design",
];
const NON_VERB_FIRST = /^(a|an|the|one|every|all|your|our|audit-ready)$/i;

export function variant(code: string, n: number): number {
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % n;
}

// Lowercase the first word for mid-sentence use, keeping acronyms ("ASC 842", "HVAC").
function lowerFirstWord(s: string): string {
  const [first, ...rest] = s.split(" ");
  const word = /[A-Z]/.test(first.slice(1)) ? first : first.toLowerCase();
  return [word, ...rest].join(" ");
}

// "you" is the object ("surprises you at month-end") when a preposition, punctuation, or the end
// follows it, otherwise the subject ("before you need it").
export function firstPerson(s: string): string {
  const fixCase = (orig: string, rep: string) => (orig[0] === orig[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);
  const OBJECT_NEXT = /^(at|to|from|with|in|on|by|for|of|into|about|before|after|when|and|or)$/i;
  return s
    .replace(/\byour(self|selves)\b/gi, (m) => fixCase(m, "ourselves"))
    .replace(/\byours\b/gi, (m) => fixCase(m, "ours"))
    .replace(/\byour\b/gi, (m) => fixCase(m, "our"))
    .replace(/\byou'(re|ve|ll|d)\b/gi, (m, t) => fixCase(m, `we'${t}`))
    .replace(/\byou\b(\s+([A-Za-z-]+))?/gi, (m, gap, next) => {
      const isObject = !next || OBJECT_NEXT.test(next);
      return fixCase(m, isObject ? "us" : "we") + (gap ?? "");
    });
}

// Returns "" when the tagline is empty: the caller (the agent) writes that prompt by hand.
export function promptFromTagline(code: string, tagline: string): string {
  const t = firstPerson((tagline ?? "").trim().replace(/\s+/g, " "));
  if (!t) return "";
  const i = variant(code, VERB_OPENERS.length);
  const sentence = /[.!?]$/.test(t) ? t : `${t}.`;
  const first = sentence.split(" ")[0].replace(/[^A-Za-z-]/g, "");
  const raw = NON_VERB_FIRST.test(first) ? NOUN_OPENERS[i] : VERB_OPENERS[i];
  const question = raw.endsWith("?");
  const opener = question ? raw.slice(0, -1) : raw;
  let prompt = `${opener} ${lowerFirstWord(sentence)}`;
  if (question) prompt = prompt.replace(/[.!?]$/, "?");
  return prompt.replaceAll(String.fromCharCode(0x2014), "-");
}
