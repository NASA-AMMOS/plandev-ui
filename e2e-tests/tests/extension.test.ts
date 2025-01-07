import test, { BrowserContext, expect, Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints';
import { Extension } from '../fixtures/Extension';
import { Models } from '../fixtures/Models';
import { Plan } from '../fixtures/Plan';
import { Plans } from '../fixtures/Plans';
import { SchedulingConditions } from '../fixtures/SchedulingConditions';
import { SchedulingGoals } from '../fixtures/SchedulingGoals';

let extension: Extension;
let extensionName: string;
let extensionId: number | undefined;
let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ baseURL, browser, request }) => {
  context = await browser.newContext();
  page = await context.newPage();

  extension = new Extension();
  extensionName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  extensionId = await extension.createExtension(page, request, extensionName);

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
});

test.afterAll(async () => {
  await plan.deleteAllActivities();
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Extensions', () => {
  test(`Hovering on 'Extensions' in the top navigation bar should show the extension menu`, async () => {
    await expect(plan.navButtonExtensionMenu).not.toBeVisible();
    plan.navButtonExtension.hover();
    await expect(plan.navButtonExtensionMenu).toBeVisible();
    plan.planTitle.hover();
    await expect(plan.navButtonExtensionMenu).not.toBeVisible();
  });

  test(`The extension that we created before the tests should be in the extension menu`, async () => {
    plan.navButtonExtension.hover();
    await expect(plan.navButtonExtensionMenu).toBeVisible();
    await expect(plan.navButtonExtensionMenu.getByRole('menuitem', { name: extensionName })).toBeVisible();
  });

  test(`Clicking the extension should invoke the http call`, async () => {
    plan.navButtonExtension.hover();
    const extensionRequest = page.waitForRequest('http://localhost:3000/extensions');
    plan.navButtonExtensionMenu.getByRole('menuitem', { name: extensionName }).click();
    expect((await (await extensionRequest).response())?.ok).toBeTruthy();
  });

  test(`Delete an extension`, async ({ page, request }) => {
    if (extensionId !== undefined) {
      await extension.deleteExtension(page, request, extensionId);
      await expect(plan.navButtonExtensionMenu).not.toBeVisible();
      await expect(plan.navButtonExtension).not.toBeVisible();
    }
  });
});
