# Phase 3 prototype findings: controlled Git interoperability

Backend `NASA-AMMOS/plandev`, branch
`prototype/git-authoritative-revisions`, local commit **`749510799`** on top of `52696699a`. Not pushed. No UI changes.

**Bottom line:** the contract holds. A workspace round-trips through an ordinary Git repository with a narrow,
fail-closed integration path (fetch → staging → validate on Git objects → forward integration → atomic promotion).
One real design gap surfaced: **revision ordinals are not mergeable across clones** (see §12).

## 1. Shape added

`WorkspaceGitRemoteService` (new, ~450 lines incl. Javadoc), no HTTP endpoints, not wired into `WorkspaceAppDriver`:

| Method                                                                            | Lock                               | What it does                                                           |
| --------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `linkRemote(ws, url)`                                                             | `withTrustedWorkspace`             | sets `remote.origin.url` in `.git/config` (operational, never content) |
| `push(ws)`                                                                        | `withTrustedWorkspace`             | atomic, non-forced push of main + revision tags                        |
| `fetchAndIntegrate(ws, userId)` → `Integration(outcome, head, importedRevisions)` | `withTrustedWorkspace`             | fetch → stage → validate → integrate → promote → reindex               |
| `cloneInto(ws, url, userId)`                                                      | `withLock`, then adopt via reindex | new _empty_ workspace from a remote, keeping revision ids              |

Small integration points:

- `WorkspaceHistory.advance(ws, target, then)`: moves main forward to a descendant, checks it out, runs `then`, and on
  any failure reuses the Phase 1 `restoreAll` path (HEAD, tracked files, created paths, `.seqdev/state.json`).
  Also adds `Kind.REMOTE_REJECTED`; `configure` and `userIdent` became package-private.
- `GitFileRevisions.validate(repo, ws, refs)`: same parser/rules as `readAll`, over any ref set keyed by tag name.
  Incoming tags are validated **together with** canonical ones, so duplicate `(fileId, ordinal)` across both sides is caught.

## 2. Refspecs

Fetch (into staging only, `TagOpt.NO_TAGS`, prune on):

```
+refs/heads/main                    : refs/remotes/origin/main
+refs/tags/plandev/revisions/*      : refs/remotes/origin/plandev-revisions/*
```

`+` and prune only affect the staging namespace. **`NO_TAGS` is essential:** JGit's default auto-follow would write
remote tags straight into `refs/tags/`, i.e. into canonical revision state, before validation.

Push (atomic, never forced):

```
refs/heads/main               : refs/heads/main
refs/tags/plandev/revisions/* : refs/tags/plandev/revisions/*
```

## 3. Integration behavior

| Case              | Result                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| equal             | `UP_TO_DATE`, no-op (new valid revision tags may still be promoted)                                                    |
| local ahead       | `LOCAL_AHEAD`, no-op; next push advances remote                                                                        |
| remote ahead      | `FAST_FORWARD`                                                                                                         |
| diverged, clean   | `MERGED`: ordinary two-parent commit (parents: local, remote), author = integrating user, committer = PlanDev          |
| conflict          | rejected, `"<path> (conflict)"`                                                                                        |
| unrelated history | rejected. Must be checked explicitly: JGit's recursive merger with no base merges against an empty tree and "succeeds" |

The merge is computed **in-core** (`ResolveMerger`), so conflicts never touch the working tree. No conflict markers, no partial state.

## 4. Rollback

Validation (tree + tags + merge) runs entirely on Git objects before anything canonical moves. A failure after checkout
(tested by injecting a failure into tag promotion after main advanced with a modify + add-in-new-dir + delete) is
restored by `advance` via the Phase 1 restore path. Test snapshot = HEAD + every working-tree byte including
`.seqdev/state.json` + canonical revision refs + catalog rows. All four were identical after every rejection.
Staging refs and fetched/merge objects may remain. They aren't authoritative.

## 5. Incoming workspace validation (`treeProblems`, on the target commit's tree)

- reserved names at any segment, case-insensitive (`.git`, `.seqdev`, `.gitignore`, `.gitattributes`, `.gitmodules`).
  `.seqdev/state.json` committed externally is rejected.
- symlinks, submodules/gitlinks, anything not a regular/executable file
- sidecar not a JSON object
- `fileId` present but not a UUID string
- sidecar carrying runtime fields (`readOnly`, `lastEditedBy`, `lastEditedAt`). PlanDev never commits them, and a
  Git-carried `readOnly` would silently mean nothing.
- two **live** files (sidecar whose content file exists) claiming one `fileId`

`requireValidIndex` + `requireClean` still run after checkout as a second guard.

## 6. Answers

**A. Export to normal Git: yes.** The test uses only the `git` CLI on a clone: files + sidecars present, `git log`
identical to the workspace's, each `plandev/revisions/<id>` is an annotated tag whose `^{commit}` is the revision's
commit, `git show <tag>:path` gives the historical content, and the annotation is the JSON record.

**B. External commits: yes.** They update the working copy; revision count and tags unchanged.

**C. fileId for rename lineage: yes.** Moving file + sidecar externally keeps `fileId`. Old revisions list under the
new path, preview reads from `pathAtRevision`, and the next revision is ordinal 2. No rename record needed.

