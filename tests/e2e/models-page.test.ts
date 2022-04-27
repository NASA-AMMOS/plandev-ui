import { expect, test as base } from '@playwright/test';
import { ModelsPage } from '../fixtures/ModelsPage.js';

const test = base.extend<{ modelsPage: ModelsPage }>({
  modelsPage: async ({ page }, use) => {
    const modelsPage = new ModelsPage(page);
    await modelsPage.goto();
    await use(modelsPage);
  },
});

test.describe('Models Page', () => {
  test('Create model button should be disabled with no errors', async ({ modelsPage }) => {
    await expect(modelsPage.alertError).not.toBeVisible();
    await expect(modelsPage.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only entering a name', async ({ modelsPage }) => {
    await modelsPage.fillInputName();
    await expect(modelsPage.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only entering a version', async ({ modelsPage }) => {
    await modelsPage.fillInputVersion();
    await expect(modelsPage.createButton).toBeDisabled();
  });

  test('Create model button should be disabled after only adding a file', async ({ modelsPage }) => {
    await modelsPage.fillInputFile();
    await expect(modelsPage.createButton).toBeDisabled();
  });

  test('Create button should be enabled after entering a name, version, and file', async ({ modelsPage }) => {
    await modelsPage.fillInputName();
    await modelsPage.fillInputVersion();
    await modelsPage.fillInputFile();
    await expect(modelsPage.createButton).not.toBeDisabled();
  });

  test('Create and delete model', async ({ modelsPage }) => {
    await modelsPage.createModel();
    await modelsPage.deleteModel();
  });
});
