---
name: commit-push-pr
description: Commit the current changes, push the branch, and open a pull request following rke-firebase-functions conventions (gitmoji commit messages, feature-branch → develop → main flow, gh pr create with a Summary/Test plan body). Use whenever the user asks to commit, push, ship, or open a PR for work in this repo.
---

# Commit, push, and open a PR (rke-firebase-functions)

Use this whenever the user asks to commit work, push a branch, "ship" a change,
or open a pull request in this repo. Don't skip the confirmation gates: push and
PR creation are visible to others.

## 1. Assess state first

Run in parallel:
- `git status` (never `-uall`)
- `git diff` (unstaged) and `git diff --staged`
- `git log --oneline -15`: this repo uses **gitmoji** commit messages
  (`<emoji> Imperative summary`, no type/scope prefix), per the root
  `CLAUDE.md`. Seen in history: ✨ new feature, 🐛 bug fix, 📝 docs,
  ♻️ refactor, 🔧 config/CI tweak, 🔀 merge, ⬆️ dependency bump.

Confirm nothing unexpected is staged (secrets, `.env`, `response.json`,
`node_modules`, `functions/lib/`) before proceeding. If a broad `git add` shows
files you didn't expect, stop and check their contents.

## 2. Pick the right branch

Branch model:
- Feature/fix work → its own branch → **PR into `develop`**. `develop` runs
  `validate.yml` (lint, build, test, and a `firebase deploy --dry-run`).
- Once verified → **PR `develop` into `main`**. A push to `main` runs
  `deploy.yml` and **deploys all functions to production**.

So:
- **On `main`**: stop. Never commit or push here directly; ask the user.
- **On `develop` with ordinary feature/fix work**: create a branch off it first,
  `git checkout -b <type>/<short-kebab-description>` (for example
  `fix/news-expire-at`), then commit there. Don't leave ad hoc work on `develop`.
- **On a feature branch already**: commit there.
- **Deliberately preparing a `develop` → `main` release PR**: stay on `develop`
  and use `main` as the PR base.

If it's unclear which applies, ask rather than guess.

## 3. Verify before committing

For changes under `functions/`, run what CI runs (from `functions/`):

```
yarn lint && yarn build && yarn test
```

If lint fails on formatting, `yarn lint:fix` and re-check. Don't commit with a
failing check unless the user says so.

## 4. Commit

- Stage specific files by name; avoid `git add -A` / `git add .`.
- Gitmoji message matching the style above. Focus the summary on *why*.
- Only commit when the user asked (or asked for the full commit→push→PR flow).
- End the message with the Co-Authored-By trailer given in the session's
  attribution instructions.
- Never use `--no-verify` or `--amend` (unless explicitly asked). If a hook
  fails, fix the cause and make a new commit.

## 5. Confirm before pushing

Show the user the branch, target base, and commit summary, and get an explicit
go-ahead, unless they already asked for the full commit→push→PR flow in the
triggering message. In that case proceed and narrate.

## 6. Push

```
git push -u origin <branch>
```

Never force-push without explicit instruction, and never to `main`/`develop`.

## 7. Open the PR

```
gh pr create --base <develop-or-main> --title "<emoji summary>" --body "$(cat <<'EOF'
## Summary
- <1-3 bullets: what changed and why>

## Test plan
- [ ] <how this was/should be verified>
EOF
)"
```

- Default base is `develop`; `main` only for a deliberate release PR or if the
  user names it.
- Base the Summary on the whole diff, not just the latest commit.
- Append the PR-description attribution line from the session's instructions.
- Return the PR URL.

## Worth mentioning to the user when relevant

- Merging into `main` deploys to production immediately. Say so on any
  `develop` → `main` PR, and list the functions affected.
- Changes to scheduled functions (`updateWeather`, `updateNews`,
  `updateNewsFromNewsDataIO`, `updateHolidays`, file-lifecycle jobs) take effect
  on the next scheduled run after deploy, not immediately.
- New secrets/env vars must be added in three places: GitHub Secrets, the
  `Create .env file` step in **both** `validate.yml` and `deploy.yml`, and
  local `functions/.env`.
- On Dependabot-triggered runs, repo secrets are unavailable, so the dry-run
  steps are skipped and only lint/build/test run.
