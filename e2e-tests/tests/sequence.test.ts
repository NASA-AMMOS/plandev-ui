import test, { type BrowserContext, type Page } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Sequence } from '../fixtures/Sequence.js';
let context: BrowserContext;
let sequence: Sequence;
let dictionaries: Dictionaries;
let dictionaryName: string;
let parcels: Parcels;
let page: Page;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  dictionaries = new Dictionaries(page);
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;

  parcels = new Parcels(page);
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);

  sequence = new Sequence(page);
  await sequence.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Sequence', () => {
  test('Create new workspace', async () => {
    await sequence.createWorkspace();
  });
  test('Create new sequence', async () => {
    await sequence.createSequence(sequence.workspaceName, parcels.parcelName);
  });
  test('Open and modify a sequence via form editor', async () => {
    await sequence.modifySequence();
  });
  test('Open/Collapse seqJson editor', async () => {
    await sequence.seqJsonEditor();
  });
  test('Import SeqJson', async () => {
    await sequence.importSeqJson();
  });
  test('Delete a sequence', async () => {
    await sequence.deleteSequence();
  });
});
