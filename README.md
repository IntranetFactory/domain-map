# research-wiki

Browse the compiled knowledge: [wiki/index.md](wiki/index.md)

A knowledge base powered `llm-wiki` skill. Drop files into `sources/`, run an ingest, and the wiki compounds over time.



## Workflow

**Adding sources:**
- Save articles, AI conversations, or notes as `.md` files into `sources/`, then run `/llm-wiki ingest`
- Or ingest a public web page directly with `/llm-wiki ingest <url>` — no file needed

**Processing:**
- `/llm-wiki ingest` processes all new files in `sources/` in one pass
- Already-processed files are tracked in `wiki/log.md` and skipped automatically on subsequent runs

**Querying:**
- Ask questions with `/llm-wiki query what do I know about X`

---

## Commands

All commands use the `/llm-wiki` skill in Claude Code.

| Command | Description |
|---------|-------------|
| `/llm-wiki ingest` | Process all new files in `sources/` |
| `/llm-wiki ingest <url>` | Fetch a URL and ingest it |
| `/llm-wiki ingest <path>` | Ingest a specific file |
| `/llm-wiki query <question>` | Ask a question against the wiki |
| `/llm-wiki lint` | Health-check the wiki for broken links, orphans, contradictions |
| `/llm-wiki initialize` | Set up directory structure (first run only) |


---

## Directory Structure

```
sources/    Drop zone — place files here to be ingested
raw/        Immutable source material (never edit manually)
wiki/       Compiled knowledge articles
  index.md  Global article index
  log.md    Append-only operation log
```

---

*Skill based on [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki)*

*`markdown Export-1.0.user.js` is a Tampermonkey script that adds a markdown export button to Google AI Mode conversations, making it easy to save discussions as `.md` files directly into `sources/`.*
