import { test, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Models } from '../fixtures/Models.js';

let page: Page;

let dictionaries: Dictionaries;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;
let models: Models;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  dictionaries = new Dictionaries(page);
  expansionRules = new ExpansionRules(page);
  expansionSets = new ExpansionSets(page, expansionRules);
  models = new Models(page);

  await models.goto();
  await models.createModel();
  await dictionaries.goto();
  await dictionaries.creatDictionary();
  await expansionRules.goto();
});

test.afterAll(async () => {
  await models.goto();
  await models.deleteModel();
  await dictionaries.goto();
  await dictionaries.deleteDictionary();
  await page.close();
});

test.describe.serial('Expansion', () => {
  test('Create expansion rule', async ({ baseURL }) => {
    await expansionRules.createExpansionRule(baseURL, dictionaries.dictionaryName, models.modelName);
  });

  test('Create expansion set', async ({ baseURL }) => {
    await expansionSets.createExpansionSet(baseURL, dictionaries.dictionaryName, models.modelName);
  });

  test('Delete expansion rule', async () => {
    await expansionRules.deleteExpansionRule();
  });
});
