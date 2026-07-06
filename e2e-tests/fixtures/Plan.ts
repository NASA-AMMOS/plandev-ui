import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Status } from '../../src/enums/status';
import { setFileInputByFilepath } from '../utilities/helpers.js';
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
  changeMissionModelButton: Locator;
  changeMissionModelFilter: Locator;
  changeMissionModelMigrateButton: Locator;
  changeMissionModelModal: Locator;
  changeMissionModelTableRows: Locator;
  consoleContainer: Locator;
  constraintListItemSelector: string;
  constraintManageButton: Locator;
  constraintModalFilter: Locator;
  constraintNewButton: Locator;
  externalSourceManageButton: Locator;
  gridMenu: Locator;
  gridMenuButton: Locator;
  gridMenuItem: (name: string) => Locator;
  navButtonActivityChecking: Locator;
  navButtonActivityCheckingMenu: Locator;
  navButtonConstraints: Locator;
  navButtonConstraintsMenu: Locator;
  navButtonExpansion: Locator;
  navButtonExpansionMenu: Locator;
  navButtonExtension: Locator;
  navButtonExtensionMenu: Locator;
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
  planNameInput: Locator;
  planTitle: Locator;
  reSimulateButton: Locator;
  roleSelector: Locator;
  scheduleButton: Locator;
  schedulingConditionEnabledCheckboxSelector: (conditionName: string) => Locator;
  schedulingConditionListItemSelector: (conditionName: string) => string;
  schedulingConditionManageButton: Locator;
  schedulingConditionNewButton: Locator;
  schedulingConditionsModalFilter: Locator;
  schedulingGoal: (goalName: string) => Locator;
  schedulingGoalDifferenceBadge: (goalName: string) => Locator;
  schedulingGoalEnabledCheckboxSelector: (goalName: string) => Locator;
  schedulingGoalExpand: (goalName: string) => Locator;
  schedulingGoalListItemSelector: (goalName: string) => string;
  schedulingGoalManageButton: Locator;
  schedulingGoalNewButton: Locator;
  schedulingGoalsModalFilter: Locator;
  schedulingSatisfiedActivity: Locator;
  schedulingStatusSelector: (status: string) => string;
  sequenceExpansionApplySequenceFilterModal: Locator;
  sequenceExpansionNewButton: Locator;
  sequenceExpansionNewSequenceButton: Locator;
  sequenceExpansionNewSequenceConfirmButton: Locator;
  sequenceExpansionNewSequenceFilterButton: Locator;
  sequenceExpansionNewSequenceName: Locator;
  sequenceExpansionOutputModal: Locator;
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
    this.schedulingConditionListItemSelector = (conditionName: string) =>
      `.scheduling-condition:has-text("${conditionName}")`;
    this.schedulingGoalListItemSelector = (goalName: string) => `.scheduling-goal:has-text("${goalName}")`;
    this.schedulingStatusSelector = (status: string) =>
      `div[data-component-name="SchedulingGoalsPanel"] .header-actions > .status-badge.${status.toLowerCase()}`;
    this.simulationStatusSelector = (status: string) =>
      `.nav-button:has-text("Simulation") .status-badge[aria-label=${status}]`;
    this.activityCheckingStatusSelector = (status: string) =>
      `.nav-button:has-text("Activities") .status-badge[aria-label=${status}]`;
    this.updatePage(page);
  }

  async addActivityByDragAndDrop(name: string = 'GrowBanana') {
    // Ensure Activity Directives Table panel is visible for verification later
    if (!(await this.panelActivityDirectivesTable.isVisible())) {
      await this.showPanel(PanelNames.ACTIVITY_DIRECTIVES_TABLE);
    }
    await this.showPanel(PanelNames.TIMELINE_ITEMS);
    const activityListItem = this.page.locator(`.list-item :text-is("${name}")`);
    await expect(activityListItem).toBeVisible();
    const activityRow = this.page
      .locator('.timeline')
      .getByRole('listitem')
      .filter({ hasText: 'Activities by Type' })
      .first()
      .locator('.overlay');
    await expect(activityRow).toBeVisible();
    // Wait for timeline to finish loading before attempting drag
    await this.waitForTimelineLoading();
    // Click on activity item first to ensure Svelte drag listeners are initialized
    await activityListItem.click();
    // Scroll elements into view
    await activityListItem.scrollIntoViewIfNeeded();
    await activityRow.scrollIntoViewIfNeeded();
    // Use dragTo for the drag operation
    await activityListItem.dragTo(activityRow, { timeout: 10000 });
    // Directive builder should have appeared
    const activityDirectiveBuilder = this.page.getByText('Activity Directive Builder');
    await expect(activityDirectiveBuilder).toBeVisible();
    // Select the proper activity type
    await this.page.getByLabel('manual-types').getByText(name).click();
    // Create the activity
    await this.page.getByRole('button', { name: 'Create Activity Directive' }).click();
    await this.waitForToast('Activity Directive Created Successfully');
    // Verify at least one activity with this name exists in the table
    await expect(this.panelActivityDirectivesTable.getByRole('row', { name }).first()).toBeVisible({ timeout: 10000 });
  }

  async addActivityByGenericButton(name: string = 'GrowBanana') {
    // Ensure Activity Directives Table panel is visible for verification later
    if (!(await this.panelActivityDirectivesTable.isVisible())) {
      await this.showPanel(PanelNames.ACTIVITY_DIRECTIVES_TABLE);
    }
    await this.showPanel(PanelNames.TIMELINE_ITEMS);
    const activityListItem = this.page.locator(`.list-item :text-is("${name}")`);
    await expect(activityListItem).toBeVisible();
    const activityRow = this.page
      .locator('.timeline')
      .getByRole('listitem')
      .filter({ hasText: 'Activities by Type' })
      .first()
      .locator('.overlay');
    await expect(activityRow).toBeVisible();
    // Wait for timeline to finish loading before attempting drag
    await this.waitForTimelineLoading();
    // Click on activity item first to ensure Svelte drag listeners are initialized
    await activityListItem.click();
    // Scroll elements into view
    await activityListItem.scrollIntoViewIfNeeded();
    await activityRow.scrollIntoViewIfNeeded();
    // Open builder
    const addActivityButton = await this.page.getByRole('button', { name: 'Add Activity' });
    await addActivityButton.scrollIntoViewIfNeeded();
    await addActivityButton.click();
    // Directive builder should have appeared
    const activityDirectiveBuilder = this.page.getByPlaceholder('Enter an optional name for this directive');
    await expect(activityDirectiveBuilder).toBeVisible();
    // Select the proper activity type
    await this.page.getByLabel('manual-types').getByRole('combobox').click();
    await this.page.getByRole('menuitem', { name }).click();
    // Create the activity
    await this.page.getByRole('button', { name: 'Create Activity Directive' }).click();
    await this.waitForToast('Activity Directive Created Successfully');
    // Verify at least one activity with this name exists in the table
    await expect(this.panelActivityDirectivesTable.getByRole('row', { name }).first()).toBeVisible({ timeout: 10000 });
  }

  async addActivityByTypeButton(name: string = 'GrowBanana') {
    // Ensure Activity Directives Table panel is visible for verification later
    if (!(await this.panelActivityDirectivesTable.isVisible())) {
      await this.showPanel(PanelNames.ACTIVITY_DIRECTIVES_TABLE);
    }
    await this.showPanel(PanelNames.TIMELINE_ITEMS);
    const activityListItem = this.page.locator(`.list-item :text-is("${name}")`);
    await expect(activityListItem).toBeVisible();
    const activityRow = this.page
      .locator('.timeline')
      .getByRole('listitem')
      .filter({ hasText: 'Activities by Type' })
      .first()
      .locator('.overlay');
    await expect(activityRow).toBeVisible();
    // Wait for timeline to finish loading before attempting drag
    await this.waitForTimelineLoading();
    // Click on activity item first to ensure Svelte drag listeners are initialized
    await activityListItem.click();
    // Scroll elements into view
    await activityListItem.scrollIntoViewIfNeeded();
    await activityRow.scrollIntoViewIfNeeded();
    // Open builder
    await this.page.getByText(name).hover();
    const addActivityButton = await this.page.getByRole('button', { name: `AddActivity-${name}` });
    await addActivityButton.scrollIntoViewIfNeeded();
    await addActivityButton.click();
    // Directive builder should have appeared
    const activityDirectiveBuilder = this.page.getByPlaceholder('Enter an optional name for this directive');
    await expect(activityDirectiveBuilder).toBeVisible();
    // Select the proper activity type
    await this.page.getByLabel('manual-types').getByRole('combobox').click();
    await this.page.getByRole('menuitem', { name }).click();
    // Create the activity
    await this.page.getByRole('button', { name: 'Create Activity Directive' }).click();
    await this.waitForToast('Activity Directive Created Successfully');
    // Verify at least one activity with this name exists in the table
    await expect(this.panelActivityDirectivesTable.getByRole('row', { name }).first()).toBeVisible({ timeout: 10000 });
  }

  async addPlanCollaborator(name: string, isUsername = true) {
    await this.showPanel(PanelNames.PLAN_METADATA, true);
    await this.waitForPlanCollaboratorLoad();
    // Click input first to trigger focus and open dropdown
    await this.planCollaboratorInput.click();
    await this.planCollaboratorInput.fill(name);
    // Wait for suggestions dropdown to appear and find option within it
    const suggestionsDropdown = this.page.locator('#tags-input');
    await expect(suggestionsDropdown).toBeVisible();
    // Wait for the option to appear (API search may take time)
    const option = suggestionsDropdown.getByRole('option', { name });
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    // If the name is a username then check for the existence of the username in selected items
    // Otherwise it is a plan option and will add an unspecified amount of users
    if (isUsername) {
      await expect(
        this.planCollaboratorInputContainer.getByTestId('tags-input-selected-items').getByRole('option', { name }),
      ).toBeVisible();
    }
    await this.waitForToast('Plan Collaborators Updated');
  }

  async applySequenceFilter(sequenceFilterName: string, planId: string) {
    const sequenceFilterItem = this.page.locator('.sne-items').getByText(sequenceFilterName, { exact: true });
    await sequenceFilterItem.hover();
    await this.page.getByLabel(`Apply '${sequenceFilterName}'`).click();
    await this.sequenceExpansionApplySequenceFilterModal.waitFor({ state: 'attached' });
    await this.sequenceExpansionApplySequenceFilterModal.waitFor({ state: 'visible' });
    await this.page.getByRole('button', { exact: true, name: 'Confirm' }).click();
    await this.waitForToast('Expansion Sequence Created Successfully');
    await expect(this.page.locator('.sne-items').getByText(`${sequenceFilterName} Sequence`)).toBeVisible();
    await this.panelActivityDirectivesTable.getByRole('row', { name: 'PeelBanana' }).first().click();

    await this.showPanel(PanelNames.SELECTED_ACTIVITY, true);
    await this.page.getByLabel('Jump to Simulated Activity').click();
    await expect(this.page.locator('select[name="sequences"]')).toHaveValue(
      `${sequenceFilterName} Sequence (Plan ${planId})`,
    );
  }

  /**
   * Opens the simulation start/end date picker and clicks its "Plan Start"/"Plan End" action button,
   * which resets that bound to the plan's start/end.
   */
  async clickSimulationPlanBoundButton(bound: 'start' | 'end') {
    await this.showPanel(PanelNames.SIMULATION, true);
    const input = this.panelSimulation.locator(`input[name="${bound === 'start' ? 'start-time' : 'end-time'}"]`);
    await input.scrollIntoViewIfNeeded();
    await input.click(); // open the date picker dropdown that contains the action button
    await this.panelSimulation.getByRole('button', { name: bound === 'start' ? 'Plan Start' : 'Plan End' }).click();
  }

  async closeSnapshotPreview() {
    await this.page.getByRole('button', { name: 'Close Preview' }).click();
  }

  async createBranch(
    baseURL?: string,
    name: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }),
  ) {
    const branchPlanUrlRegex = new RegExp(`${baseURL}/plans/(?<planId>\\d+)`);
    await this.page.waitForURL(branchPlanUrlRegex);
    const matches = this.page.url().match(branchPlanUrlRegex);
    expect(matches).not.toBeNull();

    let currentPlanId = 'foo';
    if (matches) {
      const { groups: { planId } = {} } = matches;
      currentPlanId = planId;
    }

    await this.page.getByText(this.planName).first().click();
    await this.page.getByText('Create branch').click();
    await this.page.getByPlaceholder('Name of branch').click();
    await this.page.getByPlaceholder('Name of branch').fill(name);
    await this.page.getByRole('button', { name: 'Create Branch' }).click();

    const parentPlanUrlRegex = new RegExp(`${baseURL}/plans/((?!${currentPlanId}).)*`);
    await this.page.waitForURL(parentPlanUrlRegex);
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
    await this.constraintModalFilter.fill(this.constraints.constraintName);
    await expect(this.page.getByRole('row', { name: this.constraints.constraintName })).toBeVisible();
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
    await this.schedulingConditionsModalFilter.fill(this.schedulingConditions.conditionName);
    await expect(this.page.getByRole('row', { name: this.schedulingConditions.conditionName })).toBeVisible();
    await this.page
      .getByRole('row', { name: this.schedulingConditions.conditionName })
      .getByRole('checkbox')
      .click({ position: { x: 2, y: 2 } });
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForSelector(this.schedulingConditionListItemSelector(this.schedulingConditions.conditionName), {
      state: 'visible',
      strict: true,
    });
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
    await this.schedulingGoalsModalFilter.fill(goalName);
    await expect(this.page.getByRole('row', { name: goalName })).toBeVisible();
    await this.page
      .getByRole('row', { name: goalName })
      .getByRole('checkbox')
      .click({ position: { x: 2, y: 2 } });
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.waitForSelector(this.schedulingGoalListItemSelector(goalName), { state: 'visible', strict: true });
  }

  async createSequenceFilter(sequenceFilterName: string) {
    await this.sequenceExpansionNewButton.click();
    await this.sequenceExpansionNewSequenceFilterButton.click();
    await this.page.getByPlaceholder('Enter a name for this filter').fill(sequenceFilterName);
    await this.page.getByPlaceholder('Select types').click();
    await this.page.getByPlaceholder('Select types').fill('PeelBanana');
    await this.page.getByRole('menuitem', { name: 'PeelBanana' }).click();
    await this.page.getByRole('button', { name: 'Create Sequence Filter' }).click();
    await expect(this.page.locator('.sne-items').getByText(sequenceFilterName, { exact: true })).toBeVisible();
  }

  async deleteAllActivities() {
    const gridCells = await this.panelActivityDirectivesTable.getByRole('gridcell');
    if ((await gridCells.count()) > 0) {
      await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
      await this.page.getByRole('menuitem', { name: 'Select All Activity Directives' }).click();
      await this.panelActivityDirectivesTable.getByRole('gridcell').first().click({ button: 'right' });
      await this.page.getByText(/Delete \d+ Activit(y|ies) Directives?/).click();

      const confirmDeletionButton = await this.page.getByRole('button', { name: 'Confirm' });
      await confirmDeletionButton.waitFor({ state: 'attached', timeout: 1000 });
      await confirmDeletionButton.click();
    }
  }

  async fillActivityPresetName(presetName: string) {
    // Open the preset control by its stable name attribute rather than the current display value
    // ('None'), so creating a preset works whether or not one is already applied (e.g. creating a
    // second preset after the first is applied). This mirrors how selectActivityPresetByName opens it.
    await this.panelActivityForm.locator('div[name="Set Preset"]').click();
    await this.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'attached' });
    await this.panelActivityForm.getByPlaceholder('Enter preset name').click();
    await this.panelActivityForm.getByPlaceholder('Enter preset name').fill(presetName);
    await this.panelActivityForm.getByPlaceholder('Enter preset name').blur();
  }

  async fillFileInput(importFilePath: string) {
    const inputFile = this.page
      .getByRole('tabpanel')
      .filter({ hasText: 'Activity, Resource, Event Types' })
      .first()
      .locator('input[name="file"]');
    await setFileInputByFilepath(this.page, inputFile, importFilePath);
  }

  async fillPlanName(name: string) {
    await this.planNameInput.fill(name);
    await this.planNameInput.evaluate(e => e.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    await this.planNameInput.evaluate(e => e.dispatchEvent(new Event('change')));
    await this.planNameInput.blur();
  }

  async fillSimulationTemplateName(templateName: string) {
    await this.panelSimulation.locator('div[name="Set Template"]').click();
    await this.panelSimulation.locator('.dropdown-header').waitFor({ state: 'attached' });
    await this.panelSimulation.getByPlaceholder('Enter template name').click();
    await this.panelSimulation.getByPlaceholder('Enter template name').fill(templateName);
    await this.panelSimulation.getByPlaceholder('Enter template name').blur();
  }

  /**
   * Selects the activity directive with the given name in the directives table and returns the
   * absolute start time shown in the activity form (resolved from offsets/anchors).
   */
  async getActivityStartTime(activityName: string): Promise<string> {
    if (!(await this.panelActivityDirectivesTable.isVisible())) {
      await this.showPanel(PanelNames.ACTIVITY_DIRECTIVES_TABLE);
    }
    await this.panelActivityDirectivesTable.getByRole('row', { name: activityName }).first().click();
    if (!(await this.panelActivityForm.isVisible())) {
      await this.showPanel(PanelNames.SELECTED_ACTIVITY, true);
    }
    // The activity name is shown as a header label (not an input) until it is edited.
    await expect(this.panelActivityForm.locator('.activity-header-title-value')).toHaveText(activityName);
    return (await this.panelActivityForm.locator('input[name="start-time"]').inputValue()).trim();
  }

  /** Reads the read-only Start/End time values shown in the Plan Metadata panel. */
  async getPlanMetadataBounds(): Promise<{ end: string; start: string }> {
    await this.showPanel(PanelNames.PLAN_METADATA, true);
    const start = (await this.panelPlanMetadata.locator('input[name="planStartTime"]').inputValue()).trim();
    const end = (await this.panelPlanMetadata.locator('input[name="planEndTime"]').inputValue()).trim();
    return { end, start };
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
    await this.page.goto(`/plans/${planId}`, { waitUntil: 'load' });
    await this.page.waitForURL(`/plans/${planId}`, { waitUntil: 'load' });
    await this.waitForTimelineLoading();
  }

  /** Navigates to a plan in snapshot-preview mode via the `snapshotId` query parameter. */
  async gotoSnapshotPreview(snapshotId: number, planId = this.plans.planId) {
    await this.page.goto(`/plans/${planId}?snapshotId=${snapshotId}`, { waitUntil: 'load' });
    await this.waitForTimelineLoading();
  }

  async hoverMenu(menuButton: Locator) {
    await menuButton.hover();
    const menu = menuButton.getByRole('menu');
    await menu.waitFor({ state: 'attached' });
    await menu.waitFor({ state: 'visible' });
  }

  async reRunSimulation(expectedFinalState = Status.Complete) {
    await this.reSimulateButton.click();
    await this.waitForSimulationStatus(expectedFinalState);
  }

  async removeConstraint() {
    await this.constraintManageButton.click();
    await this.constraintModalFilter.fill(this.constraints.constraintName);
    const row = this.page.getByRole('row', { name: this.constraints.constraintName });
    await expect(row).toBeVisible();
    // Use click with force for AG Grid checkboxes - check/uncheck fails with Chrome for Testing
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeChecked();
    await checkbox.click({ force: true });
    await expect(checkbox).not.toBeChecked();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.locator(this.constraintListItemSelector).waitFor({ state: 'detached' });
  }

  async removePlanCollaborator(name: string) {
    await this.showPanel(PanelNames.PLAN_METADATA, true);
    await this.waitForPlanCollaboratorLoad();
    await this.planCollaboratorInputContainer.getByRole('option', { name }).click();
    await this.waitForToast('Plan Collaborator Removed Successfully');
  }

  async removeSchedulingGoal(goalName: string) {
    await this.schedulingGoalManageButton.click();
    await this.schedulingGoalsModalFilter.fill(goalName);
    const row = this.page.getByRole('row', { name: goalName });
    await expect(row).toBeVisible();
    // Use click with force for AG Grid checkboxes - check/uncheck fails with Chrome for Testing
    const checkbox = row.getByRole('checkbox');
    await expect(checkbox).toBeChecked();
    await checkbox.click({ force: true });
    await expect(checkbox).not.toBeChecked();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.locator(this.schedulingGoalListItemSelector(goalName)).waitFor({ state: 'detached' });
  }

  async renamePlan(name: string) {
    await this.fillPlanName(name);
    await this.waitForToast('Plan Updated Successfully');
  }

  async runAnalysis() {
    await this.analyzeButton.click();
    await this.waitForSchedulingStatus(Status.Complete);
  }

  async runScheduling(expectedFinalState = Status.Complete) {
    await this.scheduleButton.click();
    await this.waitForSchedulingStatus(expectedFinalState);
  }

  async runSimulation(expectedFinalState = Status.Complete) {
    await this.simulateButton.click();
    await this.waitForSimulationStatus(expectedFinalState);
  }

  async selectActivityAnchorByIndex(index: number) {
    const anchorCollapse = this.panelActivityForm.getByRole('group', { name: 'Anchor-collapse' });
    await anchorCollapse.getByRole('combobox').click();

    await anchorCollapse.getByRole('menuitem').nth(index).waitFor({ state: 'attached' });
    const anchorMenuName = await anchorCollapse.getByRole('menuitem').nth(index)?.innerText();
    await anchorCollapse.getByRole('menuitem').nth(index).click();
    await anchorCollapse.getByRole('menuitem').nth(index).waitFor({ state: 'detached' });

    await this.page.waitForFunction(
      anchorMenuName => document.querySelector('.anchor-form .selected-display-value')?.innerHTML === anchorMenuName,
      anchorMenuName,
    );
    await expect(anchorCollapse.getByRole('combobox', { name: anchorMenuName })).toBeVisible();
  }

  async selectActivityPresetByName(presetName: string) {
    await this.panelActivityForm.locator('div[name="Set Preset"]').click();

    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).waitFor({ state: 'attached' });
    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).click();
    await this.panelActivityForm.getByRole('menuitem', { name: presetName }).waitFor({ state: 'detached' });

    // Applying a preset onto a directive whose parameters were modified pops an "Apply Preset"
    // confirmation modal; selecting a non-conflicting preset (e.g. 'None') does not. Rather than
    // racing a fixed 1s timeout (which silently dropped the modal when it appeared late under CI
    // load and left the preset unapplied), wait for whichever settles first: the modal appearing
    // (click it to confirm) or the display value updating on its own (no modal was needed).
    const applyPresetButton = this.page.getByRole('button', { name: 'Apply Preset' });
    const displayValueSettled = this.page.waitForFunction(
      presetName =>
        document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === presetName,
      presetName,
    );
    const modalAppeared = applyPresetButton
      .waitFor({ state: 'visible' })
      .then(() => true)
      .catch(() => false);

    const modalWon = await Promise.race([modalAppeared, displayValueSettled.then(() => false).catch(() => false)]);
    if (modalWon) {
      await applyPresetButton.click();
    }

    await displayValueSettled;
    await expect(this.panelActivityForm.getByRole('combobox', { name: presetName })).toBeVisible();
  }

  async selectSimulationTemplateByName(templateName: string) {
    await this.panelSimulation.locator('div[name="Set Template"]').click();

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
      if ((e as Error).name !== 'TimeoutError') {
        console.error(e);
      }
    }

    await this.page.waitForFunction(
      templateName =>
        document.querySelector('.simulation-template-input-container .selected-display-value')?.innerHTML ===
        templateName,
      templateName,
    );
    await expect(this.panelSimulation.getByRole('combobox', { name: templateName })).toBeVisible();
  }

  /**
   * Sets the plan's end time via the "Change Plan Time Range" modal.
   */
  async setPlanEndTime(value: string) {
    await this.setPlanTimeBound('boundsEndTime', value);
  }

  /**
   * Sets the plan's start time via the "Change Plan Time Range" modal.
   */
  async setPlanStartTime(value: string) {
    await this.setPlanTimeBound('boundsStartTime', value);
  }

  /**
   * Opens the "Change Plan Time Range" modal from the Plan Metadata panel, sets one bound
   * (committing with Enter), and submits. If the bound did not actually change the Update button
   * stays disabled, so the modal is dismissed instead and the caller never hangs on a no-op.
   */
  async setPlanTimeBound(fieldName: 'boundsStartTime' | 'boundsEndTime', value: string) {
    await this.showPanel(PanelNames.PLAN_METADATA, true);
    const editButton = this.panelPlanMetadata.getByRole('button', { name: 'Change plan time range' });
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();

    const modal = this.page.locator('#modal-container');
    await expect(modal).toContainText('Change Plan Time Range');

    const input = modal.locator(`input[name="${fieldName}"]`);
    await input.fill(value);
    await input.press('Enter');

    const updateButton = modal.getByRole('button', { name: 'Update Time Range' });
    try {
      await expect(updateButton).toBeEnabled({ timeout: 1000 });
    } catch {
      await modal.getByRole('button', { exact: true, name: 'Cancel' }).click();
      return;
    }
    await updateButton.click();
    await this.waitForToast('Plan Updated Successfully');
  }

  /**
   * Types a value into the simulation start/end field (committing with Enter) in the Simulation panel.
   */
  async setSimulationBound(bound: 'start' | 'end', value: string) {
    await this.showPanel(PanelNames.SIMULATION, true);
    const input = this.panelSimulation.locator(`input[name="${bound === 'start' ? 'start-time' : 'end-time'}"]`);
    await input.scrollIntoViewIfNeeded();
    await input.fill(value);
    await input.press('Enter');
  }

  async showChangeModelModal() {
    await this.showPanel(PanelNames.PLAN_METADATA, true);
    await expect(this.changeMissionModelButton).toBeEnabled();
    await this.changeMissionModelButton.click();
    await expect(this.changeMissionModelFilter).toBeVisible();
  }

  async showConstraintsLayout() {
    await this.showPanel(PanelNames.CONSTRAINTS);
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

  async showPanel(name: PanelNames, pickLastMenu: boolean = false) {
    await expect(this.gridMenu).not.toBeVisible();
    let gridMenuButton: Locator;
    if (pickLastMenu) {
      gridMenuButton = this.gridMenuButton.last();
    } else {
      gridMenuButton = this.gridMenuButton.first();
    }

    await expect(gridMenuButton).toBeVisible();
    await expect(gridMenuButton).toBeEnabled();
    await this.waitForTimelineLoading();
    await gridMenuButton.click();

    await this.gridMenu.waitFor({ state: 'attached' });
    await this.gridMenu.waitFor({ state: 'visible' });
    await this.gridMenuItem(name).click();
  }

  async showSchedulingLayout() {
    await this.showPanel(PanelNames.SCHEDULING_GOALS);
    await this.showPanel(PanelNames.SCHEDULING_CONDITIONS, true);
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
    this.activitiesTable = page.locator(`div.ag-theme-stellar.data-grid-table`);
    this.activitiesTableFirstRow = page
      .locator(`div.ag-theme-stellar.data-grid-table .ag-center-cols-container > .ag-row`)
      .nth(0);
    this.changeMissionModelButton = page.getByRole('button', { name: 'Change mission model' });
    this.changeMissionModelModal = page.locator('.modal:has-text("Change Mission Model")');
    this.changeMissionModelFilter = this.changeMissionModelModal.getByPlaceholder('Search mission models');
    this.changeMissionModelTableRows = this.changeMissionModelModal.getByRole('rowgroup');
    this.changeMissionModelMigrateButton = this.changeMissionModelModal.getByRole('button', {
      name: 'Change Mission Model',
    });
    this.constraintManageButton = page.locator(`button[name="manage-constraints"]`);
    this.constraintModalFilter = page.locator('.modal').getByPlaceholder('Filter constraints');
    this.constraintNewButton = page.locator(`button[name="new-constraint"]`);
    this.consoleContainer = page.getByTestId('console');
    this.externalSourceManageButton = page.getByLabel('Select derivation groups to');
    this.gridMenuButton = page.getByLabel('Plan Menu', { exact: true });
    this.gridMenu = page.getByRole('menu', { exact: true, name: 'Plan Menu' });
    this.gridMenuItem = (name: string) => this.gridMenu.getByRole('menuitem', { exact: true, name });
    this.navButtonActivityChecking = page.locator(`.nav-button:has-text("Activities")`);
    this.navButtonActivityCheckingMenu = this.navButtonActivityChecking.getByRole('menu');
    this.navButtonExpansion = page.locator(`.nav-button:has-text("Expansion")`);
    this.navButtonExpansionMenu = this.navButtonExpansion.getByRole('menu');
    this.navButtonExtension = page.locator(`.nav-button:has-text("Extensions")`);
    this.navButtonExtensionMenu = this.navButtonExtension.getByRole('menu');
    this.navButtonConstraints = page.locator(`.nav-button:has-text("Constraints")`);
    this.navButtonConstraintsMenu = this.navButtonConstraints.getByRole('menu');
    this.navButtonScheduling = page.locator(`.nav-button:has-text("Scheduling")`);
    this.navButtonSchedulingMenu = this.navButtonScheduling.getByRole('menu');
    this.navButtonSimulation = page.locator(`.nav-button:has-text("Simulation")`);
    this.navButtonSimulationMenu = this.navButtonSimulation.getByRole('menu');
    this.navButtonSimulationMenuStatus = this.navButtonSimulation.locator(`.status-badge`);
    this.page = page;
    this.panelActivityDirectivesTable = page.locator('[data-component-name="ActivityDirectivesTablePanel"]');
    this.panelActivityForm = page.locator('[data-component-name="ActivityFormPanel"]');
    this.panelActivityTypes = page.locator('[data-component-name="TimelineItemsPanel"]');
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
    this.planCollaboratorInputContainer = this.panelPlanMetadata.getByLabel('collaborators combobox');
    this.planCollaboratorInput = this.planCollaboratorInputContainer.getByPlaceholder('Search collaborators or plans');
    this.planNameInput = page.locator('input[name="plan-name"]');
    this.planCollaboratorLoadingInput = this.planCollaboratorInputContainer.getByPlaceholder('Loading...');
    this.roleSelector = page.getByRole('navigation').getByLabel('Select Role');
    this.reSimulateButton = page.locator('.header-actions button:has-text("Re-Run")');
    this.scheduleButton = page.locator('.header-actions button[aria-label="Schedule"]');
    this.simulateButton = page.locator('.header-actions button:has-text("Simulate")');
    this.simulationHistoryList = page.locator('.simulation-history');
    this.analyzeButton = page.locator('.header-actions button[aria-label="Analyze"]');
    this.schedulingGoalManageButton = page.locator(`button[name="manage-goals"]`);
    this.schedulingConditionManageButton = page.locator(`button[name="manage-conditions"]`);
    this.schedulingGoal = (goalName: string) => page.locator(`.scheduling-goal:has-text("${goalName}")`);
    this.schedulingGoalDifferenceBadge = (goalName: string) =>
      this.schedulingGoal(goalName).locator('.difference-badge');
    this.schedulingGoalEnabledCheckboxSelector = (goalName: string) =>
      this.schedulingGoal(goalName).getByRole('checkbox');
    this.schedulingGoalsModalFilter = this.page.locator('.modal').getByPlaceholder('Filter goals');
    this.schedulingConditionsModalFilter = this.page.locator('.modal').getByPlaceholder('Filter conditions');
    this.schedulingConditionEnabledCheckboxSelector = (conditionName: string) =>
      page.locator(`.scheduling-condition:has-text("${conditionName}")`).getByRole('checkbox');
    this.schedulingGoalExpand = (goalName: string) =>
      this.schedulingGoal(goalName).locator('.collapse-root > button').first();
    this.schedulingGoalNewButton = page.locator(`button[name="new-scheduling-goal"]`);
    this.schedulingConditionNewButton = page.locator(`button[name="new-scheduling-condition"]`);
    this.schedulingSatisfiedActivity = page.locator('.scheduling-goal-analysis-activities-list > .satisfied-activity');
    this.sequenceExpansionNewButton = page.getByRole('button', { exact: true, name: 'New' });
    this.sequenceExpansionNewSequenceButton = page.getByRole('menuitem', { exact: true, name: 'Sequence' });
    this.sequenceExpansionNewSequenceFilterButton = page.getByRole('menuitem', {
      exact: true,
      name: 'Sequence Filter',
    });
    this.sequenceExpansionNewSequenceName = page.locator('input[name="sequence-name"]');
    this.sequenceExpansionNewSequenceConfirmButton = page.getByRole('button', { exact: true, name: 'Confirm' });
    this.sequenceExpansionApplySequenceFilterModal = page.locator(`.modal:has-text("Create Sequence from Filter")`);
    this.sequenceExpansionOutputModal = page.locator(`.modal:has-text("Sequence ID")`);
  }

  async uploadActivities(importFilePath: string) {
    await this.panelActivityTypes.getByRole('tab', { exact: true, name: 'Activities' }).click();
    await this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload Activities' }).click();
    await this.fillFileInput(importFilePath);
    await expect(this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload' })).toBeEnabled();
    await this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload' }).click();
  }

  async uploadExternalDatasets(importFilePath: string) {
    await this.panelActivityTypes.getByRole('tab', { exact: true, name: 'Resources' }).click();
    await this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload Resources' }).click();
    await this.fillFileInput(importFilePath);
    await expect(this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload' })).toBeEnabled();
    await this.panelActivityTypes.getByRole('button', { exact: true, name: 'Upload' }).click();
  }

  async waitForActivityCheckingStatus(status: Status) {
    await expect(this.page.locator(this.activityCheckingStatusSelector(status))).toBeAttached({ timeout: 10000 });
    await expect(this.page.locator(this.activityCheckingStatusSelector(status))).toBeVisible();
  }

  async waitForPlanCollaboratorLoad() {
    await expect(this.planCollaboratorInputContainer).toBeVisible({ timeout: 10000 });
    await expect(this.planCollaboratorLoadingInput).not.toBeVisible({ timeout: 10000 });
  }

  async waitForSchedulingStatus(status: Status) {
    await expect(this.page.locator(this.schedulingStatusSelector(status))).toBeAttached({ timeout: 10000 });
    await expect(this.page.locator(this.schedulingStatusSelector(status))).toBeVisible();
  }

  async waitForSimulationStatus(status: Status) {
    await expect(this.page.locator(this.simulationStatusSelector(status))).toBeAttached({ timeout: 10000 });
    await expect(this.page.locator(this.simulationStatusSelector(status))).toBeVisible();
  }

  async waitForTimelineLoading(timeout: number = 10000) {
    // Brief wait for loading to appear (may not appear if data loads fast), then wait for all to disappear
    // Use catch to avoid failing if some timeline rows never finish loading (e.g., missing resources)
    await this.page
      .locator('.layer-message.loading')
      .first()
      .waitFor({ state: 'visible', timeout: 1000 })
      .catch(() => {});
    await expect(this.page.locator('.layer-message.loading'))
      .toHaveCount(0, { timeout })
      .catch(() => {});
  }

  async waitForToast(message: string, timeout: number = 10000) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout });
  }
}

export enum PanelNames {
  ACTIVITY_DIRECTIVES_TABLE = 'Activity Directives Table',
  SIMULATED_ACTIVITIES_TABLE = 'Simulated Activities Table',
  TIMELINE_ITEMS = 'Activity, Resource, Event Types',
  CONSTRAINTS = 'Constraints',
  EXPANSION = 'Expansion',
  EXTERNAL_APPLICATION = 'External Application',
  PLAN_METADATA = 'Plan Metadata',
  SCHEDULING_GOALS = 'Scheduling Goals',
  SCHEDULING_CONDITIONS = 'Scheduling Conditions',
  SELECTED_ACTIVITY = 'Selected Activity',
  SIMULATION = 'Simulation',
  TIMELINE_EDITOR = 'Timeline Editor',
  EXTERNAL_SOURCES = 'External Sources',
}
