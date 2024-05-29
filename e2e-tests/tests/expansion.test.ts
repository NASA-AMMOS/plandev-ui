import test, { type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { COMMAND_DICTIONARY_PATH, Dictionaries, DictionaryType } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
let context: BrowserContext;
let dictionaries: Dictionaries;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;
let models: Models;
let page: Page;
let parcels: Parcels;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);
  expansionRules = new ExpansionRules(page, parcels, models);
  expansionSets = new ExpansionSets(page, parcels, models, expansionRules);

  const dictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const dictionaryBuffer = dictionaries.readDictionary(dictionaryName, COMMAND_DICTIONARY_PATH);

  await models.goto();
  await models.createModel();
  await dictionaries.goto();
  await dictionaries.updatePage(page, DictionaryType.CommandDictionary, dictionaryName);
  await dictionaries.createDictionary(
    dictionaryBuffer,
    dictionaryName,
    dictionaries.commandDictionaryTableRow,
    DictionaryType.CommandDictionary,
  );
  await parcels.goto();
  await parcels.createParcel(dictionaryName);
  await expansionRules.goto();
});

test.afterAll(async () => {
  await models.goto();
  await models.deleteModel();
  await parcels.goto();
  await page.close();
  await context.close();
});

test.describe.serial('Expansion', () => {
  test('Create expansion rule', async ({ baseURL }) => {
    await expansionRules.createExpansionRule(baseURL);
  });

  test('Create expansion set', async ({ baseURL }) => {
    await expansionSets.createExpansionSet(baseURL);
  });

  test('Delete expansion rule', async () => {
    await expansionRules.deleteExpansionRule();
  });
});
