import { test as base } from '@playwright/test';
import { DictionariesPage } from '../fixtures/DictionariesPage.js';

const test = base.extend<{ dictionariesPage: DictionariesPage }>({
  dictionariesPage: async ({ page }, use) => {
    const dictionariesPage = new DictionariesPage(page);
    await use(dictionariesPage);
  },
});

test.describe('Dictionaries Page', () => {
  test.beforeEach(async ({ dictionariesPage }) => {
    await dictionariesPage.goto();
  });

  test('Create and delete dictionary', async ({ dictionariesPage }) => {
    await dictionariesPage.creatDictionary();
    await dictionariesPage.deleteDictionary();
  });
});
