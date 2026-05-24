# JWT-audience incident log

Append one entry per occurrence. Used by SKILL.md Rule #6 — the agent MUST log here and ALSO surface the full error verbatim (including the `tenant://<id>` value) in its user-facing response.

Format:

```
## <ISO timestamp>
- call: semantius call crud <method> '<args>'
- received audience: tenant://<id-from-error>
- full error: <verbatim error string>
- cwd at time of call: <path>
- .env present: <yes/no>
- diagnosis: <what root cause turned out to be, or "unresolved">
```

---

## 2026-05-23T21:00Z – 22:29Z (multiple, intermittent)
- call: `semantius call crud getCurrentUser '{}'`, also `postgrestRequest` GET `/domains?domain_code=eq.ATS&select=id,domain_code,domain_name`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:/dev/domain-map` (project root)
- .env present: yes (`SEMANTIUS_ORG=adenin`, API key unchanged)
- diagnosis: intermittent server-side routing. Same call succeeded against the project tenant minutes earlier (22:14, 22:19 entries in crud.log) and again on retry after ~5 minutes. Not a cwd or .env issue. Updated SKILL.md Rule #6 to drop the "always cwd" framing and to mandate that the full error string (with tenant ID) be surfaced verbatim on every JWT failure.

## 2026-05-24 (ITSM audit session, first call)
- call: `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?domain_code=eq.ITSM&select=id,domain_code,domain_name,crud_percentage,..."}'`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:/dev/domain-map` (project root)
- .env present: yes
- diagnosis: same intermittent server-side routing pattern as 2026-05-23 incident. Same wrong-tenant ID. Retry after pause.
