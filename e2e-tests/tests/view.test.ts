import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';

import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { View } from '../fixtures/View.js';

let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let view: View;
let constraints: Constraints;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  view = new View(page);

  await models.goto();
  await models.createModel('', baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('View', () => {
  test(`Clicking on 'Browse Saved Views' in the view menu should pop up a SavedViewsModal`, async () => {
    await view.openViewMenu();
    await view.openSavedViews();
    await page.locator('.modal .st-button .bi-x').click();
  });

  test(`Clicking on 'Upload view file' in the view menu should pop up a UploadViewModal`, async () => {
    await view.openViewMenu();
    await expect(view.navButtonViewUploadViewMenuButton).toBeVisible();
    await view.navButtonViewUploadViewMenuButton.click();
    await expect(page.locator('.modal .modal-header:has-text("Upload View JSON")')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Clicking on 'Rename View' in the view menu should pop up an EditViewModal`, async () => {
    await view.openViewMenu();
    // Since no view is loaded the rename menu button should not be visible
    await expect(view.navButtonViewRenameViewMenuButton).not.toBeVisible();
    const viewName = view.createViewName();
    const viewName2 = view.createViewName();
    await view.createView(viewName);
    await page.waitForTimeout(250);
    await expect(view.navButtonViewMenuTitle).toHaveText(viewName);
    await view.renameView(viewName2);
    await page.waitForTimeout(250);
    await expect(view.navButtonViewMenuTitle).toHaveText(viewName2);
    await view.deleteView(viewName2);
  });

  test(`Clicking on 'Save As' in the view menu should pop up a CreateViewModal`, async () => {
    await view.openSaveAs();
    await expect(page.locator('.modal .modal-header:has-text("Save new view")')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an invalid view file should display an error and prevent the file from being uploaded`, async () => {
    await view.openViewMenu();
    await expect(view.navButtonViewUploadViewMenuButton).toBeVisible();
    await view.navButtonViewUploadViewMenuButton.click();
    await view.fillViewInputName();
    await view.fillViewInputFile(view.invalidViewFilePath);
    await expect(page.locator('.modal-content .error')).toBeVisible();
    await expect(page.locator('.modal .st-button:has-text("Upload View")')).toBeDisabled();
    await expect(page.locator('.modal')).toBeVisible();
    // Expect validation error collapse to be visible
    await expect(page.locator('.modal-content .collapse')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an valid view file should not display an error and not prevent the file from being uploaded`, async () => {
    await view.openViewMenu();
    await expect(view.navButtonViewUploadViewMenuButton).toBeVisible();
    await view.navButtonViewUploadViewMenuButton.click();
    await view.fillViewInputName();
    await view.fillViewInputFile();
    await expect(page.locator('.modal-content .error')).not.toBeVisible();
    await page.locator('.modal .st-button:has-text("Upload View")').click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});
