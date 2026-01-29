import test, { expect } from '@playwright/test';
import { Tags } from '../fixtures/Tags.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let tags: Tags;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser, { model: false });
  tags = new Tags(setup.page);
  await tags.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Tags', () => {
  test('Create tag button should be disabled with no errors', async () => {
    await expect(tags.inputName).toBeVisible();
    await expect(tags.alertError).not.toBeVisible();
    await expect(tags.createButton).toBeDisabled();
  });

  test('Create tag button should be disabled after only entering a name', async () => {
    await expect(tags.createButton).toBeDisabled();
    await tags.fillInputName();
    await expect(tags.createButton).toBeEnabled();
  });

  test('Create tag', async () => {
    await tags.createTag();
  });

  test('Delete tag', async () => {
    await tags.deleteTag();
  });

  test('Create button should be disabled after submitting once', async () => {
    // Setup the test
    await expect(tags.tableRow).not.toBeVisible();
    await tags.createTag();

    // The create button shouldn't be enabled
    await expect(tags.createButton).toBeDisabled();

    // Cleanup
    await tags.deleteTag();
  });
});
