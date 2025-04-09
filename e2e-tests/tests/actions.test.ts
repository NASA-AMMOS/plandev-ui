import test, { type BrowserContext, type Page } from '@playwright/test';
import { Action } from '../fixtures/Action.js';
import { Sequence } from '../fixtures/Sequence.js';

let action: Action;
let context: BrowserContext;
let sequence: Sequence;
let page: Page;
let workspaceName: string = '';

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  action = new Action(page);
  sequence = new Sequence(page);

  await sequence.goto();
});

test.afterAll(async () => {
  await page.close();
  await context.close();
});

test.describe.serial('Action', () => {
  test('Create new workspace', async () => {
    workspaceName = await sequence.createWorkspace();
  });

  test('Select workspace', async () => {
    await page.getByRole('gridcell', { name: workspaceName }).first().click();
  });

  test('Navigate to workspace actions', async () => {
    await page.getByRole('button', { name: 'Action' }).first().click();
    await page.waitForURL('/sequencing/actions?workspaceId=**');
    await page.waitForTimeout(250);
    await action.updatePage(page);
  });

  test('Create an action', async () => {
    await action.createAction();
  });

  test('Inspect an action', async () => {
    await action.inspectAction();
  });

  test('Configure an action', async () => {
    await action.configureAction();
  });

  test('Run an action', async () => {
    await action.runAction();
  });
});
