import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Status } from '../../src/enums/status';
import { Constraints } from './Constraints.js';
import { Plans } from './Plans.js';
import { SchedulingConditions } from './SchedulingConditions.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Plan {
  activitiesTable: Locator;
  activitiesTableFirstRow: Locator;
  activityCheckingStatusSelector: (status: string) => string;
  analyzeButton: Locator;
  appError: Locator;
  consoleContainer: Locator;
  constraintListItemSelector: string;
  constraintManageButton: Locator;
  constraintNewButton: Locator;
  gridMenu: Locator;
  gridMenuButton: Locator;
  gridMenuItem: (name: string) => Locator;
  navButtonActivityChecking: Locator;
  navButtonActivityCheckingMenu: Locator;
  navButtonConstraints: Locator;
  navButtonConstraintsMenu: Locator;
  navButtonExpansion: Locator;
  navButtonExpansionMenu: Locator;
  navButtonScheduling: Locator;
  navButtonSchedulingMenu: Locator;
  navButtonSimulation: Locator;
  navButtonSimulationMenu: Locator;
  navButtonSimulationMenuStatus: Locator;
  panelActivityDirectivesTable: Locator;
  panelActivityForm: Locator;
  panelActivityTypes: Locator;
  panelConstraints: Locator;
  panelExpansion: Locator;
  panelPlanMetadata: Locator;
  panelSchedulingConditions: Locator;
  panelSchedulingGoals: Locator;
  panelSimulatedActivitiesTable: Locator;
  panelSimulation: Locator;
  panelTimeline: Locator;
  panelTimelineEditor: Locator;
  planCollaboratorInput: Locator;
  planCollaboratorInputContainer: Locator;
  planCollaboratorLoadingInput: Locator;
  planTitle: Locator;
  reSimulateButton: Locator;
  roleSelector: Locator;
  scheduleButton: Locator;
  schedulingConditionEnabledCheckbox: Locator;
  schedulingConditionListItemSelector: string;
  schedulingConditionManageButton: Locator;
  schedulingConditionNewButton: Locator;
  schedulingGoal: Locator;
  schedulingGoalDifferenceBadge: Locator;
  schedulingGoalEnabledCheckboxSelector: (goalName: string) => Locator;
  schedulingGoalExpand: Locator;
  schedulingGoalListItemSelector: (goalName: string) => string;
  schedulingGoalManageButton: Locator;
  schedulingGoalNewButton: Locator;
  schedulingSatisfiedActivity: Locator;
  schedulingStatusSelector: (status: string) => string;
  simulateButton: Locator;
  simulationHistoryList: Locator;
  simulationStatusSelector: (status: string) => string;

  constructor(
    public page: Page,
    public plans: Plans,
    public constraints: Constraints,
    public schedulingGoals: SchedulingGoals,
    public schedulingConditions: SchedulingConditions,
    public planName = plans.planName,
  ) {
    this.constraintListItemSelector = `.constraint-list-item:has-text("${constraints.constraintName}")`;
    this.schedulingConditionListItemSelector = `.scheduling-condition:has-text("${schedulingConditions.conditionName}")`;
    this.schedulingGoalListItemSelector = (goalName: string) => `.scheduling-goal:has-text("${goalName}")`;
    this.schedulingStatusSelector = (status: string) =>
      `div[data-component-name="SchedulingGoalsPanel"] .header-actions > .status-badge.${status.toLowerCase()}`;
    this.simulationStatusSelector = (status: string) =>
      `.nav-button:has-text("Simulation") .status-badge[aria-label=${status}]`;
    this.activityCheckingStatusSelector = (status: string) =>
      `.nav-button:has-text("Activities") .status-badge[aria-label=${status}]`;
    this.updatePage(page);
  }

  async addActivity(name: string = 'GrowBanana') {
    await this.page.getByRole('button', { name: `CreateActivity-${name}` }).click();
  }

  async addPlanCollaborator(name: string, isUsername = true) {
    await this.showPanel('Plan Metadata');
    await this.waitForPlanCollaboratorLoad();
    await this.planCollaboratorInput.fill(name);
    await this.planCollaboratorInput.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    // If the name is a username then check for the existence of the username in selected items
    // Otherwise it is a plan option and will add an unspecified amount of users
    if (isUsername) {
      await expect(
        this.planCollaboratorInputContainer.locator('.tags-input-selected-items').getByRole('option', { name }),
      ).not.toBeUndefined();
    }
    await this.waitForToast('Plan Collaborators Updated');
  }

  async createBranch(name: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] })) {
    await this.page.getByText(this.planName).first().click();
    await this.page.getByText('Create branch').click();
    await this.page.getByPlaceholder('Name of branch').click();
    await this.page.getByPlaceholder('Name of branch').fill(name);
    await this.page.getByRole('button', { name: 'Create Branch' }).click();
    await this.page.waitForTimeout(500);
  }

  async createConstraint(baseURL: string | undefined) {
    await this.constraintManageButton.click();
    const [newConstraintPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      await this.constraintNewButton.click(),
    ]);
    this.constraints.updatePage(newConstraintPage);
    await newConstraintPage.waitForURL(`${baseURL}/constraints/new?modelId=*`);
    await this.constraints.createConstraint(baseURL);
    await newConstraintPage.close();
    this.constraints.updatePage(this.page);
    await this.page.getByRole('row', { name: this.constraints.constraintName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForSelector(this.constraintListItemSelector, { state: 'visible', strict: true });
  }

  async createSchedulingCondition(baseURL: string | undefined) {
    await this.schedulingConditionManageButton.click();
    const [newSchedulingConditionPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingConditionNewButton.click(),
    ]);
    this.schedulingConditions.updatePage(newSchedulingConditionPage);
    await newSchedulingConditionPage.waitForURL(`${baseURL}/scheduling/conditions/new?modelId=*`);
    await this.schedulingConditions.createSchedulingCondition(baseURL);
    await newSchedulingConditionPage.close();
    this.schedulingConditions.updatePage(this.page);
    await this.page.getByRole('row', { name: this.schedulingConditions.conditionName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForSelector(this.schedulingConditionListItemSelector, { state: 'visible', strict: true });
  }

  async createSchedulingGoal(baseURL: string | undefined, goalName: string) {
    await this.schedulingGoalManageButton.click();
    const [newSchedulingGoalPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingGoalNewButton.click(),
    ]);
    this.schedulingGoals.updatePage(newSchedulingGoalPage);
    await newSchedulingGoalPage.waitForURL(`${baseURL}/scheduling/goals/new?modelId=*`);
    await this.schedulingGoals.createSchedulingGoal(baseURL, goalName);
    await newSchedulingGoalPage.close();
    this.schedulingGoals.updatePage(this.page);
    await this.page.getByRole('row', { name: goalName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForSelector(this.schedulingGoalListItemSelector(goalName), { state: 'visible', strict: true });
  }

  async deleteAllActivities() {
    const gridCells = await this.panelActivityDirectivesTable.getByRole('gridcell');
    if ((await gridCells.count()) > 0) {
      await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
      await this.page.locator('.context-menu > .context-menu-item:has-text("Select All Activity Directives")').click();
      await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
      await this.page.getByText(/Delete \d+ Activit(y|ies) Directives?/).click();

      const confirmDeletionButton = this.page.getByRole('button', { name: 'Confirm' });
      await confirmDeletionButton.waitFor({ state: 'attached', timeout: 1000 });
      await confirmDeletionButton.click();
    }
  }

  async fillActivityPresetName(presetName: string) {
    await this.panelActivityForm.getByRole('button', { name: 'Set Preset' }).click();
    await this.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'attached' });
    await this.panelActivityForm.getByPlaceholder('Enter preset name').click();
    await this.panelActivityForm.getByPlaceholder('Enter preset name').fill(presetName);
    await this.panelActivityForm.getByPlaceholder('Enter preset name').blur();
  }

  async fillSimulationTemplateName(templateName: string) {
    await this.panelSimulation.getByRole('button', { name: 'Set Template' }).click();
    await this.panelSimulation.locator('.dropdown-header').waitFor({ state: 'attached' });
    await this.panelSimulation.getByPlaceholder('Enter template name').click();
    await this.panelSimulation.getByPlaceholder('Enter template name').fill(templateName);
    await this.panelSimulation.getByPlaceholder('Enter template name').blur();
  }

  async getSimulationHistoryListLength() {
    const elements = await this.simulationHistoryList.locator(`button:has-text("Simulation ID")`).all();
    return elements.length;
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   * If your tests fail then the timeout might be too short.
   * Re-run the tests and increase the timeout if you get consistent failures.
   */
  async goto(planId = this.plans.planId) {
    await this.page.waitForTimeout(1200);
    await this.page.goto(`/plans/${planId}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async reRunSimulation(expectedFinalState = Status.Complete) {
    await this.reSimulateButton.click();
    await this.page.waitForTimeout(1000);
    await this.waitForSimulationStatus(expectedFinalState);
  }

  async removeConstraint() {
    await this.constraintManageButton.click();
    await this.page.getByRole('row', { name: this.constraints.constraintName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.locator(this.constraintListItemSelector).waitFor({ state: 'detached' });
  }

  async removePlanCollaborator(name: string) {
    await this.showPanel('Plan Metadata');
    await this.waitForPlanCollaboratorLoad();
    await this.planCollaboratorInputContainer
      .locator('.tags-input-selected-items')
      .getByRole('option', { name })
      .click();
    await this.waitForToast('Plan Collaborator Removed Successfully');
  }

  async removeSchedulingGoal(goalName: string) {
    await this.schedulingGoalManageButton.click();
    await this.page.getByRole('row', { name: goalName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.locator(this.schedulingGoalListItemSelector(goalName)).waitFor({ state: 'detached' });
  }

  async runAnalysis() {
    await this.analyzeButton.click();
    await this.waitForSchedulingStatus(Status.Incomplete);
    await this.waitForSchedulingStatus(Status.Complete);
  }

  async runScheduling(expectedFinalState = Status.Complete) {
    await this.scheduleButton.click();
    await this.waitForSchedulingStatus(Status.Incomplete);
    await this.waitForSchedulingStatus(expectedFinalState);
  }

  async runSimulation(expectedFinalState = Status.Complete) {
    await this.simulateButton.click();
    await this.page.waitForTimeout(1000);
    await this.waitForSimulationStatus(expectedFinalState);
  }

  async selectActivityAnchorByIndex(index: number) {
    await this.panelActivityForm.getByRole('button', { name: 'Set Anchor' }).click();

    await this.panelActivityForm.getByRole('menuitem').nth(index).waitFor({ state: 'attached' });
    const anchorMenuName = await this.panelActivityForm.getByRole('menuitem').nth(index)?.innerText();
    await this.panelActivityForm.getByRole('menuitem').nth(index).click();
    await this.panelActivityForm.getByRole('menuitem').nth(index).waitFor({ state: 'detached' });

    await this.page.waitForFunction(
      anchorMenuName => document.querySelector('.anchor-form .selected-display-value')?.innerHTML === anchorMenuName,
      anchorMenuName,
    );
    expect(await this.panelActivityForm.getByRole('textbox', { name: anchorMenuName })).toBeVisible();
  }

  async selectActivityPresetByName(presetName: string) {
    await this.panelActivityForm.getByRole('button', { name: 'Set Preset' }).click();

    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).waitFor({ state: 'attached' });
    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).click();
    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).waitFor({ state: 'detached' });

    try {
      const applyPresetButton = this.page.getByRole('button', { name: 'Apply Preset' });

      // allow time for modal to apply the preset to show up if applicable
      await applyPresetButton.waitFor({ state: 'attached', timeout: 1000 });
      // await new Promise(resolve => setTimeout(resolve, 1000));
      if (await applyPresetButton.isVisible()) {
        await applyPresetButton.click();
      }
    } catch (e) {
      if (e.name !== 'TimeoutError') {
        console.error(e);
      }
    }

    await this.page.waitForFunction(
      presetName =>
        document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === presetName,
      presetName,
    );
    expect(await this.panelActivityForm.getByRole('textbox', { name: presetName })).toBeVisible();
  }

  async selectSimulationTemplateByName(templateName: string) {
    await this.panelSimulation.getByRole('button', { name: 'Set Template' }).click();

    await this.panelSimulation.getByRole('menuitem', { name: templateName }).waitFor({ state: 'attached' });
    await this.panelSimulation.getByRole('menuitem', { name: templateName }).click();
    await this.panelSimulation.getByRole('menuitem', { name: templateName }).waitFor({ state: 'detached' });

    try {
      const applyTemplateButton = this.page.getByRole('button', { name: 'Apply Simulation Template' });

      // allow time for modal to apply the preset to show up if applicable
      await applyTemplateButton.waitFor({ state: 'attached', timeout: 1000 });
      // await new Promise(resolve => setTimeout(resolve, 1000));
      if (await applyTemplateButton.isVisible()) {
        await applyTemplateButton.click();
      }
    } catch (e) {
      if (e.name !== 'TimeoutError') {
        console.error(e);
      }
    }

    await this.page.waitForFunction(
      templateName =>
        document.querySelector('.simulation-template-input-container .selected-display-value')?.innerHTML ===
        templateName,
      templateName,
    );
    expect(await this.panelSimulation.getByRole('textbox', { name: templateName })).toBeVisible();
  }

  async showConstraintsLayout() {
    await this.showPanel('Constraints');
    await this.panelConstraints.waitFor({ state: 'attached' });
    await this.panelConstraints.waitFor({ state: 'visible' });
    await this.panelActivityDirectivesTable.waitFor({ state: 'attached' });
    await this.panelActivityDirectivesTable.waitFor({ state: 'visible' });
    await this.panelTimeline.waitFor({ state: 'attached' });
    await this.panelTimeline.waitFor({ state: 'visible' });
    await expect(this.panelConstraints).toBeVisible();
    await expect(this.panelActivityDirectivesTable).toBeVisible();
    await expect(this.panelTimeline).toBeVisible();
  }

  async showPanel(name: string, pickLastMenu: boolean = false) {
    await expect(this.gridMenu).not.toBeVisible();
    if (pickLastMenu) {
      await this.gridMenuButton.last().click();
    } else {
      await this.gridMenuButton.first().click();
    }
    await this.gridMenu.waitFor({ state: 'attached' });
    await this.gridMenu.waitFor({ state: 'visible' });
    await this.gridMenuItem(name).click();
  }

  async showSchedulingLayout() {
    await this.showPanel('Scheduling Goals');
    await this.showPanel('Scheduling Conditions', true);
    await this.panelSchedulingGoals.waitFor({ state: 'attached' });
    await this.panelSchedulingGoals.waitFor({ state: 'visible' });
    await this.panelSchedulingConditions.waitFor({ state: 'attached' });
    await this.panelSchedulingConditions.waitFor({ state: 'visible' });
    await this.panelActivityDirectivesTable.waitFor({ state: 'attached' });
    await this.panelActivityDirectivesTable.waitFor({ state: 'visible' });
    await this.panelTimeline.waitFor({ state: 'attached' });
    await this.panelTimeline.waitFor({ state: 'visible' });
    await expect(this.panelSchedulingGoals).toBeVisible();
    await expect(this.panelActivityDirectivesTable).toBeVisible();
    await expect(this.panelTimeline).toBeVisible();
  }

  updatePage(page: Page): void {
    this.appError = page.locator('.app-error');
    this.activitiesTable = page.locator(`div.ag-theme-stellar.table`);
    this.activitiesTableFirstRow = page
      .locator(`div.ag-theme-stellar.table .ag-center-cols-container > .ag-row`)
      .nth(0);
    this.constraintManageButton = page.locator(`button[name="manage-constraints"]`);
    this.constraintNewButton = page.locator(`button[name="new-constraint"]`);
    this.consoleContainer = page.locator(`.console-container`);
    this.gridMenu = page.locator('.header > .grid-menu > .menu > .menu-slot');
    this.gridMenuButton = page.locator('.header > .grid-menu');
    this.gridMenuItem = (name: string) =>
      page.locator(`.header > .grid-menu > .menu > .menu-slot > .menu-item:has-text("${name}")`);
    this.navButtonActivityChecking = page.locator(`.nav-button:has-text("Activities")`);
    this.navButtonActivityCheckingMenu = page.locator(`.nav-button:has-text("Activities") .menu`);
    this.navButtonExpansion = page.locator(`.nav-button:has-text("Expansion")`);
    this.navButtonExpansionMenu = page.locator(`.nav-button:has-text("Expansion") .menu`);
    this.navButtonConstraints = page.locator(`.nav-button:has-text("Constraints")`);
    this.navButtonConstraintsMenu = page.locator(`.nav-button:has-text("Constraints") .menu`);
    this.navButtonScheduling = page.locator(`.nav-button:has-text("Scheduling")`);
    this.navButtonSchedulingMenu = page.locator(`.nav-button:has-text("Scheduling") .menu`);
    this.navButtonSimulation = page.locator(`.nav-button:has-text("Simulation")`);
    this.navButtonSimulationMenu = page.locator(`.nav-button:has-text("Simulation") .menu`);
    this.navButtonSimulationMenuStatus = page.locator(`.nav-button:has-text("Simulation") .status-badge`);
    this.page = page;
    this.panelActivityDirectivesTable = page.locator('[data-component-name="ActivityDirectivesTablePanel"]');
    this.panelActivityForm = page.locator('[data-component-name="ActivityFormPanel"]');
    this.panelActivityTypes = page.locator('[data-component-name="ActivityTypesPanel"]');
    this.panelConstraints = page.locator('[data-component-name="ConstraintsPanel"]');
    this.panelExpansion = page.locator('[data-component-name="ExpansionPanel"]');
    this.panelPlanMetadata = page.locator('[data-component-name="PlanMetadataPanel"]');
    this.panelSchedulingConditions = page.locator('[data-component-name="SchedulingConditionsPanel"]');
    this.panelSchedulingGoals = page.locator('[data-component-name="SchedulingGoalsPanel"]');
    this.panelSimulatedActivitiesTable = page.locator('[data-component-name="ActivitySpansTablePanel"]');
    this.panelSimulation = page.locator('[data-component-name="SimulationPanel"]');
    this.panelTimeline = page.locator('[data-component-name="TimelinePanel"]');
    this.panelTimelineEditor = page.locator('[data-component-name="TimelineEditorPanel"]');
    this.planTitle = page.locator(`.plan-title:has-text("${this.planName}")`);
    this.planCollaboratorInputContainer = this.panelPlanMetadata.locator('.input:has-text("Collaborators")');
    this.planCollaboratorInput = this.planCollaboratorInputContainer.getByPlaceholder('Search collaborators or plans');
    this.planCollaboratorLoadingInput = this.planCollaboratorInputContainer.getByPlaceholder('Loading...');
    this.roleSelector = page.locator(`.nav select`);
    this.reSimulateButton = page.locator('.header-actions button:has-text("Re-Run")');
    this.scheduleButton = page.locator('.header-actions button[aria-label="Schedule"]');
    this.simulateButton = page.locator('.header-actions button:has-text("Simulate")');
    this.simulationHistoryList = page.locator('.simulation-history');
    this.analyzeButton = page.locator('.header-actions button[aria-label="Analyze"]');
    this.schedulingGoalManageButton = page.locator(`button[name="manage-goals"]`);
    this.schedulingConditionManageButton = page.locator(`button[name="manage-conditions"]`);
    this.schedulingGoal = page.locator('.scheduling-goal').first();
    this.schedulingGoalDifferenceBadge = this.schedulingGoal.locator('.difference-badge');
    this.schedulingGoalEnabledCheckboxSelector = (goalName: string) =>
      page.locator(`.scheduling-goal:has-text("${goalName}") >> input[type="checkbox"]`).first();
    this.schedulingConditionEnabledCheckbox = page
      .locator(`.scheduling-condition:has-text("${this.schedulingConditions.conditionName}") >> input[type="checkbox"]`)
      .first();
    this.schedulingGoalExpand = page.locator('.scheduling-goal > .collapse > button').first();
    this.schedulingGoalNewButton = page.locator(`button[name="new-scheduling-goal"]`);
    this.schedulingConditionNewButton = page.locator(`button[name="new-scheduling-condition"]`);
    this.schedulingSatisfiedActivity = page.locator('.scheduling-goal-analysis-activities-list > .satisfied-activity');
  }

  async waitForActivityCheckingStatus(status: Status) {
    await this.page.waitForSelector(this.activityCheckingStatusSelector(status), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.activityCheckingStatusSelector(status), { state: 'visible', strict: true });
  }

  async waitForPlanCollaboratorLoad() {
    await expect(this.planCollaboratorLoadingInput).not.toBeVisible({ timeout: 10000 });
  }

  async waitForSchedulingStatus(status: Status) {
    await this.page.waitForSelector(this.schedulingStatusSelector(status), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector(status), { state: 'visible', strict: true });
  }

  async waitForSimulationStatus(status: Status) {
    await this.page.waitForSelector(this.simulationStatusSelector(status), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.simulationStatusSelector(status), { state: 'visible', strict: true });
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 3000 });
  }
}