**D. Malformed identity rejected cheaply: yes.** It's one pass over the tree plus parsing the sidecars. Duplicate fileId →
`[a.seq, copy.seq] all claim fileId …`, nothing changed. No identity is invented on import.

**E. Revisions round-trip: yes**, with the §12 caveat. A revision made in a clone (ws2) and pushed is imported into ws1
with the same UUID, ordinal, name, path, commit, creator and time, and shows up in the normal revision API. ws1's
next revision is `c`.

**F. Immutability over remote Git: yes, without a distributed protocol.**

- Same id with the same tag object, or the same target + message → accepted as the same revision.
- Moved to another commit, or re-annotated → whole import rejected.
- Missing on the remote → local untouched. The next push **re-publishes it**. Absence isn't deletion in either direction.
- New tags: validated with the canonical ones, must be reachable from the post-import main (a well-formed tag on a
  side-branch commit is rejected), then promoted in **one atomic `BatchRefUpdate`**: all or none.
- Ordinary tags (`release-test`, `experiment/foo`, even with a revision-shaped annotation) aren't fetched and never
  reach the catalog.

**G. "Merge or abort": yes** for content. Not for revision ordinals (§12).

**H. Few-MB files: no special handling needed.** 3 MiB of seeded random (incompressible) bytes: PlanDev save → push →
clone byte-identical; external replacement (3 MiB + 17 B) → import byte-identical. Test ran in 0.9 s locally (not a benchmark).

## 7. Second workspace / schema

`cloneInto(ws2)` reconstructs ws1's revisions with the same UUIDs (rows differ only in `workspace_id`). That needed the
schema change: the catalog PK is now **`(workspace_id, id)`** (edited migration 38 + init SQL in place, since it's
prototype-only). Checked on a live local dev stack in a rolled-back transaction: no FK depends on
the old PK, the same id goes into two workspaces, and a duplicate within one workspace is still rejected. APIs were
already workspace-scoped. The in-memory test catalog now enforces the same keys.

`cloneInto` is a separate operation because linking an existing PlanDev workspace to an independent non-empty remote is
unrelated history (PlanDev's own root commit), which is rejected by design.

## 8. Tests

`WorkspaceGitRemoteIntegrationTest`: 20 tests covering all 15 cases in the brief, plus forward-only outcomes and
unrelated history, the post-checkout rollback, a rejected clone leaving ws2 empty, and the ordinal collision.
Full workspace-server suite: **250 tests, 0 failures** (incl. the existing 102 history/revision tests).

## 9. Size

Production ≈ 530 lines: service ~450 (about a third is Javadoc), `WorkspaceHistory` +40, `GitFileRevisions` +30 net,
SQL 4. Tests: 668 new + 19 to the memory store. Remote code stays out of `WorkspaceFileSystemService`,
`WorkspaceRevisionService` and `WorkspaceBindings`.

## 10. Harder than expected

Mostly not. The non-obvious bits were JGit defaults that would have broken the trust boundary silently:
tag auto-follow (§2), and the recursive merger accepting unrelated histories (§3). Both are one line each once known.
Atomic multi-ref promotion and atomic push both worked on the local file transport. Production remotes need to
support atomic push (GitHub does; verify any other target).

## 11. Smaller findings / open product questions

1. **External edits bypass `readOnly` locks.** Git has no notion of them. Cheap option: reject an import that changes
   a path that's read-only in runtime state. Needs a product decision. Not built.
2. **Runtime state is keyed by path**, so an external rename drops the file's `readOnly` flag and deleted files leave
   stale entries. Keying runtime state by `fileId` would fix both.
3. **Last-edited attribution after a merge:** `lastEdits` diffs against first parent, so remote-side changes show as
   last edited by whoever ran the integration. Fast-forwards keep the external commit's author, which is an arbitrary
   Git name, not a PlanDev user.
4. Reindex runs only when tags were promoted. If it fails after Git accepted the import, the result is
   `REVISION_NOT_INDEXED` (Git ahead of the projection, repaired by reindex), the same as Phase 2.

## 12. Design change needed: revision ordinals aren't mergeable

Two clones that each create "the next" revision of the same file both mint ordinal 2 (`b`) with different UUIDs.
Even when the content merges cleanly (same edit on both sides), the import is rejected (`both claim ordinal 2`).
Then the workspace is stuck: push is non-fast-forward and integration is rejected. Recovery would require deleting a
local revision tag, which the immutability rule forbids.

UUID identity is conflict-free. The ordinal and display name (`a, b, c`) are the one part of the revision protocol
that assumes a single writer. Options for the final design:

- **(a) Single sequencer:** revision creation in a remote-linked workspace requires being up to date with the remote,
  then pushes the tag immediately (fails if the remote moved). Keeps names stable; adds a network dependency to "Create Revision".
- **(b) Drop ordinal uniqueness:** order by `(createdAt, id)` and derive names at read time. Mergeable, but names
  can shift when older revisions arrive, which breaks "assigned once, never recomputed".
- **(c) Unpublished revisions are provisional:** a revision that hasn't been pushed can be renumbered on integrate.
  This is the most complex option, and it weakens immutability.

(a) fits the "PlanDev owns canonical main" stance best. This should be decided before the real implementation.

## Explicitly not built

HTTP endpoints, credentials/OAuth/SSH, multi-remote, background sync, conflict UI, readOnly enforcement on import,
LFS, empty-directory portability, UI changes.
