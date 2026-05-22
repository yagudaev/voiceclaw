// `write` direct tool — writes content to a file inside the voiceclaw workspace.
//
// Workspace-scoped: rejects paths outside `~/.voiceclaw/workspace/` and
// re-verifies the realpath after the write so a freshly-installed escaping
// symlink can't shuttle the payload elsewhere.

import { promises as fs } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import {
  getWorkspaceRoot,
  resolveInsideWorkspace,
  verifyWrittenPathInside,
} from "../../workspace.js"

export const WRITE_TOOL_NAME = "write"

export const WRITE_TOOL_DESCRIPTION = `Writes content to a file inside the voiceclaw workspace (~/.voiceclaw/workspace/).

- The path argument can be absolute (must be inside the workspace) or relative to the workspace root.
- Parent directories are created if missing.
- Overwrites the file if it already exists.
- Writes outside the workspace are rejected with an error.
- Use this for new files. To modify part of an existing file, prefer edit so you don't lose surrounding content.
- To save a voice note to today's memory file, create or append-via-edit on memory/YYYY-MM-DD.md.`

export const WRITE_TOOL_PARAMETERS = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Workspace-relative path, or absolute path inside the workspace.",
    },
    content: {
      type: "string",
      description: "Full file contents. Existing files are overwritten.",
    },
  },
  required: ["path", "content"],
} as const

export interface WriteArgs {
  path: string
  content: string
}

export interface WriteResult {
  written: true
  bytes: number
  path: string
}

export interface WriteError {
  error: string
}

export async function runWrite(args: WriteArgs): Promise<WriteResult | WriteError> {
  if (typeof args.path !== "string" || args.path.length === 0) {
    return { error: "path is required" }
  }
  if (typeof args.content !== "string") {
    return { error: "content must be a string" }
  }

  const candidate = isAbsolute(args.path)
    ? args.path
    : join(getWorkspaceRoot(), args.path)
  const candidateParent = dirname(candidate)

  // For absolute paths, refuse to create parents that don't already exist —
  // we can't safely mkdir into territory we haven't proven is inside the
  // workspace. Relative paths are anchored to the workspace root, which is
  // guaranteed inside by construction (after the realpath check below).
  if (isAbsolute(args.path)) {
    try {
      await fs.access(candidateParent)
    } catch {
      return { error: `parent directory does not exist: ${candidateParent}` }
    }
  } else {
    try {
      await fs.mkdir(candidateParent, { recursive: true })
    } catch (err) {
      return { error: `mkdir parent failed: ${(err as Error).message}` }
    }
  }

  const resolved = await resolveInsideWorkspace(candidate, { allowMissingFile: true })
  if (!resolved.ok || !resolved.resolved) {
    return { error: resolved.reason ?? "path resolution failed" }
  }

  try {
    await fs.writeFile(resolved.resolved, args.content, "utf-8")
  } catch (err) {
    return { error: `write failed: ${(err as Error).message}` }
  }

  const verify = await verifyWrittenPathInside(resolved.resolved)
  if (!verify.ok) {
    try {
      await fs.unlink(resolved.resolved)
    } catch {
      // best-effort
    }
    return { error: verify.reason ?? "written path escaped workspace" }
  }

  return {
    written: true,
    bytes: Buffer.byteLength(args.content, "utf-8"),
    path: resolved.resolved,
  }
}
