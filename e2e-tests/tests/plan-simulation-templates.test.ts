import { Constraints } from '../fixtures/Constraints.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { expect, test, type BrowserContext, type Page } from '../fixtures/PlaywrightTest.js';
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

  await page.pause();

  await plan.showPanel('Simulation', true);

  await page.getByRole('button', { name: 'CreateActivity-child' }).click();
  await page.getByRole('button', { name: 'Simulate' }).click();

  await plan.panelSimulation.locator('.parameter-base-number input[type="number"]').fill('199');
  await plan.panelSimulation.locator('.parameter-base-number input[type="number"]').blur();

  await plan.fillSimulationTemplateName('Template 1');

  await plan.panelSimulation.getByRole('button', { name: 'Enter a unique name for the new template' }).click();
  await plan.panelSimulation.locator('.dropdown-header').waitFor({ state: 'detached' });

  await plan.panelSimulation.locator('.parameter-base-number input[type="number"]').fill('120');
  await plan.panelSimulation.locator('.parameter-base-number input[type="number"]').blur();

  await plan.fillSimulationTemplateName('Template 2');

  await plan.panelSimulation.getByRole('button', { name: 'Enter a unique name for the new template' }).click();
  await plan.panelSimulation.locator('.dropdown-header').waitFor({ state: 'detached' });

  await page.waitForFunction(() => document.querySelector('.selected-display-value')?.innerHTML === 'Template 2');

  await plan.selectSimulationTemplateByName('None');

  expect(page.getByRole('textbox', { name: 'None' })).toBeVisible();
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Plan Simulation Templates', () => {
  test(`Setting a simulation template to a simulation should update the parameter values`, async () => {
    await plan.selectSimulationTemplateByName('Template 1');

    expect(plan.panelSimulation.getByRole('textbox', { name: 'Template 1' })).toBeVisible();
  });

  test(`Removing an simulation template from a simulation should reflect that it is no longer present`, async () => {
    await plan.selectSimulationTemplateByName('None');

    expect(page.getByRole('textbox', { name: 'None' })).toBeVisible();
  });

  test('Deleting an simulation template should remove it from the list of templates', async () => {
    await plan.selectSimulationTemplateByName('Template 1');

    await page.getByRole('button', { name: 'Set Template' }).click();

    await page.getByRole('button', { name: 'Delete Template' }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Delete Template' }).click();
    await page.getByRole('button', { name: 'Delete Template' }).waitFor({ state: 'detached' });

    await page.locator('.modal').waitFor({ state: 'attached' });
    await page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    await page.waitForFunction(() => document.querySelector('.selected-display-value')?.innerHTML === 'None');

    expect(page.getByRole('textbox', { name: 'None' })).toBeVisible();
  });
});
