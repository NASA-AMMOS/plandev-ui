import test from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { COMMAND_DICTIONARY_PATH, Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let dictionaries: Dictionaries;
let firstCommandDictionaryName: string;
let secondCommandDictionaryName: string;
let parcels: Parcels;

test.beforeAll(async ({ browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  setup = await setupTest(browser, { model: false });
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);

  firstCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  secondCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  await dictionaries.goto();
  await dictionaries.createCommandDictionary(firstCommandDictionaryName, COMMAND_DICTIONARY_PATH);
  await dictionaries.createCommandDictionary(secondCommandDictionaryName, COMMAND_DICTIONARY_PATH);
  await parcels.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
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
