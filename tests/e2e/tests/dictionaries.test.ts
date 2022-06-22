import { test, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';

let page: Page;
let dictionaries: Dictionaries;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  dictionaries = new Dictionaries(page);
  await dictionaries.goto();
});

test.afterAll(async () => {
  await page.close();
});

test.describe.serial('Dictionaries', () => {
  test('Create command dictionary', async () => {
    await dictionaries.createDictionary();
  });

  test('Delete command dictionary', async () => {
    await dictionaries.deleteDictionary();
  });
});
