import { expect, test } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Status } from '../../src/enums/status.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
const goalName1: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const goalName2: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Scheduling', () => {
  test('Navigate to the plan page and show the scheduling layout', async () => {
    await setup.plan.goto();
    await setup.plan.showSchedulingLayout();
  });

  test('Create scheduling goal from the plan page', async ({ baseURL }) => {
    await setup.plan.createSchedulingGoal(baseURL, goalName1);
  });

  test('Create scheduling condition from the plan page', async ({ baseURL }) => {
    await setup.plan.createSchedulingCondition(baseURL);
  });

  test('Disabling a scheduling goal should not include that goal in a scheduling run ', async ({ baseURL }) => {
    // Create a second scheduling goal so that when the first goal is disabled, analysis and scheduling buttons are still enabled
    await setup.plan.createSchedulingGoal(baseURL, goalName2);
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).not.toBeVisible();
    await expect(setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1).uncheck();
    await expect(setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1)).not.toBeChecked();
    await setup.plan.runScheduling(Status.Failed);
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).not.toBeVisible();
    await setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1).check();
    await expect(setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
  });

  test('The condition should prevent showing +10 in the goals badge', async () => {
    await setup.plan.runScheduling(Status.Failed);
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+0');
  });

  test('Disabling a scheduling condition should not include that condition in a scheduling run ', async () => {
    await expect(
      setup.plan.schedulingConditionEnabledCheckboxSelector(setup.plan.schedulingConditions.conditionName),
    ).toBeChecked();
    await setup.plan
      .schedulingConditionEnabledCheckboxSelector(setup.plan.schedulingConditions.conditionName)
      .uncheck();
    await expect(
      setup.plan.schedulingConditionEnabledCheckboxSelector(setup.plan.schedulingConditions.conditionName),
    ).not.toBeChecked();
    await setup.plan.runScheduling();
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+10');
    await setup.plan.deleteAllActivities();
    await setup.plan.showSchedulingLayout();
  });

  test('Running the same scheduling goal twice in a row should show +0 in that goals badge', async () => {
    await expect(setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await setup.plan.runScheduling();
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+10');
    await setup.plan.runScheduling();
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+0');
  });

  test('The list of satisfied activities should not be empty', async () => {
    await setup.plan.schedulingGoalExpand(goalName1).click();
    const satisfiedActivitiesCount = await setup.plan.schedulingSatisfiedActivity.count();
    expect(satisfiedActivitiesCount).toBeGreaterThan(0);
  });

  test('Running analyze-only should show +0 in that goals badge', async () => {
    await expect(setup.plan.schedulingGoalEnabledCheckboxSelector(goalName1)).toBeChecked();
    await setup.plan.runAnalysis();
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+0');
    await setup.plan.runAnalysis();
    await expect(setup.plan.schedulingGoalDifferenceBadge(goalName1)).toHaveText('+0');
  });

  test('Modifying the plan should result in scheduling status marked as out of date', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_ITEMS);
    await setup.plan.addActivityByDragAndDrop('GrowBanana');
    await setup.plan.showPanel(PanelNames.SCHEDULING_GOALS);
    await setup.plan.waitForSchedulingStatus(Status.Modified);
  });

  test('Delete scheduling goal', async () => {
    await setup.plan.removeSchedulingGoal(goalName1);
    await setup.schedulingGoals.deleteSchedulingGoal(goalName1);
  });
});
