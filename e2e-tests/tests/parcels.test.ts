import test, { type BrowserContext, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
let context: BrowserContext;
let dictionaries: Dictionaries;
let dictionaryName: string;
let parcels: Parcels;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);

  await dictionaries.goto();
  dictionaryName = await dictionaries.createDictionary();
  await parcels.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Parcels', () => {
  test('Create parcel', async () => {
    await parcels.createParcel(dictionaryName);
  });

  test('Delete parcel', async () => {
    await parcels.deleteParcel();
  });
});
