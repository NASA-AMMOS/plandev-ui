import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Tags } from '../fixtures/Tags.js';
let context: BrowserContext;
let tags: Tags;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  tags = new Tags(page);
  await tags.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
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
    await tags.fillInputName();
    await tags.createButton.click();
    // The create button shouldn't be there
    await expect(tags.createButton).toBeDisabled();

    // Cleanup
    await tags.deleteTag();
  });
});
