import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from './Constraints.js';
import { Plans } from './Plans.js';
import { SchedulingConditions } from './SchedulingConditions.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Plan {
  activitiesTable: Locator;
  activitiesTableFirstRow: Locator;
  analyzeButton: Locator;
  appError: Locator;
  constraintListItemSelector: string;
  constraintNewButton: Locator;
  gridMenu: Locator;
  gridMenuButton: Locator;
  gridMenuItem: (name: string) => Locator;
  invalidPlanFilePath: string = 'e2e-tests/data/invalid-view.json';
  navButtonConstraints: Locator;
  navButtonConstraintsMenu: Locator;
  navButtonExpansion: Locator;
  navButtonExpansionMenu: Locator;
  navButtonScheduling: Locator;
  navButtonSchedulingMenu: Locator;
  navButtonSimulation: Locator;
  navButtonSimulationMenu: Locator;
  navButtonView: Locator;
  navButtonViewMenu: Locator;
  navButtonViewSaveAsMenuButton: Locator;
  navButtonViewSavedViewsMenuButton: Locator;
  navButtonViewUploadViewMenuButton: Locator;
  panelActivityDirectivesTable: Locator;
  panelActivityForm: Locator;
  panelActivityTypes: Locator;
  panelConstraints: Locator;
  panelExpansion: Locator;
  panelSchedulingConditions: Locator;
  panelSchedulingGoals: Locator;
  panelSimulation: Locator;
  panelTimeline: Locator;
  panelTimelineEditor: Locator;
  planTitle: Locator;
  scheduleButton: Locator;
  schedulingConditionEnabledCheckbox: Locator;
  schedulingConditionListItemSelector: string;
  schedulingConditionNewButton: Locator;
  schedulingGoal: Locator;
  schedulingGoalDifferenceBadge: Locator;
  schedulingGoalEnabledCheckboxSelector: (goalName: string) => Locator;
  schedulingGoalExpand: Locator;
  schedulingGoalListItemSelector: (goalName: string) => string;
  schedulingGoalNewButton: Locator;
  schedulingSatisfiedActivity: Locator;
  schedulingStatusSelector: (status: string) => string;
  validPlanFilePath: string = 'e2e-tests/data/valid-view.json';

  constructor(
    public page: Page,
    public plans: Plans,
    public constraints: Constraints,
    public schedulingGoals: SchedulingGoals,
    public schedulingConditions: SchedulingConditions,
  ) {
    this.constraintListItemSelector = `.constraint-list-item:has-text("${constraints.constraintName}")`;
    this.schedulingConditionListItemSelector = `.scheduling-condition:has-text("${schedulingConditions.conditionName}")`;
    this.schedulingGoalListItemSelector = (goalName: string) => `.scheduling-goal:has-text("${goalName}")`;
    this.schedulingStatusSelector = (status: string) => `.header-actions > .status-badge.${status.toLowerCase()}`;
    this.updatePage(page);
  }

  async createBranch(name: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] })) {
    await this.page.getByText(this.plans.planName).first().click();
    await this.page.getByText('Create branch').click();
    await this.page.getByPlaceholder('Name of branch').click();
    await this.page.getByPlaceholder('Name of branch').fill(name);
    await this.page.getByRole('button', { name: 'Create Branch' }).click();
    await this.page.waitForTimeout(500);
  }

  async createConstraint(baseURL: string | undefined) {
    const [newConstraintPage] = await Promise.all([this.page.waitForEvent('popup'), this.constraintNewButton.click()]);
    this.constraints.updatePage(newConstraintPage);
    await newConstraintPage.waitForURL(`${baseURL}/constraints/new`);
    await this.constraints.createConstraint(baseURL);
    await newConstraintPage.close();
    this.constraints.updatePage(this.page);
    await this.page.waitForSelector(this.constraintListItemSelector, { state: 'visible', strict: true });
  }

  async createSchedulingCondition(baseURL: string | undefined) {
    const [newSchedulingConditionPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingConditionNewButton.click(),
    ]);
    this.schedulingConditions.updatePage(newSchedulingConditionPage);
    await newSchedulingConditionPage.waitForURL(`${baseURL}/scheduling/conditions/new?modelId=*&&specId=*`);
    await this.schedulingConditions.createSchedulingCondition(baseURL);
    await newSchedulingConditionPage.close();
    this.schedulingConditions.updatePage(this.page);
    await this.page.waitForSelector(this.schedulingConditionListItemSelector, { state: 'visible', strict: true });
  }

  async createSchedulingGoal(baseURL: string | undefined, goalName: string) {
    const [newSchedulingGoalPage] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.schedulingGoalNewButton.click(),
    ]);
    this.schedulingGoals.updatePage(newSchedulingGoalPage);
    await newSchedulingGoalPage.waitForURL(`${baseURL}/scheduling/goals/new?modelId=*&&specId=*`);
    await this.schedulingGoals.createSchedulingGoal(baseURL, goalName);
    await newSchedulingGoalPage.close();
    this.schedulingGoals.updatePage(this.page);
    await this.page.waitForSelector(this.schedulingGoalListItemSelector(goalName), { state: 'visible', strict: true });
  }

  async deleteAllActivities() {
    await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
    await this.page.locator('.context-menu > .context-menu-item:has-text("Select All Activity Directives")').click();
    await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
    await this.page.getByText(/Delete \d+ Activit(y|ies) Directives?/).click();

    const applyPresetButton = this.page.getByRole('button', { name: 'Confirm' });
    await applyPresetButton.waitFor({ state: 'attached', timeout: 1000 });
    await applyPresetButton.click();
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

  async fillViewInputFile(planFilePath: string = this.validPlanFilePath) {
    const viewFileInput = this.page.locator('.modal-content input[name="file"]');
    await viewFileInput.focus();
    await viewFileInput.setInputFiles(planFilePath);
    await viewFileInput.evaluate(e => e.blur());
  }

  async fillViewInputName() {
    const viewNameInput = this.page.locator('.modal-content input[name="name"]');
    await viewNameInput.focus();
    await viewNameInput.fill(uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }));
    await viewNameInput.evaluate(e => e.blur());
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   * If your tests fail then the timeout might be too short.
   * Re-run the tests and increase the timeout if you get consistent failures.
   */
  async goto() {
    await this.page.waitForTimeout(1200);
    await this.page.goto(`/plans/${this.plans.planId}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async runAnalysis() {
    await this.analyzeButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
  }

  async runScheduling() {
    await this.scheduleButton.click();
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Incomplete'), { state: 'visible', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'attached', strict: true });
    await this.page.waitForSelector(this.schedulingStatusSelector('Complete'), { state: 'visible', strict: true });
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
    this.constraintNewButton = page.locator(`button[name="new-constraint"]`);
    this.gridMenu = page.locator('.grid-menu > .menu > .menu-slot');
    this.gridMenuButton = page.locator('.grid-menu');
    this.gridMenuItem = (name: string) =>
      page.locator(`.grid-menu > .menu > .menu-slot > .menu-item:has-text("${name}")`);
    this.navButtonExpansion = page.locator(`.nav-button:has-text("Expansion")`);
    this.navButtonExpansionMenu = page.locator(`.nav-button:has-text("Expansion") .menu`);
    this.navButtonConstraints = page.locator(`.nav-button:has-text("Constraints")`);
    this.navButtonConstraintsMenu = page.locator(`.nav-button:has-text("Constraints") .menu`);
    this.navButtonScheduling = page.locator(`.nav-button:has-text("Scheduling")`);
    this.navButtonSchedulingMenu = page.locator(`.nav-button:has-text("Scheduling") .menu`);
    this.navButtonSimulation = page.locator(`.nav-button:has-text("Simulation")`);
    this.navButtonSimulationMenu = page.locator(`.nav-button:has-text("Simulation") .menu`);
    this.navButtonView = page.locator('.view-menu');
    this.navButtonViewMenu = page.locator(`.view-menu .menu`);
    this.navButtonViewSaveAsMenuButton = page.locator(`.view-menu .menu .menu-item:has-text("Save as")`);
    this.navButtonViewSavedViewsMenuButton = page.locator(`.view-menu .menu .menu-item:has-text("Browse saved views")`);
    this.navButtonViewUploadViewMenuButton = page.locator(`.view-menu .menu .menu-item:has-text("Upload view file")`);
    this.page = page;
    this.panelActivityDirectivesTable = page.locator('[data-component-name="ActivityDirectivesTablePanel"]');
    this.panelActivityForm = page.locator('[data-component-name="ActivityFormPanel"]');
    this.panelActivityTypes = page.locator('[data-component-name="ActivityTypesPanel"]');
    this.panelConstraints = page.locator('[data-component-name="ConstraintsPanel"]');
    this.panelExpansion = page.locator('[data-component-name="ExpansionPanel"]');
    this.panelSchedulingConditions = page.locator('[data-component-name="SchedulingConditionsPanel"]');
    this.panelSchedulingGoals = page.locator('[data-component-name="SchedulingGoalsPanel"]');
    this.panelSimulation = page.locator('[data-component-name="SimulationPanel"]');
    this.panelTimeline = page.locator('[data-component-name="TimelinePanel"]');
    this.panelTimelineEditor = page.locator('[data-component-name="TimelineEditorPanel"]');
    this.planTitle = page.locator(`.plan-title:has-text("${this.plans.planName}")`);
    this.scheduleButton = page.locator('.header-actions button[aria-label="Schedule"]');
    this.analyzeButton = page.locator('.header-actions button[aria-label="Analyze"]');
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
}
