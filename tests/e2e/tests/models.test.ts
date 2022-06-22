import { expect, test, type Page } from '@playwright/test';
import { Models } from '../fixtures/Models.js';

let page: Page;
let models: Models;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  models = new Models(page);
  await models.goto();
});

test.afterAll(async () => {
  await page.close();
});

test.describe.serial('Models', () => {
  test.beforeEach(async () => {
    await page.reload();
  });

  test('Create model button should be disabled with no errors', async () => {
    await expect(models.alertError).not.toBeVisible();
    await expect(models.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only entering a name', async () => {
    await models.fillInputName();
    await expect(models.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only entering a version', async () => {
    await models.fillInputVersion();
    await expect(models.createButton).toBeDisabled();
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
});
