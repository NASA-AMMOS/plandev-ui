import { expect, test as base } from '@playwright/test';
import { ModelsPage } from '../fixtures/ModelsPage.js';
import { PlanPage } from '../fixtures/PlanPage.js';
import { PlansPage } from '../fixtures/PlansPage.js';

const test = base.extend<{ modelsPage: ModelsPage; planPage: PlanPage; plansPage: PlansPage }>({
  modelsPage: async ({ page }, use) => {
    const modelsPage = new ModelsPage(page);
    await use(modelsPage);
  },
  planPage: async ({ page }, use) => {
    const planPage = new PlanPage(page);
    await use(planPage);
  },
  plansPage: async ({ page }, use) => {
    const plansPage = new PlansPage(page);
    await use(plansPage);
  },
});

test.describe('Plan Page', () => {
  test.beforeEach(async ({ modelsPage, planPage, plansPage }) => {
    await modelsPage.goto();
    await modelsPage.createModel();
    await plansPage.goto();
    await plansPage.createPlan(modelsPage.modelName);
    await planPage.goto(plansPage.planId);
  });

  test.afterEach(async ({ modelsPage, plansPage }) => {
    await plansPage.goto();
    await plansPage.deletePlan();
    await modelsPage.goto();
    await modelsPage.deleteModel();
  });

  test('Error page should not be visible, and the plan title should be visible in the top navigation bar', async ({
    planPage,
    plansPage,
  }) => {
    await expect(planPage.appError).not.toBeVisible();
    await expect(planPage.planTitle(plansPage.planName)).toBeVisible();
  });

  test('Initially the View layout should be displayed', async ({ planPage }) => {
    await expect(planPage.activityFormComponent).toBeVisible();
    await expect(planPage.activityTableComponent).toBeVisible();
    await expect(planPage.activityTypesComponent).toBeVisible();
    await expect(planPage.timelineComponent).toBeVisible();
    await expect(planPage.viewNavButton).toHaveClass(/selected/);
  });
});
