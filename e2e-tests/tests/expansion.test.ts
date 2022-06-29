import { test, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Models } from '../fixtures/Models.js';

let dictionaries: Dictionaries;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;
let models: Models;
let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  models = new Models(page);
  dictionaries = new Dictionaries(page);
  expansionRules = new ExpansionRules(page, dictionaries, models);
  expansionSets = new ExpansionSets(page, dictionaries, models, expansionRules);

  await models.goto();
  await models.createModel();
  await dictionaries.goto();
  await dictionaries.createDictionary();
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
    await expansionRules.createExpansionRule(baseURL);
  });

  test('Create expansion set', async ({ baseURL }) => {
    await expansionSets.createExpansionSet(baseURL);
  });

  test('Delete expansion rule', async () => {
    await expansionRules.deleteExpansionRule();
  });
});
