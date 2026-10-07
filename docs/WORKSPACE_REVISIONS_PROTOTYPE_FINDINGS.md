# Workspace file revisions: UX prototype findings (2026-10-07)

Both branches are pushed to `origin`:

- UI: NASA-AMMOS/plandev-ui `prototype/workspace-file-revisions-ui-v2`, branched from develop `5520951d`.
- Backend: NASA-AMMOS/aerie `prototype/git-authoritative-revisions`.

Try it: http://localhost:3111/workspaces/2422 (`orbit_burn.seq`), login test/test. The workspace image is rebuilt on stack `workspace-file-versioning`.

Screenshots (not checked in; in `~/code/claude-plans/plandev/workspace-revisions-ux-prototype/`):

- 01–14 are from the first pass. Their status wording is the old one ("Matches revision X" / "Changes since revision X").
- 15–18 show the current wording:
  - 15: saved copy matches the latest revision (Create disabled)
  - 16: saved copy matches an older revision after a restore
  - 17: unsaved edits shown next to the saved-copy state
  - 18: saved changes that no revision holds, with the restore warning

## Revision state model

- **Versioned state, which revisions hold and restore replaces:** file content plus versioned sidecar metadata (fileId, createdBy/createdAt, user fields, unknown future fields).
- **Runtime state, never in a revision:** `readOnly`.
- **Derived state, never in a revision:** `lastEditedBy` and `lastEditedAt`.
- Consequences:
  - Toggling readOnly is not a change to a file's revision state.
  - Restore never brings back a historical readOnly; the file keeps its current one.
  - Restore _can_ change user metadata.

## Current behaviour

- **Where it lives:** a right-panel "Revisions" tab (History icon) for any file. It stays selected when you switch files.
- **Working copy status:**
  - "No revisions yet."
  - "Saved copy matches revision X"
  - "Saved changes since revision X" (blue dot)
  - A separate amber "Unsaved editor changes" line.
- **Matching rule:** the backend's `matchingRevision` is the newest revision whose content and versioned metadata equal the saved file.
- **Create** is disabled when:
  - the editor is dirty ("Save your changes before creating a revision.")
  - the saved copy already matches the latest revision ("The saved copy already matches the latest revision.")
- Create is still allowed when the saved copy matches an older revision, which records a deliberate return to it. The backend enforces the same rule with 409 `WORKSPACE_REVISION_UNCHANGED`. Create also works on read-only files.
- **Preview:**
  - A content diff modal, with the revision on the left and "Working copy" or "Current editor (unsaved)" on the right.
  - The modal says "File metadata also differs." when the revision's versioned metadata differs from the current file's.
  - Content and both sets of metadata load together, so Restore is enabled only after all of them are checked.
- **Restore:**
  - Confirmed inline in the modal footer.
  - Blocked when the editor is dirty, the file is read-only, or the user has no write permission.
  - The request and the editor reload run while the modal stays open over the editor, so nothing typed meanwhile can be overwritten.
  - The warning "The saved copy is not in any revision, so it will be replaced and lost." appears only when no revision matches the saved copy.
  - A stale restore (412) is not applied: the editor reloads and a notice appears in the panel.
  - After a restore, the editor ends clean, no revision is created, and history survives a rename.

## Findings

1. **Resolved:** after restoring b, the panel said "Changes since revision e". It now reports the matching revision.
2. **Resolved:** "Matches revision a" next to "Unsaved editor changes" read as a contradiction. It now says "Saved copy matches…".
3. **Resolved:** a duplicate of the latest revision (e.g. g == f) can no longer be created.
4. Restore can lose saved work that no revision holds, so the confirm-step warning is the most important sentence in the flow. "Create a revision first?" is worth considering for the real design.
5. When several revisions are identical, the newest one wins. After clicking "Restore b", the panel said "Saved copy matches revision **g**", because g was an older duplicate of b. That is correct but reads oddly, and needs a design decision. With duplicates of the latest now blocked, new duplicates only come from returning to an old state and recording it.
6. **Discoverability:** the tab resets to Metadata on reload, and the icon alone is easy to miss. A promising direction is an editor-header affordance such as "Revision c" or "Changes since c" that opens the panel. Not prototyped.
7. Requiring Save before Create felt natural: Save stays primary, and Create is a deliberate second step.
8. The diff preview was clearly useful. Most of the time you want to know what differs, not read the old file.
9. **Rename:** history follows the file. `pathAtRevision` is hidden, and nobody missed it.
10. **Metadata in preview:** only a "metadata differs" note exists. A real design needs a way to see what will change.
11. **Binary files (known limitation):** the preview treats every file as text and feeds the revision's bytes to CodeMirror. A real implementation needs a "no text preview" state.
12. **Backend issue (real implementation):** `GET /metadata` sends the file's content ETag. A metadata-only change keeps that ETag, so browsers revalidate with a 304 and show stale metadata. This exists on develop too. UI commit `62e3b5f6` works around it with `cache: 'no-store'`. The real fix is an ETag computed from the metadata itself, or no ETag on that endpoint.
13. **Unrelated backend bug:** moving a file into a folder that doesn't exist yet returns 500, because the sidecar `.meta.seqdev` move fails with NoSuchFileException.
