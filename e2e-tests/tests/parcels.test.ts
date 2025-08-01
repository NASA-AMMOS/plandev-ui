import test, { type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { COMMAND_DICTIONARY_PATH, Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
let context: BrowserContext;
let dictionaries: Dictionaries;
let firstCommandDictionaryName: string;
let secondCommandDictionaryName: string;
let parcels: Parcels;
let page: Page;

test.beforeAll(async ({ browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  context = await browser.newContext();
  page = await context.newPage();
  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);

  firstCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  secondCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  await dictionaries.goto();
  await dictionaries.createCommandDictionary(firstCommandDictionaryName, COMMAND_DICTIONARY_PATH);
  await dictionaries.createCommandDictionary(secondCommandDictionaryName, COMMAND_DICTIONARY_PATH);
  await parcels.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Parcels', () => {
  test('Create parcel', async ({ baseURL }) => {
    await parcels.createParcel(firstCommandDictionaryName, baseURL);
  });

  test('Only one command dictionary can be selected at a time', async () => {
    await parcels.changeSelectedCommandDictionary(firstCommandDictionaryName, secondCommandDictionaryName);
  });

  test('Delete parcel', async () => {
    await parcels.goto();
    await parcels.deleteParcel();
  });
});
