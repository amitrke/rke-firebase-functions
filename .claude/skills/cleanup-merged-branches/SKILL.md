---
name: cleanup-merged-branches
description: Delete local and remote git branches in rke-firebase-functions that have already been merged into develop (including merged Dependabot and feature branches), never touching main, develop, the current branch, or anything with unmerged work. Use when the user asks to clean up, prune, or delete merged/stale branches.
---

# Clean up branches merged into develop (rke-firebase-functions)

Deletes branches whose work is already in `origin/develop`. It only uses **safe
deletes**: never force-delete, and never delete a branch with commits not in
`develop`. This repo accumulates many `dependabot/npm_and_yarn/functions/...`
branches, so expect most of the list to be those.

## 0. Protected: never delete

`main`, `develop`, the currently checked-out branch, any branch checked out in
another worktree (`git worktree list`), `release/*`, `gh-pages`, and any branch
with an **open** PR (`gh pr list --state open --json headRefName`).

## 1. Update refs

```
git fetch --prune origin
```

Don't check out or pull anything. Work from `origin/develop`.

## 2. Find merged branches

**Merged by ancestry** (merge commits, so this covers most):

```
git branch --merged origin/develop --format='%(refname:short)'      # local
git branch -r --merged origin/develop --format='%(refname:short)'   # remote
```

**Merged but not ancestors of `develop`** (squash/rebase merges, and Dependabot
branches that were superseded and closed don't count), found via GitHub:

```
gh pr list --state merged --base develop --limit 200 --json headRefName,headRefOid
```

Count such a branch only if its current tip equals the PR's `headRefOid`. If it
has moved on since the merge, it has new commits and must be kept.

Drop everything protected, strip `origin/` from remote names, ignore
`origin/HEAD`.

**Closed-unmerged Dependabot branches** (superseded bumps) are *not* merged work.
Don't delete them under this skill; list them under "kept" and mention that
`@dependabot` normally removes its own branches when closing a PR.

## 3. Delete

Local:

```
git branch -d <branch>
```

`-d` refuses unmerged work; if it refuses, keep the branch and report it.
**Never use `-D`.**

Remote (only branches from step 2 that still exist on `origin`):

```
git push origin --delete <branch>
```

One at a time; report any failure (such as a protection rule) without retrying
or bypassing. No wildcards or bulk deletes.

If the current branch is merged, don't delete it or switch away; list it under
"kept".

## 4. Report

Report: local deleted, remote deleted, kept and why (open PR, checked out,
unmerged commits, tip moved after merge, closed-unmerged, delete refused), and
failures. If nothing was merged, say so. Finish with `git fetch --prune origin`.

Remote deletion can't be undone from here, though a merged branch's commits stay
reachable from `develop`, and GitHub can restore a deleted branch from its merged
PR page.
