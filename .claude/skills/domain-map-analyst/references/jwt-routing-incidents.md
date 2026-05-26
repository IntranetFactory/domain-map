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

## 2026-05-24 (ATS audit session, first call)
- call: `semantius whoami` (also affected `semantius info crud postgrestRequest`)
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:/dev/domain-map` (project root); config_source reported by CLI matches
- .env present: yes (`SEMANTIUS_ORG=adenin`)
- diagnosis: stale cached JWT minted for the wrong tenant. A bare `--reset-jwt-cache whoami` succeeded immediately (org `adenin`, api_baseurl `https://adenin.semantius.ai`). Distinct from the intermittent-routing variant — single retry without cache-reset returned the same wrong audience deterministically, while the cache reset fixed it on the first attempt. **Mitigation:** when the same wrong-tenant audience repeats across calls, prefer `--reset-jwt-cache` over plain retry.

## 2026-05-26 (ATS tools audit session, first call)
- call: `semantius whoami`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same wrong-tenant audience as the recurring 2026-05-23/24 incidents. Trying `--reset-jwt-cache` per updated mitigation.

## 2026-05-26 (BEN-ADMIN audit session, first call)
- call: `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?domain_code=eq.BEN-ADMIN&select=..."}'`, also `semantius whoami`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same wrong-tenant audience as the recurring incidents. Initial failure also masquerading as `TOOL_NOT_FOUND` on `postgrestRequest` (likely an auth fall-through in the tool-resolution path). Trying `--reset-jwt-cache` per mitigation.

## 2026-05-26 (PSA classification query, first call)
- call: `semantius whoami` (also affected `semantius call crud postgrestRequest` with `TOOL_NOT_FOUND` masquerade)
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same recurring wrong-tenant audience. Trying `--reset-jwt-cache` per mitigation.

## 2026-05-26 (MSP-PSA audit session, first call)
- call: `semantius whoami` (also affected `semantius call crud postgrestRequest` with `TOOL_NOT_FOUND` masquerade and `--reset-jwt-cache whoami`)
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same recurring wrong-tenant audience. `--reset-jwt-cache` did NOT fix it on first attempt (matches the 2026-05-24 fact-sheet re-emit variant). Plain retry ~5s later also returned same wrong audience. Likely intermittent server-side routing; surfacing to user before further retries per Rule #6 "don't quietly retry in a loop".

## 2026-05-26 (LEGAL-PRACT-MGMT research session, first call)
- call: `semantius whoami`, `semantius ping -n 3` (all 3 pings failed), `semantius --reset-jwt-cache whoami`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes (`SEMANTIUS_ORG=adenin`, API key unchanged from prior sessions)
- diagnosis: sustained server-side routing failure (3/3 pings failed against the same wrong tenant). `--reset-jwt-cache` did NOT fix it. Surfacing to user before further retries per Rule #6 "don't quietly retry in a loop".

## 2026-05-26 (ONBOARDING audit fix-load session, first call)
- call: `semantius call crud postgrestRequest '{"method":"GET","path":"/tools?..."}'` (returned `TOOL_NOT_FOUND` masquerade), `semantius whoami`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same recurring wrong-tenant audience. Trying `--reset-jwt-cache` then short wait per documented mitigation.

## 2026-05-26 (Oracle EBS coverage gap analysis, first call)
- call: `semantius whoami` (also affected `semantius call crud getCurrentUser` with `TOOL_NOT_FOUND` masquerade)
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); `config_source C:\dev\domain-map` reported by CLI
- .env present: yes
- diagnosis: same recurring wrong-tenant audience. Trying `--reset-jwt-cache` per documented mitigation.

## 2026-05-24 (ATS fact-sheet re-emit, first call)
- call: `bun run scripts/emit_fact_sheet.ts --starter-kit ATS` (first postgrestRequest), also `semantius whoami`, `semantius --reset-jwt-cache whoami`
- received audience: `tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J`
- full error: `Error: This JWT does not have authorization to access this resource: required audience not found, received ["tenant://1VLl6gULTCGtac6NXImwJewYEqEy061J"]`
- cwd at time of call: `c:\dev\domain-map` (project root); config_source reported by CLI matches
- .env present: yes (`SEMANTIUS_ORG=adenin`)
- diagnosis: same wrong-tenant audience as the earlier 2026-05-24 incidents. This time `--reset-jwt-cache` did NOT fix it on the first attempt — same wrong tenant returned. A plain `whoami` ~2 minutes later succeeded (org `adenin`, api_baseurl `https://adenin.semantius.ai`). So this occurrence behaved like the intermittent-routing variant despite having an identical surface to the cache-stale variant. **Updated mitigation:** when `--reset-jwt-cache` doesn't fix the wrong-tenant audience, wait 1–2 minutes and retry plain `whoami`; if that also fails, surface to user.

