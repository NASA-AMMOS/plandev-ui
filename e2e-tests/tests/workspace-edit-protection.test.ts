import test, { expect } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspace } from '../fixtures/Workspace.js';
import { WorkspaceSaveConflict } from '../fixtures/WorkspaceSaveConflict.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';
import { generateRandomName } from '../utilities/helpers.js';

// Simultaneous-edit protection: a save is rejected (412) when the file changed underneath the
// editor since it was opened. We simulate the "other editor" with a second browser context for
// the same 'test' user editing the same workspace file.

let setup: BrowserSetupResult; // primary editor — the one under test
let setupOther: BrowserSetupResult; // concurrent editor — changes the file first

let dictionaries: Dictionaries;
let parcels: Parcels;
let workspaces: Workspaces;
let workspace: Workspace; // primary page
let otherWorkspace: Workspace; // concurrent page (same workspace)
let conflict: WorkspaceSaveConflict;
let workspaceId: string;
let workspaceName: string;

test.beforeAll(async ({ baseURL, browser }) => {
  test.setTimeout(120000);

  setup = await setupTest(browser, { model: false });
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);

  await workspaces.goto();
  workspaceId = await workspaces.createWorkspace();
  workspaceName = workspaces.workspaceName;
  workspace = new Workspace(setup.page, workspaceId, workspaceName, baseURL);
  conflict = new WorkspaceSaveConflict(setup.page);

  // Second context (same 'test' user) editing the same workspace concurrently.
  setupOther = await setupTest(browser, { model: false });
  otherWorkspace = new Workspace(setupOther.page, workspaceId, workspaceName, baseURL);

  await workspace.goto();
});

test.afterAll(async () => {
  await workspaces.goto();
  await workspaces.deleteWorkspace(workspaceName);
  await parcels.goto();
  await parcels.deleteParcel();
  await dictionaries.goto();
  await dictionaries.deleteCommandDictionary();

  await teardownTest(setup);
  await teardownTest(setupOther);
});

/** Create a sequence file on the primary page and open it (capturing its base version). */
async function createAndOpenSequence(): Promise<string> {
  const { sequenceName } = await workspace.createSequence(undefined, `${generateRandomName()}.seq`);
  await workspace.searchForFileAndWait(sequenceName);
  await workspace.clickFile(sequenceName);
  await expect(workspace.saveSequenceButton).toBeVisible({ timeout: 10000 });
  return sequenceName;
}

/** The concurrent editor opens the same file and saves a change, advancing the server version. */
async function otherEditorSaves(sequenceName: string, content: string): Promise<void> {
  await otherWorkspace.goto();
  await otherWorkspace.searchForFileAndWait(sequenceName);
  await otherWorkspace.clickFile(sequenceName);
  await expect(otherWorkspace.saveSequenceButton).toBeVisible({ timeout: 10000 });
  await otherWorkspace.fillSequenceContent(content);
  await otherWorkspace.saveSequence();
}

/** Edit on the primary page and click Save, expecting the concurrency check to reject it. */
async function editAndSaveExpectingConflict(content: string): Promise<void> {
  await workspace.fillSequenceContent(content);
  await expect(workspace.saveSequenceButton).toBeEnabled();
  await workspace.saveSequenceButton.click();
}

