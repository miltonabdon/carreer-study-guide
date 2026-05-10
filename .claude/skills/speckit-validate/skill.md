# Skill: speckit-validate

Spawns a read-only subagent that cross-checks the live codebase against
specs/001-ai-study-guide-app/spec.md functional requirements and reports
which FRs are confirmed implemented, which are missing, and what looks
inconsistent — before shipping.

## When to invoke
- Before any `ship.sh` run when multiple features were touched
- When the user reports "something didn't work"
- After a `/speckit-analyze` to get a code-level (not spec-level) view

## What the agent checks
1. Each FR-### against actual source files (grep, read key files)
2. API endpoint existence for each feature
3. TypeScript build clean (`npx tsc --noEmit`)
4. Whether Redis cache invalidation is called after every write endpoint
5. Whether error responses are surfaced to the UI (no silent swallows)

## Output
A compact table: FR | Status | Evidence | Risk
Plus a list of "silent failure" patterns found (try/catch swallowing errors).

## How to invoke
Say `/speckit-validate` in the prompt.
