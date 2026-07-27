import test, { expect } from '@playwright/test';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan', () => {
  test('Error page should not be visible, and the plan title should be visible in the top navigation bar', async () => {
    await expect(setup.plan.appError).not.toBeVisible();
    await expect(setup.plan.planTitle).toBeVisible();
  });

  test('Initially the View layout should be displayed', async () => {
    await expect(setup.plan.panelActivityDirectivesTable).toBeVisible();
    await expect(setup.plan.panelActivityForm).toBeVisible();
    await expect(setup.plan.panelActivityTypes).toBeVisible();
    await expect(setup.plan.panelTimeline).toBeVisible();
  });

  test(`Clicking on 'Constraints' in the grid menu should show the constraints panel`, async () => {
    await expect(setup.plan.panelConstraints).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.CONSTRAINTS);
    await expect(setup.plan.panelConstraints).toBeVisible();
  });

  test(`Clicking on 'Expansion' in the grid menu should show the expansion panel`, async () => {
    await expect(setup.plan.panelExpansion).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.EXPANSION);
    await expect(setup.plan.panelExpansion).toBeVisible();
  });

  test(`Clicking on 'Plan Metadata' in the grid menu should show the plan metadata panel`, async () => {
    await expect(setup.plan.panelPlanMetadata).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.PLAN_METADATA);
    await expect(setup.plan.panelPlanMetadata).toBeVisible();
  });

  test(`Clicking on 'Scheduling Goals' in the grid menu should show the scheduling goals panel`, async () => {
    await expect(setup.plan.panelSchedulingGoals).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.SCHEDULING_GOALS);
    await expect(setup.plan.panelSchedulingGoals).toBeVisible();
  });

  test(`Clicking on 'Scheduling Conditions' in the grid menu should show the scheduling conditions panel`, async () => {
    await expect(setup.plan.panelSchedulingConditions).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.SCHEDULING_CONDITIONS);
    await expect(setup.plan.panelSchedulingConditions).toBeVisible();
  });

  test(`Clicking on 'Simulation' in the grid menu should show the simulation panel`, async () => {
    await expect(setup.plan.panelSimulation).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.SIMULATION);
    await expect(setup.plan.panelSimulation).toBeVisible();
  });

  test(`Clicking on 'Timeline Editor' in the grid menu should show the timeline editor panel`, async () => {
    await expect(setup.plan.panelTimelineEditor).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);
    await expect(setup.plan.panelTimelineEditor).toBeVisible();
  });

  test(`Hovering on 'Activities' in the top navigation bar should show the activity checking menu`, async () => {
    await expect(setup.plan.navButtonActivityCheckingMenu).not.toBeVisible();
    await setup.plan.navButtonActivityChecking.hover();
    await expect(setup.plan.navButtonActivityCheckingMenu).toBeVisible();
    await setup.plan.planTitle.hover();
    await expect(setup.plan.navButtonActivityCheckingMenu).not.toBeVisible();
  });

  test(`Hovering on 'Constraints' in the top navigation bar should show the constraints menu`, async () => {
    await expect(setup.plan.navButtonConstraintsMenu).not.toBeVisible();
    await setup.plan.navButtonConstraints.hover();
    await expect(setup.plan.navButtonConstraintsMenu).toBeVisible();
    await setup.plan.planTitle.hover();
    await expect(setup.plan.navButtonConstraintsMenu).not.toBeVisible();
  });

  test(`Hovering on 'Simulation' in the top navigation bar should show the simulation menu`, async () => {
    await expect(setup.plan.navButtonSimulationMenu).not.toBeVisible();
    await setup.plan.navButtonSimulation.hover();
    await expect(setup.plan.navButtonSimulationMenu).toBeVisible();
    await setup.plan.planTitle.hover();
    await expect(setup.plan.navButtonSimulationMenu).not.toBeVisible();
  });

  test(`Hovering on 'Expansion' in the top navigation bar should show the expansion menu`, async () => {
    await expect(setup.plan.navButtonExpansionMenu).not.toBeVisible();
    await setup.plan.navButtonExpansion.hover();
    await expect(setup.plan.navButtonExpansionMenu).toBeVisible();
    await setup.plan.planTitle.hover();
    await expect(setup.plan.navButtonExpansionMenu).not.toBeVisible();
  });

  test(`Hovering on 'Scheduling' in the top navigation bar should show the scheduling menu`, async () => {
    await expect(setup.plan.navButtonSchedulingMenu).not.toBeVisible();
    await setup.plan.navButtonScheduling.hover();
    await expect(setup.plan.navButtonSchedulingMenu).toBeVisible();
    await setup.plan.planTitle.hover();
    await expect(setup.plan.navButtonSchedulingMenu).not.toBeVisible();
  });

  test(`Extension menu visibility depends on whether extensions exist`, async () => {
    // Check if extensions button is visible (indicates extensions exist in the system)
    const extensionsVisible = await setup.plan.navButtonExtension.isVisible();

    if (extensionsVisible) {
      // If extensions exist, verify the menu behavior when hovering
      await setup.plan.navButtonExtension.hover();
      await expect(setup.plan.navButtonExtensionMenu).toBeVisible();
      await setup.plan.planTitle.hover();
      await expect(setup.plan.navButtonExtensionMenu).not.toBeVisible();
    } else {
      // If no extensions, neither button nor menu should be visible
      await expect(setup.plan.navButtonExtension).not.toBeVisible();
      await expect(setup.plan.navButtonExtensionMenu).not.toBeVisible();
    }
  });

  test(`Changing to a new plan should clear the selected activity`, async ({ baseURL }) => {
    // Create an activity which will be auto selected
    await setup.plan.addActivityByDragAndDrop('GrowBanana');

    // Switch to a new branch and ensure no activity is selected
    await setup.plan.createBranch(baseURL);
    await expect(setup.plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Wait for new activities to load by ensuring the activity table is visible
    await expect(setup.plan.panelActivityDirectivesTable).toBeVisible();

    // Add a new activity
    await setup.plan.addActivityByDragAndDrop('GrowBanana');

    const branchPlanUrlRegex = new RegExp(`${baseURL}/plans/(?<planId>\\d+)`);
    const matches = setup.page.url().match(branchPlanUrlRegex);
    expect(matches).not.toBeNull();

    let currentPlanId = 'foo';
    if (matches) {
      const { groups: { planId } = {} } = matches;
      currentPlanId = planId;
    }

    // Switch to parent plan and ensure no activity is selected
    await setup.page.getByRole('link', { name: setup.plans.planName }).click();

    // wait for page to navigate to parent plan
    const parentPlanUrlRegex = new RegExp(`${baseURL}/plans/((?!${currentPlanId}).)*`);
    await setup.page.waitForURL(parentPlanUrlRegex);

    await expect(setup.plan.panelActivityForm.getByText('No Activity Selected')).toBeVisible();

    // Cleanup
    await setup.plan.deleteAllActivities();
  });
});
