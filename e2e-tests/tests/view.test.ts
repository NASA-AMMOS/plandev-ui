import { expect, test } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('View', () => {
  test(`Clicking on 'Browse Saved Views' in the view menu should pop up a SavedViewsModal`, async () => {
    await setup.view.openViewMenu();
    await setup.view.openSavedViews();
    await setup.page.locator('.modal .st-button .bi-x').click();
  });

  test(`Clicking on 'Upload view file' in the view menu should pop up a UploadViewModal`, async () => {
    await setup.view.openViewMenu();
    await expect(setup.view.navButtonViewUploadViewMenuButton).toBeVisible();
    await setup.view.navButtonViewUploadViewMenuButton.click();
    await expect(setup.page.locator('.modal .modal-header:has-text("Upload View JSON")')).toBeVisible();
    await setup.page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Clicking on 'Rename View' in the view menu should pop up an EditViewModal`, async () => {
    await setup.view.openViewMenu();
    // Since no view is loaded the rename menu button should not be visible
    await expect(setup.view.navButtonViewRenameViewMenuButton).not.toBeVisible();
    const viewName = setup.view.createViewName();
    const viewName2 = setup.view.createViewName();
    await setup.view.createView(viewName);
    await setup.page.waitForTimeout(250);
    await expect(setup.view.navButtonViewMenuTitle).toHaveText(viewName);
    await setup.view.renameView(viewName2);
    await setup.page.waitForTimeout(250);
    await expect(setup.view.navButtonViewMenuTitle).toHaveText(viewName2);
    await setup.view.deleteView(viewName2);
  });

  test(`Clicking on 'Save As' in the view menu should pop up a CreateViewModal`, async () => {
    await setup.view.openSaveAs();
    await expect(setup.page.locator('.modal .modal-header:has-text("Save new view")')).toBeVisible();
    await setup.page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an invalid view file should display an error and prevent the file from being uploaded`, async () => {
    await setup.view.openViewMenu();
    await expect(setup.view.navButtonViewUploadViewMenuButton).toBeVisible();
    await setup.view.navButtonViewUploadViewMenuButton.click();
    await setup.view.fillViewInputName();
    await setup.view.fillViewInputFile(setup.view.invalidViewFilePath);
    await expect(setup.page.locator('.modal-content .error')).toBeVisible();
    await expect(setup.page.locator('.modal .st-button:has-text("Upload View")')).toBeDisabled();
    await expect(setup.page.locator('.modal')).toBeVisible();
    // Expect validation error collapse to be visible
    await expect(setup.page.locator('.modal-content .collapse-root')).toBeVisible();
    await setup.page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an valid view file should not display an error and not prevent the file from being uploaded`, async () => {
    await setup.view.openViewMenu();
    await expect(setup.view.navButtonViewUploadViewMenuButton).toBeVisible();
    await setup.view.navButtonViewUploadViewMenuButton.click();
    await setup.view.fillViewInputName();
    await setup.view.fillViewInputFile();
    await expect(setup.page.locator('.modal-content .error')).not.toBeVisible();
    await setup.page.locator('.modal .st-button:has-text("Upload View")').click();
    await expect(setup.page.locator('.modal')).not.toBeVisible();
  });

  test(`Selecting an out of date view file should not display an error and not prevent the file from being uploaded`, async () => {
    await setup.view.openViewMenu();
    await expect(setup.view.navButtonViewUploadViewMenuButton).toBeVisible();
    await setup.view.navButtonViewUploadViewMenuButton.click();
    await setup.view.fillViewInputName();
    await setup.view.fillViewInputFile(setup.view.outOfDateViewFilePath);
    await expect(setup.page.locator('.modal-content .error')).not.toBeVisible();
    await setup.page.locator('.modal .st-button:has-text("Upload View")').click();
    await expect(setup.page.locator('.modal')).not.toBeVisible();
  });
});
