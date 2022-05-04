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

test.describe('Scheduling', () => {
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

  test('Clicking on the Scheduling nav button should show the scheduling layout', async ({ planPage }) => {
    await planPage.showSchedulingLayout();
    await expect(planPage.schedulingComponent).toBeVisible();
    await expect(planPage.schedulingEditorComponent).toBeVisible();
    await expect(planPage.timelineComponent).toBeVisible();
    await expect(planPage.activityTableComponent).toBeVisible();
    await expect(planPage.activityFormComponent).toBeVisible();
    await expect(planPage.schedulingNavButton).toHaveClass(/selected/);
  });

  test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async ({ planPage }) => {
    await planPage.showSchedulingLayout();
    const goalName = 'Recurrence Goal';
    const goalDescription = 'Add a BakeBananaBread activity every 12 hours';
    const goalDefinition = `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.BakeBananaBread({ temperature: 325.0, tbSugar: 2, glutenFree: false }), interval: 12 * 60 * 60 * 1000 * 1000 })`;
    await planPage.createSchedulingGoal(goalName, goalDescription, goalDefinition);
    await planPage.runScheduling();
    await expect(planPage.schedulingGoalDifferenceBadge).toHaveText('+10');
    await planPage.runScheduling();
    await expect(planPage.schedulingGoalDifferenceBadge).toHaveText('+0');
  });
});
