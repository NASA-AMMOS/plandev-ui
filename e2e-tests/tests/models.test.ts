import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
let context: BrowserContext;
let models: Models;
let constraints: Constraints;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  models = new Models(page);
  constraints = new Constraints(page);
  await models.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Models', () => {
  test('Create model button should be disabled with no errors', async () => {
    await expect(models.alertError).not.toBeVisible();
    await expect(models.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only entering a name', async () => {
    await models.fillInputName();
    await expect(models.createButton).toBeDisabled();
    await models.fillInputName('');
  });

  test('Create model button should be disabled after only entering a version', async () => {
    await models.fillInputVersion();
    await expect(models.createButton).toBeDisabled();
    await models.fillInputVersion('');
  });

  test('Create model button should be disabled after only adding a file', async () => {
    await models.fillInputFile();
    await expect(models.createButton).toBeDisabled();
  });

  test('Create button should be enabled after entering a name, version, and file', async () => {
    await models.fillInputName();
    await models.fillInputVersion();
    await models.fillInputFile();
    await expect(models.createButton).not.toBeDisabled();
  });

  test('Create model', async ({ baseURL }) => {
    await models.createModel('', baseURL);
  });

  test('Delete model', async () => {
    await models.goto();
    await models.deleteModel();
  });

  test('Successfully creating a model should navigate to the model edit page', async () => {
    // Setup the test
    await expect(models.tableRow).not.toBeVisible();
    await models.fillInputName();
    await models.fillInputVersion();
    await models.fillInputFile();
    await models.createButton.click();
    // The create button shouldn't be there
    await expect(models.createButton).not.toBeVisible();
    // Instead, the creating button should be present and disabled
    await expect(models.creatingButton).toBeVisible();
    await expect(models.creatingButton).toBeDisabled();

    // App now navigates away after model creation
    await models.goto();

    await expect(models.createButton).toBeVisible();

    await expect(models.inputFile).toBeEmpty();
    await expect(models.inputVersion).toBeEmpty();
    await expect(models.inputName).toBeEmpty();

    // Cleanup
    await models.deleteModel();
  });

  test('Model creation errors should clear on page destroy', async ({ baseURL }) => {
    // Create model
    await models.createModel(models.modelName, baseURL);

    await models.goto();

    // Create model again with the same name
    await models.fillInputName(models.modelName);
    await models.fillInputVersion();
    await models.fillInputFile();
    await models.createButton.click();

    // Expect an error to be present
    await expect(models.alertError).toBeVisible();

    // Navigate away and back
    await constraints.goto();
    await models.goto();

    // Expect no error
    await expect(models.alertError).not.toBeVisible();

    // Cleanup
    await models.deleteModel();
  });
});
