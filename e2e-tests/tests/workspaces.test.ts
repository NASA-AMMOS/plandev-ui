import test, { expect } from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { Workspaces } from '../fixtures/Workspaces.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let dictionaries: Dictionaries;
let parcels: Parcels;
let workspaces: Workspaces;

test.beforeAll(async ({ baseURL, browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  setup = await setupTest(browser, { model: false });

  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  workspaces = new Workspaces(setup.page, parcels, baseURL);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  await parcels.goto();
  await parcels.createParcel(dictionaries.commandDictionaryName, baseURL);
});

test.afterAll(async () => {
  await parcels.goto();
  await parcels.deleteParcel();
  await dictionaries.goto();
  await dictionaries.deleteCommandDictionary();
  await teardownTest(setup);
});

// Form validation tests - independent, can run in parallel
test.describe('Workspaces - Form Validation', () => {
  test.beforeEach(async () => {
    await workspaces.goto();
  });

  test('Create workspace button should be disabled with no errors', async () => {
    await expect(workspaces.alertError).not.toBeVisible();
    await expect(workspaces.createButton).toBeDisabled();
  });

  test('Create workspace button should be disabled after only entering a name', async () => {
    await workspaces.fillInputName();
    await expect(workspaces.createButton).toBeDisabled();
  });

  test('Create workspace button should be disabled after only selecting a parcel', async () => {
    await workspaces.selectInputParcel();
    await expect(workspaces.createButton).toBeDisabled();
  });

  test('Create workspace button should be enabled after selecting a parcel and entering a location', async () => {
    await workspaces.selectInputParcel();
    await workspaces.fillInputLocation();
    await expect(workspaces.createButton).not.toBeDisabled();
  });
});

// CRUD operations - dependent, must run serially
test.describe.serial('Workspaces - CRUD Operations', () => {
  test('Create workspace', async () => {
    await workspaces.goto();
    const workspaceId = await workspaces.createWorkspace();
    expect(workspaceId).toBeTruthy();
    expect(workspaces.workspaceId).toEqual(workspaceId);
  });

  test('Get workspace ID should return the correct ID', async () => {
    await workspaces.goto();
    const workspaceId = await workspaces.getWorkspaceId();
    expect(workspaceId).toBeTruthy();
    expect(workspaceId).toEqual(workspaces.workspaceId);
  });

  test('Filter table should show only the filtered workspace', async () => {
    await workspaces.goto();
    await workspaces.filterTable(workspaces.workspaceName);
    await expect(workspaces.tableRow(workspaces.workspaceName)).toBeVisible();
  });

  test('Table row should display workspace name correctly', async () => {
    await workspaces.goto();
    await workspaces.filterTable(workspaces.workspaceName);
    const tableRow = workspaces.tableRow(workspaces.workspaceName);
    await expect(tableRow).toContainText(workspaces.workspaceName);
  });

  test('Delete workspace', async () => {
    await workspaces.goto();
    await workspaces.deleteWorkspace();
    await expect(workspaces.tableRow(workspaces.workspaceName)).not.toBeVisible();
  });
});
