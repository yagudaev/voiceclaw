# VoiceClaw

Yarn workspace monorepo. Workspaces: `mobile`, `website`, `relay-server`, `desktop`, `docs`, `tracing-collector`, `tracing-ui`.

`openclaw/` (sibling directory, not a workspace) is a fork of an inner library used as the brain gateway. Don't edit it from this repo.

# Comments

- Default to writing no comments. Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug. If removing the comment wouldn't confuse a future reader, don't write it.
- Never reference tickets, bugs, or fix history in source comments. No `NAN-XXX`, no "fixes the doubled-words bug", no "this used to do X". That goes in the commit body and PR description — it rots in source.
- Don't restate what the code does. Well-named identifiers do that.
- Reviewers: reject comments that name a ticket ID, describe a bug or its history, or read like a commit-message paragraph. Treat as BLOCKER, not nit.

# Worktrees

Worktree paths go one directory up from the repo root, prefixed with the project name: from `/Users/michaelyagudaev/code/voiceclaw/voiceclaw`, use `../voiceclaw-<name>` (i.e. `/Users/michaelyagudaev/code/voiceclaw/voiceclaw-<name>`).

After creating a worktree, copy `.env` files for any workspace you'll touch:

```
cp ../voiceclaw/.env . 2>/dev/null || true
cp ../voiceclaw/<workspace>/.env <workspace>/ 2>/dev/null || true
```

# Reviewer alignment

`AGENTS.md` is a symlink to this file so Codex (which reads `AGENTS.md`) sees the same rules as Claude (which reads `CLAUDE.md`). When updating rules, edit `CLAUDE.md` — never edit `AGENTS.md` directly.
