import { test as base } from '@playwright/test';
import { DictionariesPage } from '../fixtures/DictionariesPage.js';
import { ExpansionRulesPage } from '../fixtures/ExpansionRulesPage.js';
import { ModelsPage } from '../fixtures/ModelsPage.js';

const test = base.extend<{
  dictionariesPage: DictionariesPage;
  expansionRulesPage: ExpansionRulesPage;
  modelsPage: ModelsPage;
}>({
  dictionariesPage: async ({ page }, use) => {
    const dictionariesPage = new DictionariesPage(page);
    await use(dictionariesPage);
  },
  expansionRulesPage: async ({ page }, use) => {
    const expansionRulesPage = new ExpansionRulesPage(page);
    await expansionRulesPage.goto();
    await use(expansionRulesPage);
  },
  modelsPage: async ({ page }, use) => {
    const modelsPage = new ModelsPage(page);
    await use(modelsPage);
  },
});

test.describe('Expansion Rules Page', () => {
  test.beforeEach(async ({ dictionariesPage, expansionRulesPage, modelsPage }) => {
    await modelsPage.goto();
    await modelsPage.createModel();
    await dictionariesPage.goto();
    await dictionariesPage.creatDictionary();
    await expansionRulesPage.goto();
  });

  test.afterEach(async ({ dictionariesPage, modelsPage }) => {
    await modelsPage.goto();
    await modelsPage.deleteModel();
    await dictionariesPage.goto();
    await dictionariesPage.deleteDictionary();
  });

  test('Create and delete expansion rule', async ({ baseURL, dictionariesPage, expansionRulesPage, modelsPage }) => {
    await expansionRulesPage.creatExpansionRule(baseURL, dictionariesPage.dictionaryName, modelsPage.modelName);
    await expansionRulesPage.deleteExpansionRule();
  });
});
