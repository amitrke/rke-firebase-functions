---
name: fix-failing-actions
description: Look through the most recent GitHub Actions runs for rke-firebase-functions, diagnose the failing ones, and fix the ones whose cause is in the repo (code, lint, build, tests, workflow config) on a branch with a PR. Use when the user asks to check CI, look at failing workflows/actions/builds, or fix broken pipelines.
---

# Diagnose and fix failing GitHub Actions runs (rke-firebase-functions)

Workflows live in `.github/workflows/`:
- `validate.yml` (push/PR on `develop`): lint, build, test, then a Firebase
  deploy dry-run when secrets are available.
- `deploy.yml` (push/PR on `main`): same checks on PRs; on push to `main` it
  **deploys to production**.

Find real failures, fix what is fixable from the repo, and clearly report the rest.

## 1. Find recent failures

```
gh run list --limit 40 --json databaseId,workflowName,displayTitle,headBranch,event,conclusion,status,createdAt,url
```

Keep `failure` and `timed_out`. Ignore `cancelled`, `skipped`, in-progress.
**Dedupe**: for each (workflow, branch) only the newest run matters. If a newer
run of the same workflow on the same branch succeeded, say it's already resolved.

## 2. Diagnose each remaining failure

```
gh run view <id> --json jobs -q '.jobs[] | select(.conclusion=="failure") | {name, steps: [.steps[] | select(.conclusion=="failure") | .name]}'
gh run view <id> --log-failed | tail -n 80
```

Find the failing step and the real error line (skip `warn` noise). Classify:

- **Fixable in the repo**: oxlint/prettier errors, TypeScript errors, failing
  Jest tests, broken workflow YAML (for example invalid `secrets` context use in
  `if:`), wrong Node version, `yarn.lock` out of sync with `package.json`.
- **Dependabot PR broken by the bump itself** (major bump, incompatible peer
  dependency such as a TypeScript/ESLint/Node-types jump): not a repo bug.
  Report it and recommend holding or closing; don't hand-edit Dependabot
  branches.
- **Infra / transient**: registry timeouts, runner failures. Suggest
  `gh run rerun <id> --failed`; only rerun if the user says so.
- **Secrets / accounts**: `google-github-actions/auth` failures, an expired or
  missing `GCP_SA_KEY`, `FIREBASE_PROJECT_ID`, or an API-key secret, a deploy
  permission error. Do **not** work around it; report exactly what the user must
  refresh. Never print, echo, or add secret values.

## 3. Reproduce locally before fixing

From `functions/`, run what the workflow runs:

```
yarn install --frozen-lockfile && yarn lint && yarn build && yarn test
```

Check the workflow file for the authoritative steps. Confirm the failure
reproduces, make the smallest fix, and re-run to confirm it passes. If it won't
reproduce, say so rather than guessing. Dry-run steps that need secrets can't be
reproduced locally; say that explicitly.

## 4. Ship fixes safely

- Never commit directly to `main` or `develop`, and never touch a Dependabot
  branch. Branch off the failing branch's base (normally `develop`):
  `git checkout -b fix/ci-<short-description> origin/develop`.
- If the failure is on a feature branch the user owns, fix there after telling
  them.
- Don't weaken CI to get green: no removing checks, `continue-on-error`,
  loosened lint rules, or skipped tests unless the user explicitly asks.
- `deploy.yml` deploys to production on push to `main`. Make the minimal fix and
  call it out in the PR. A fix that only exists on `develop` doesn't repair a
  failing `main` run until the `develop` → `main` PR merges.
- Keep `validate.yml` and `deploy.yml` in sync where they share steps (Node
  version, `.env` creation, the secrets guard).
- Commit and open the PR with the `commit-push-pr` skill (gitmoji, base
  `develop`). One PR per distinct root cause.

## 5. Report

Table of recent failures: workflow, branch, run link, cause, outcome (fixed in
PR link / needs user action / transient, rerun suggested / Dependabot bump
incompatible / already resolved). Don't claim a fix works until the local
reproduction passes, and say CI on the PR still has to confirm it.
