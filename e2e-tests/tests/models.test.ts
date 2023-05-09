import { Models } from '../fixtures/Models.js';
import { expect, test, type BrowserContext, type Page } from '../fixtures/PlaywrightTest.js';

let context: BrowserContext;
let models: Models;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  models = new Models(page);
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

  test('Create model', async () => {
    await models.createModel();
  });

  test('Delete model', async () => {
    await models.deleteModel();
  });

  test('Create button should be disabled after submitting once', async () => {
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
    await expect(models.createButton).toBeVisible();

    await expect(models.inputFile).toBeEmpty();
    await expect(models.inputVersion).toBeEmpty();
    await expect(models.inputName).toBeEmpty();
  });
});
