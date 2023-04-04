import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page, models);
  schedulingConditions = new SchedulingConditions(page, models);
  schedulingGoals = new SchedulingGoals(page, models);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel();
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

test.describe.serial('Plan', () => {
  test('Error page should not be visible, and the plan title should be visible in the top navigation bar', async () => {
    await expect(plan.appError).not.toBeVisible();
    await expect(plan.planTitle).toBeVisible();
  });

  test('Initially the View layout should be displayed', async () => {
    await expect(plan.panelActivityDirectivesTable).toBeVisible();
    await expect(plan.panelActivityForm).toBeVisible();
    await expect(plan.panelActivityTypes).toBeVisible();
    await expect(plan.panelTimeline).toBeVisible();
  });

  test(`Clicking on 'Constraints' in the grid menu should show the constraints panel`, async () => {
    await expect(plan.panelConstraints).not.toBeVisible();
    await plan.showPanel('Constraints');
    await expect(plan.panelConstraints).toBeVisible();
  });

  test(`Clicking on 'Constraint Violations' in the grid menu should show the constraint violations panel`, async () => {
    await expect(plan.panelConstraintViolations).not.toBeVisible();
    await plan.showPanel('Constraint Violations');
    await expect(plan.panelConstraintViolations).toBeVisible();
  });

  test(`Clicking on 'Expansion' in the grid menu should show the expansion panel`, async () => {
    await expect(plan.panelExpansion).not.toBeVisible();
    await plan.showPanel('Expansion');
    await expect(plan.panelExpansion).toBeVisible();
  });

  test(`Clicking on 'Scheduling Goals' in the grid menu should show the scheduling goals panel`, async () => {
    await expect(plan.panelSchedulingGoals).not.toBeVisible();
    await plan.showPanel('Scheduling Goals');
    await expect(plan.panelSchedulingGoals).toBeVisible();
  });

  test(`Clicking on 'Scheduling Conditions' in the grid menu should show the scheduling conditions panel`, async () => {
    await expect(plan.panelSchedulingConditions).not.toBeVisible();
    await plan.showPanel('Scheduling Conditions');
    await expect(plan.panelSchedulingConditions).toBeVisible();
  });

  test(`Clicking on 'Simulation' in the grid menu should show the simulation panel`, async () => {
    await expect(plan.panelSimulation).not.toBeVisible();
    await plan.showPanel('Simulation');
    await expect(plan.panelSimulation).toBeVisible();
  });

  test(`Clicking on 'Timeline Editor' in the grid menu should show the timeline editor panel`, async () => {
    await expect(plan.panelTimelineEditor).not.toBeVisible();
    await plan.showPanel('Timeline Editor');
    await expect(plan.panelTimelineEditor).toBeVisible();
  });

  test(`Hovering on 'Constraints' in the top navigation bar should show the constraints menu`, async () => {
    await expect(plan.navButtonConstraintsMenu).not.toBeVisible();
    plan.navButtonConstraints.hover();
    await expect(plan.navButtonConstraintsMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonConstraintsMenu).not.toBeVisible();
  });

  test(`Hovering on 'Simulation' in the top navigation bar should show the simulation menu`, async () => {
    await expect(plan.navButtonSimulationMenu).not.toBeVisible();
    plan.navButtonSimulation.hover();
    await expect(plan.navButtonSimulationMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonSimulationMenu).not.toBeVisible();
  });

  test(`Hovering on 'Expansion' in the top navigation bar should show the expansion menu`, async () => {
    await expect(plan.navButtonExpansionMenu).not.toBeVisible();
    plan.navButtonExpansion.hover();
    await expect(plan.navButtonExpansionMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonExpansionMenu).not.toBeVisible();
  });

  test(`Hovering on 'Scheduling' in the top navigation bar should show the scheduling menu`, async () => {
    await expect(plan.navButtonSchedulingMenu).not.toBeVisible();
    plan.navButtonScheduling.hover();
    await expect(plan.navButtonSchedulingMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonSchedulingMenu).not.toBeVisible();
  });

  test(`Hovering on 'Default View' in the top navigation bar should show the view menu`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.hover();
    await expect(plan.navButtonViewMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonViewMenu).not.toBeVisible();
  });

  test(`Clicking on 'Saved Views' in the view menu should pop up a SavedViewsModal`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.hover();
    await expect(plan.navButtonViewMenu).toBeVisible();
    await expect(plan.navButtonViewSavedViewsMenuButton).toBeVisible();
    await plan.navButtonViewSavedViewsMenuButton.click();
    await expect(page.locator('.modal .modal-header:has-text("Saved Views")')).toBeVisible();
    await page.locator('.modal .st-button .bi-x').click();
  });

  test(`Clicking on 'Upload view file' in the view menu should pop up a UploadViewModal`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.hover();
    await expect(plan.navButtonViewMenu).toBeVisible();
    await expect(plan.navButtonViewUploadViewMenuButton).toBeVisible();
    await plan.navButtonViewUploadViewMenuButton.click();
    await expect(page.locator('.modal .modal-header:has-text("Upload View JSON")')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Clicking on 'Save As' in the view menu should pop up a CreateViewModal`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.click();
    await expect(plan.navButtonViewMenu).toBeVisible();
    await expect(plan.navButtonViewSaveAsMenuButton).toBeVisible();
    await plan.navButtonViewSaveAsMenuButton.click();
    await expect(page.locator('.modal .modal-header:has-text("Save new view")')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an invalid view file should display an error and prevent the file from being uploaded`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.hover();
    await expect(plan.navButtonViewMenu).toBeVisible();
    await expect(plan.navButtonViewUploadViewMenuButton).toBeVisible();
    await plan.navButtonViewUploadViewMenuButton.click();
    await plan.fillViewInputName();
    await plan.fillViewInputFile(plan.invalidPlanFilePath);
    await expect(page.locator('.modal-content .error')).toBeVisible();
    await expect(page.locator('.modal .st-button:has-text("Upload View")')).toBeDisabled();
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal .st-button:has-text("Cancel")').click();
  });

  test(`Selecting an valid view file should not display an error and not prevent the file from being uploaded`, async () => {
    await expect(plan.navButtonViewMenu).not.toBeVisible();
    plan.navButtonView.hover();
    await expect(plan.navButtonViewMenu).toBeVisible();
    await expect(plan.navButtonViewUploadViewMenuButton).toBeVisible();
    await plan.navButtonViewUploadViewMenuButton.click();
    await plan.fillViewInputName();
    await plan.fillViewInputFile();
    await expect(page.locator('.modal-content .error')).not.toBeVisible();
    await page.locator('.modal .st-button:has-text("Upload View")').click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test(`Creating and setting a preset to a directive should update the parameter values`, async () => {
    await page.getByRole('button', { name: 'CreateActivity-GrowBanana' }).click();
    await page.getByRole('gridcell', { name: 'GrowBanana' }).first().click();
    await page.locator('.parameter-base-number input[type="number"]').fill('2');
    await page.locator('.parameter-base-number input[type="number"]').blur();
    await plan.fillActivityPresetName('Preset 1');
    await page.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();

    await expect(page.locator('.preset-value')).toHaveText('Preset 1');

    await page.locator('.parameter-base-number input[type="number"]').fill('12');
    await page.locator('.parameter-base-number input[type="number"]').blur();
    await plan.fillActivityPresetName('Preset 2');
    await page.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();

    await expect(page.locator('.preset-value')).toHaveText('Preset 2');

    await page.getByRole('button', { name: 'Set Preset' }).click();
    await page.getByRole('menuitem', { name: 'Preset 1' }).click();

    await expect(page.locator('.preset-value')).toHaveText('Preset 1');
  });

  test(`Removing an activity preset from a directive should reflect that it is no longer present`, async () => {
    await page.getByRole('button', { name: 'Set Preset' }).click();
    await page.getByRole('menuitem', { name: 'None' }).click();

    await expect(page.locator('.preset-value')).toHaveText('None');
  });

  test('Deleting an activity preset should remove it from the list of presets', async () => {
    await page.getByRole('button', { name: 'Set Preset' }).click();
    await page.getByRole('menuitem', { name: 'Preset 1' }).click();

    await page.locator('.modal').getByRole('button', { name: 'Apply Preset' }).click();
    await expect(page.locator('.preset-value')).toHaveText('Preset 1');

    await page.getByRole('button', { name: 'Set Preset' }).click();
    await page.getByRole('button', { name: 'Delete preset' }).click();
    await page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.preset-value')).toHaveText('None');
  });
});
