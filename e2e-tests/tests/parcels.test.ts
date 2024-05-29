import test, { type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { COMMAND_DICTIONARY_PATH, Dictionaries, DictionaryType } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
let context: BrowserContext;
let dictionaries: Dictionaries;
let firstCommandDictionaryName: string;
let secondCommandDictionaryName: string;
let parcels: Parcels;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);

  firstCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  secondCommandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const firstCommandDictionaryBuffer = dictionaries.readDictionary(firstCommandDictionaryName, COMMAND_DICTIONARY_PATH);
  const secondCommandDictionaryBuffer = dictionaries.readDictionary(
    secondCommandDictionaryName,
    COMMAND_DICTIONARY_PATH,
  );

  await dictionaries.goto();
  await dictionaries.updatePage(page, DictionaryType.CommandDictionary, firstCommandDictionaryName);
  await dictionaries.createDictionary(
    firstCommandDictionaryBuffer,
    firstCommandDictionaryName,
    dictionaries.commandDictionaryTableRow,
    DictionaryType.CommandDictionary,
  );
  await dictionaries.updatePage(page, DictionaryType.CommandDictionary, secondCommandDictionaryName);
  await dictionaries.createDictionary(
    secondCommandDictionaryBuffer,
    secondCommandDictionaryName,
    dictionaries.commandDictionaryTableRow,
    DictionaryType.CommandDictionary,
  );
  await parcels.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Parcels', () => {
  test('Create parcel', async () => {
    await parcels.createParcel(firstCommandDictionaryName);
  });

  test('Only one command dictionary can be selected at a time', async () => {
    await parcels.changeSelectedCommandDictionary(firstCommandDictionaryName, secondCommandDictionaryName);
  });

  test('Delete parcel', async () => {
    await parcels.goto();
    await parcels.deleteParcel();
  });
});
