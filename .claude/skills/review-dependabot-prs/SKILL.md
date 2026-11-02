---
name: review-dependabot-prs
description: Triage open Dependabot pull requests for rke-firebase-functions and automatically merge every one targeting develop that is not failing its PR checks, without asking per PR. Use whenever the user asks to review, triage, process, clear, or merge dependabot PRs or dependency updates in this repo.
---

# Triage and auto-merge Dependabot PRs (rke-firebase-functions)

`.github/dependabot.yml` runs weekly for `/functions` (npm, **target `develop`**)
and GitHub Actions (no `target-branch`, so those PRs target the default branch,
`main`). Policy: **retarget `main`-based PRs to `develop`, then merge every
`develop`-based PR that is not failing the checks that run on PR creation.** No per-PR confirmation, and bump size (including
major) is not a reason to hold. Merging to `develop` doesn't deploy anything;
production deploys only when `develop` is merged into `main`.

## 1. List open Dependabot PRs

```
gh pr list --author "app/dependabot" --state open --limit 50 \
  --json number,title,baseRefName,mergeable,mergeStateStatus,statusCheckRollup,url
```

If none, say so and stop.

**Retarget any PR whose base is `main` to `develop`** (notably the GitHub
Actions ones) before classifying, one at a time:

```
gh pr edit <n> --base develop
gh pr comment <n> --body "@dependabot rebase"
```

Never merge a Dependabot PR into `main`: that would trigger a production
deploy via `deploy.yml`. Changing the base does not re-run
the checks, so the existing results are stale (they were run against `main`);
the `@dependabot rebase` rebuilds the branch on `develop` and triggers fresh
checks. Report retargeted PRs as pending this run, and they are classified
and merged normally on the next run. Skip and report any PR whose base is neither `develop` nor `main`.

## 2. Classify each PR from `statusCheckRollup`

- **Failing**: any `CheckRun` with `FAILURE`, `TIMED_OUT`, `CANCELLED`, or
  `ACTION_REQUIRED`, or any `StatusContext` with `FAILURE`/`ERROR`. **Do not
  merge.** Find the cause (`gh pr checks <n>`, `gh run view <run-id> --log-failed`)
  and report it in one line.
- **Pending**: any check not `COMPLETED`, or `mergeable` is `UNKNOWN`. Don't
  merge; report as pending and suggest re-running the skill shortly. Don't poll
  or sleep in a loop.
- **Conflicting**: `mergeable` is `CONFLICTING`. Don't merge; comment
  `@dependabot rebase` (`gh pr comment <n> --body "@dependabot rebase"`) and
  report it.
- **Not failing**: every check is `SUCCESS`, `SKIPPED`, or `NEUTRAL` and the PR
  is `MERGEABLE`. **Merge.**

Skipped checks are fine. A PR with zero checks reported counts as pending, not
passing. The Firebase dry-run steps are skipped on Dependabot runs (no secrets),
so a green check there means lint + build + test only.

## 3. Merge

```
gh pr merge <n> --merge
```

Use `--merge` (history uses merge commits, "Merge pull request #N from ...").
Never use `--admin` to bypass failing or missing required checks.

Merge one at a time. After each, re-check the rest with
`gh pr view <n> --json mergeable,mergeStateStatus`; PRs touching `yarn.lock`
commonly turn conflicting, and those get `@dependabot rebase` and are picked up
on the next run.

## 4. Report

Short table: merged (number, package, from→to), failing (cause), pending,
conflicting/awaiting rebase, retargeted from `main`, skipped (other base). Call out any **major
bumps** and any bump of `firebase-admin`, `firebase-functions`, `firebase-tools`,
`typescript`, or `@types/node` (Node 22 is the runtime, so a newer `@types/node`
major can mask API differences) so the user can sanity-check `develop` before
promoting to `main`.

Don't close PRs or comment `@dependabot ignore` unless the user asks.
