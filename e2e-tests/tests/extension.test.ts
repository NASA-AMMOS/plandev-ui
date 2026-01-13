import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints';
import { Extension } from '../fixtures/Extension';
import { Models } from '../fixtures/Models';
import { Plan } from '../fixtures/Plan';
import { Plans } from '../fixtures/Plans';
import { SchedulingConditions } from '../fixtures/SchedulingConditions';
import { SchedulingGoals } from '../fixtures/SchedulingGoals';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let extension: Extension;
let extensionName: string;
let extensionId: number | undefined;
let constraints: Constraints;
let models: Models;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ baseURL, browser, request }) => {
  setup = await setupTest(browser, { model: false });

  extension = new Extension();
  extensionName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  extensionId = await extension.createExtension(setup.page, request, extensionName);

  models = new Models(setup.page);
  plans = new Plans(setup.page, models);
  constraints = new Constraints(setup.page);
  schedulingConditions = new SchedulingConditions(setup.page);
  schedulingGoals = new SchedulingGoals(setup.page);
  plan = new Plan(setup.page, plans, constraints, schedulingGoals, schedulingConditions);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
});

test.afterAll(async () => {
  await plan.deleteAllActivities();
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await teardownTest(setup);
});

test.describe.serial('Extensions', () => {
  test(`Hovering on 'Extensions' in the top navigation bar should show the extension menu`, async () => {
    await expect(plan.navButtonExtensionMenu).not.toBeVisible();
    await plan.navButtonExtension.hover();
    await expect(plan.navButtonExtensionMenu).toBeVisible();
    await plan.planTitle.hover();
    await expect(plan.navButtonExtensionMenu).not.toBeVisible();
  });

  test(`The extension that we created before the tests should be in the extension menu`, async () => {
    await plan.navButtonExtension.hover();
    await expect(plan.navButtonExtensionMenu).toBeVisible();
    await expect(plan.navButtonExtensionMenu.getByRole('menuitem', { name: extensionName })).toBeVisible();
  });

  test(`Clicking the extension should invoke the http call`, async () => {
    await plan.navButtonExtension.hover();
    const extensionRequest = setup.page.waitForRequest('http://localhost:3000/extensions');
    plan.navButtonExtensionMenu.getByRole('menuitem', { name: extensionName }).click();
    expect((await (await extensionRequest).response())?.ok).toBeTruthy();
  });

  test(`Delete an extension`, async ({ request }) => {
    if (extensionId !== undefined) {
      // Move mouse away from extension menu first
      await plan.planTitle.hover();
      await expect(plan.navButtonExtensionMenu).not.toBeVisible();

      await extension.deleteExtension(setup.page, request, extensionId);

      // Wait for subscription update to remove the extension button
      await expect(plan.navButtonExtension).not.toBeVisible({ timeout: 10000 });
      await expect(plan.navButtonExtensionMenu).not.toBeVisible();
    }
  });
});
