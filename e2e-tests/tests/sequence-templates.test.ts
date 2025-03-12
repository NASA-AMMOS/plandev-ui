import test, { type BrowserContext, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { SequenceTemplates } from '../fixtures/SequenceTemplates.js';

let context: BrowserContext;
let sequenceTemplates: SequenceTemplates;
let dictionaries: Dictionaries;
let dictionaryName: string;
let models: Models;
let parcels: Parcels;
let page: Page;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  await models.goto();
  await models.createModel(baseURL);

  dictionaries = new Dictionaries(page);
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;

  parcels = new Parcels(page);
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);

  sequenceTemplates = new SequenceTemplates(page, parcels, models);
  await sequenceTemplates.goto();
});

test.afterAll(async () => {
  await models.goto();
  await models.deleteModel();
  await parcels.goto();
  await page.close();
  await context.close();
});

test.beforeEach(async () => {
  await sequenceTemplates.goto();
});

test.describe.serial('Sequence Templates', () => {
  test('Create new sequence template', async () => {
    await sequenceTemplates.createSequenceTemplate('Test Template', 'TEXT');
  });
  test('Open and modify a sequence via form editor', async () => {
    await sequenceTemplates.updateSequenceTemplate('Test Template', 'Test Line');
  });
  test('Delete a sequence template', async () => {
    await sequenceTemplates.deleteSequenceTemplate('Test Template');
  });
});
