# VoiceClaw Branding — Working Notes

This is a branding exploration worktree of the main VoiceClaw repo. The `website/` subdirectory is the Next.js 16 app used as the branding showcase.

## Running Codex and Gemini from non-interactive shells

The user has shell aliases `cx = codex --yolo` and `gx = gemini --yolo`. These aliases are interactive only — they **fail from non-TTY parents** (Bash tool, subagent relays) with `Error: stdin is not a terminal`.

For non-interactive invocation (what Claude Code / subagents need), use the `exec` subcommand form instead:

**Codex:**
```sh
# Pass prompt as arg AND close stdin — otherwise codex hangs on "Reading additional input from stdin..."
codex exec --dangerously-bypass-approvals-and-sandbox "$(cat /path/to/prompt.txt)" </dev/null
# or: codex exec --full-auto "<prompt>" </dev/null
```

**Critical:** always add `</dev/null` when running from a background shell. Without it, codex reads the prompt from argv AND waits for EOF on stdin — which never comes in a detached background process, so codex hangs forever.

**Also critical:** do NOT launch codex inside a relay subagent that exits after spawning. When the subagent exits its child codex process gets killed mid-run. Instead, run `codex exec` directly via the Bash tool with `run_in_background: true` — that way the process lifetime is owned by the main session, not a wrapper that terminates early.

For long prompts, write them to a file and `cat` into the arg. Avoids shell-quoting hell.

Codex has playwright-mcp pre-wired — no install step needed for screenshots.

**Gemini:**
```sh
gemini -y <<'PROMPT'
<prompt body>
PROMPT
```
`-y` = yolo (auto-approve). Piping via heredoc avoids shell-quote issues in long prompts. Gemini does **not** have playwright pre-wired — it self-installs `playwright` npm package on first screenshot request, which costs ~30–60s and may retry once on transient quota.

## Visual feedback loop

Both CLIs can autonomously screenshot URLs via playwright. Confirmed Apr 17, 2026 — both produced valid PNGs of google.com from a single prompt. Use this for branding iteration: each designer screenshots its rendered Next.js route and feeds the image + code to the other two for critique.