test.describe.serial('Workspace simultaneous-edit protection', () => {
  test('consecutive saves of the same file succeed (token round-trips on PUT)', async () => {
    // No concurrent editor here: this confirms a save advances the stored token so the next
    // save against the same editor does not spuriously conflict.
    await createAndOpenSequence();

    await workspace.fillSequenceContent('// first change');
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();

    await workspace.fillSequenceContent('// second change');
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();
  });

  test('a stale save shows the conflict modal with a diff', async () => {
    const sequenceName = await createAndOpenSequence();
    await otherEditorSaves(sequenceName, '// their change');

    await editAndSaveExpectingConflict('// my change');

    await conflict.waitForConflict();

    // Cancel leaves the document dirty (Save still enabled) and keeps the stale token.
    await conflict.cancel();
    await expect(workspace.saveSequenceButton).toBeEnabled();

    // Resolve the still-dirty document so the next test starts from a clean editor:
    // saving again re-checks the (still stale) token, then take theirs to rebase clean.
    await workspace.saveSequenceButton.click();
    await conflict.waitForConflict();
    await conflict.takeTheirs();
    await expect(workspace.saveSequenceButton).toBeDisabled();
  });

  test('"Keep theirs" rebases the editor and the next save succeeds', async () => {
    const sequenceName = await createAndOpenSequence();
    await otherEditorSaves(sequenceName, '// their change');

    await editAndSaveExpectingConflict('// my change');
    await conflict.waitForConflict();
    await conflict.takeTheirs();

    // Editor now reflects the server version; saving a fresh edit succeeds (token advanced,
    // no immediate re-conflict).
    await workspace.fillSequenceContent('// after taking theirs');
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();
  });

  test('"Keep theirs" is undoable — Ctrl/Cmd+Z restores the discarded edits', async () => {
    const sequenceName = await createAndOpenSequence();
    await otherEditorSaves(sequenceName, '// their change');

    await editAndSaveExpectingConflict('// my change');
    await conflict.waitForConflict();
    await conflict.takeTheirs();

    // Right after taking theirs the editor shows the server version.
    const editor = setup.page.locator('.cm-content').first();
    await expect(editor).toContainText('// their change');

    // The rebase is recorded in the undo history, so a single undo restores the discarded edits
    // and the document goes dirty again (restored content differs from the new server baseline).
    await editor.click();
    await setup.page.keyboard.press('ControlOrMeta+z');
    await expect(editor).toContainText('// my change');
    await expect(workspace.saveSequenceButton).toBeEnabled();

    // Leave a clean editor for the next serial test. "Keep theirs" already advanced the stored
    // token to the server version, so this save succeeds without re-conflicting. Without it the
    // dirty doc leaks: the next test's createAndOpenSequence auto-selects its new file, which pops
    // a "Navigate Away" modal whose backdrop blocks the file-row click.
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();
  });

  test('"Keep mine" saves the local version and the next save succeeds', async () => {
    const sequenceName = await createAndOpenSequence();
    await otherEditorSaves(sequenceName, '// their change');

    await editAndSaveExpectingConflict('// my change');
    await conflict.waitForConflict();
    await conflict.takeMine();

    // Force-overwrite saved successfully and advanced the token.
    await workspace.waitForToast('Workspace File Saved Successfully');
    await expect(workspace.saveSequenceButton).toBeDisabled();

    await workspace.fillSequenceContent('// after taking mine');
    await workspace.saveSequence();
    await expect(workspace.saveSequenceButton).toBeDisabled();
  });

  test('Ctrl/Cmd+S is ignored while the conflict modal is open (no stacked save)', async () => {
    const sequenceName = await createAndOpenSequence();
    await otherEditorSaves(sequenceName, '// their change');

    await editAndSaveExpectingConflict('// my change');
    await conflict.waitForConflict();

    // The global save shortcut must not fire another save / stack a second modal.
    await setup.page.keyboard.press('ControlOrMeta+s');
    await expect(conflict.takeMineButton).toHaveCount(1);
    await expect(conflict.conflictTitle).toBeVisible();

    await conflict.takeTheirs();
  });

  test('a file deleted underneath shows the deleted/moved variant — Recreate restores it', async () => {
    const sequenceName = await createAndOpenSequence();

    // Concurrent editor deletes the file out from under the open editor.
    await otherWorkspace.goto();
    await otherWorkspace.searchForFileAndWait(sequenceName);
    await otherWorkspace.deleteFile(sequenceName);

    await editAndSaveExpectingConflict('// my change after delete');
    await conflict.waitForDeleted();
    await conflict.recreate();

    await workspace.waitForToast('Workspace File Saved Successfully');
    // The recreated file is back in the tree.
    await workspace.searchForFileAndWait(sequenceName);
    await expect(workspace.getFileRow(sequenceName)).toBeVisible();
  });

  test('the deleted/moved variant — "Discard & close" closes the document', async () => {
    const sequenceName = await createAndOpenSequence();

    await otherWorkspace.goto();
    await otherWorkspace.searchForFileAndWait(sequenceName);
    await otherWorkspace.deleteFile(sequenceName);

    await editAndSaveExpectingConflict('// my change after delete');
    await conflict.waitForDeleted();
    await conflict.discardAndClose();

    // The unsaved edits are discarded — the editor is no longer dirty (Save disabled) and
    // the discarded content is gone.
    await expect(workspace.saveSequenceButton).toBeDisabled();
    await expect(setup.page.locator('.cm-content').first()).not.toContainText('my change after delete');
  });
});
