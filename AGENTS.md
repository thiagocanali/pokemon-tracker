# AGENTS.md — Protected Autonomous Development

These instructions apply to all Codex and other coding agents working in this repository.

## Execution and PR discipline
- Work in coherent batches of 5–10 related, independently testable tasks. Do not create one PR per task.
- Before creating a PR, search open PRs for the same workstream and update its branch instead. Keep at most one active PR per workstream unless a documented technical dependency requires otherwise.
- Commit related changes with meaningful messages; push only after local checks when available. Avoid repeated intermediate pushes that trigger unnecessary CI or Vercel previews.
- Continue independent safe tasks when another task is blocked. Never bypass reviews, required checks, branch rules, or security findings.
- Prefer squash merge after all required checks and reviews succeed; enable auto-merge only where repository policy and permissions allow it. Never merge draft or incomplete PRs.
- Keep PR descriptions current: scope, validation evidence, risks, and deployment impact.

## Safety boundaries
- Do not change branch protection, rulesets, required reviewers, permissions, secrets, or production deployment configuration without first auditing their effects and obtaining explicit authorization.
- Authentication, authorization, RLS, database migrations, production integrations, and permission changes require additional review and isolated tests. Do not execute remote Supabase or Neon migrations, ingestion, or synchronization without explicit production authorization.
- Use disposable PostgreSQL for SQL tests; preserve the strict catalog concurrency test and investigate intermittent failures rather than weakening assertions.
- Keep Pokémon GO data separate from main-series Pokémon data. Preserve provenance, version/freshness, confidence, and the distinction between observed and simulated results.
- PoGoAPI live ingestion remains disabled pending licensing/redistribution review; Pokébattler is documentation-only pending contractual clearance.
- Prefer local tests and GitHub Actions over Vercel previews. Do not generate unnecessary deployments or retry exhausted quotas.

## Minimum validation
- For application changes: npm ci, npm run typecheck, npm run build, and relevant tests.
- For catalog, crosswalk, and sync changes: run relevant Deno tests and disposable PostgreSQL integration/concurrency checks.
- For CI/workflow changes: inspect YAML event filters, token permissions, cancellation behavior, and required check-name compatibility before merging.
- A green rerun after a red run does not prove an intermittent failure fixed; record follow-up diagnostics.
