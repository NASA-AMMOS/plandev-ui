import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
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

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();

  await plan.showPanel(PanelNames.SIMULATION, true);
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Simulation', async () => {
  test(`Plans with no simulation runs should display a relevant message and simulation should be enabled`, async () => {
    await expect(plan.navButtonSimulationMenuStatus).not.toBeVisible();
    await plan.navButtonSimulation.hover();
    await expect(plan.navButtonSimulationMenu).toBeVisible();
    await expect(plan.navButtonSimulationMenu).toContainText('Simulation not run');
    await expect(plan.navButtonSimulationMenu.getByRole('button', { name: 'Simulate' })).toBeEnabled();
    await expect(plan.simulateButton).toBeEnabled();
    await expect(plan.reSimulateButton).not.toBeVisible();

    // Expect no simulation runs to be visible
    const simHistoryLength = await plan.getSimulationHistoryListLength();
    await expect(simHistoryLength).toBe(0);
  });

  test(`Plans with no activities should simulate`, async () => {
    const simHistoryLength = await plan.getSimulationHistoryListLength();
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim dataset to appear

    // Expect a new dataset to be added to simulation history
    const newSimHistoryLength = await plan.getSimulationHistoryListLength();
    await expect(newSimHistoryLength).toEqual(simHistoryLength + 1);

    // Expect re-simulate button to be enabled and simulation button disabled
    await expect(plan.reSimulateButton).toBeEnabled();
    await expect(plan.simulateButton).toBeDisabled();
  });

  test(`Re-simulating should re-run simulation`, async () => {
    const simHistoryLength = await plan.getSimulationHistoryListLength();
    await plan.reRunSimulation();
    await page.waitForTimeout(1000); // wait for sim dataset to appear
    const newSimHistoryLength = await plan.getSimulationHistoryListLength();
    await expect(newSimHistoryLength).toEqual(simHistoryLength + 1);
  });

  test(`Plans with activities should simulate and result in simulated activities`, async () => {
    await plan.showPanel(PanelNames.SIMULATED_ACTIVITIES_TABLE, true);
    await expect(plan.panelSimulatedActivitiesTable.getByRole('gridcell', { name: 'GrowBanana' })).not.toBeVisible();
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.addActivity('GrowBanana');
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.SIMULATED_ACTIVITIES_TABLE, true);
    await expect(plan.panelSimulatedActivitiesTable.getByRole('gridcell', { name: 'GrowBanana' })).toBeVisible();
    await plan.showPanel(PanelNames.SIMULATION, true);
  });

  test(`Plans with an invalid activity should fail simulation`, async () => {
    await plan.addActivity('BakeBananaBread');
    await plan.runSimulation(Status.Failed);
  });

  test(`Modified plans should indicate that simulation is out of date`, async () => {
    await plan.addActivity();
    await plan.waitForSimulationStatus(Status.Modified);
  });
});
