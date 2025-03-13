import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { SequenceTemplates } from '../fixtures/SequenceTemplates.js';

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const sequenceTemplateName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const expansionSequenceName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const sequenceTemplateContent: string = '/C Example_Command "ARG1"';
const sequenceTemplateLanguage: string = 'Text';

let constraints: Constraints;
let context: BrowserContext;
let dictionaryName: string;
let dictionaries: Dictionaries;
let models: Models;
let page: Page;
let parcels: Parcels;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let sequenceTemplates: SequenceTemplates;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  dictionaries = new Dictionaries(page);
  parcels = new Parcels(page);
  sequenceTemplates = new SequenceTemplates(page, parcels, models);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);
  await sequenceTemplates.goto();
  await sequenceTemplates.createSequenceTemplate(sequenceTemplateName, sequenceTemplateLanguage);
});

test.afterAll(async () => {
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await parcels.goto();
  await page.close();
  await context.close();
});

test.beforeEach(async () => {
  await plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan Sequences & Expansion', () => {
  test('Expansion Sequence can be created', async () => {
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.SEQUENCES_AND_EXPANSION);
    await plan.sequenceExpansionNewButton.click();
    await plan.sequenceExpansionNewSequenceButton.click();
    await plan.sequenceExpansionNewSequenceName.fill(expansionSequenceName);
    await plan.sequenceExpansionNewSequenceConfirmButton.click();
    await plan.waitForToast('Expansion Sequence Created Successfully');
    await expect(page.locator('.sne-items').getByText(expansionSequenceName, { exact: true })).toBeVisible();
  });
  test('Sequence Filter can be created', async () => {
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.SEQUENCES_AND_EXPANSION);
    await plan.sequenceExpansionNewButton.click();
    await plan.sequenceExpansionNewSequenceFilterButton.click();
    await page.getByPlaceholder('Enter a name for this filter').fill(sequenceFilterName);
    await page.getByPlaceholder('Select types').click();
    await page.getByPlaceholder('Select types').fill('PeelBanana');
    await page.getByRole('menuitem', { name: 'PeelBanana' }).click();
    await page.getByRole('button', { name: 'Create Sequence Filter' }).click();
    await expect(page.locator('.sne-items').getByText(sequenceFilterName, { exact: true })).toBeVisible();
  });
  test('Sequence Filter can be applied to a plan', async () => {
    await plan.addActivity('PeelBanana');
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.SEQUENCES_AND_EXPANSION);
    const sequenceFilterItem = page.locator('.sne-items').getByText(sequenceFilterName, { exact: true });
    await sequenceFilterItem.hover();
    await page.getByLabel(`Apply '${sequenceFilterName}'`).click();
    await plan.sequenceExpansionTimeRangeModal.waitFor({ state: 'attached' });
    await plan.sequenceExpansionTimeRangeModal.waitFor({ state: 'visible' });
    await page.getByRole('button', { exact: true, name: 'Confirm' }).click();
    await plan.waitForToast('Expansion Sequence Created Successfully');
    await expect(page.locator('.sne-items').getByText(`${sequenceFilterName} Sequence`, { exact: true })).toBeVisible();
    await plan.panelActivityDirectivesTable.getByRole('row', { name: 'PeelBanana' }).first().click();
    await plan.showPanel(PanelNames.SELECTED_ACTIVITY);
    await page.getByLabel('Jump to Simulated Activity').click();
    await expect(page.locator('select[name="sequences"]')).toHaveValue(`${sequenceFilterName} Sequence`);
  });
});

test.describe.serial('Sequence Templating', () => {
  test('Sequence Templating can be run', async () => {
    await sequenceTemplates.goto();
    await sequenceTemplates.updateSequenceTemplate(sequenceTemplateName, sequenceTemplateContent);
    await plan.goto();
    await plan.showPanel(PanelNames.SEQUENCES_AND_EXPANSION);
    const expansionSequenceItem = page
      .locator('.sne-items')
      .getByText(`${sequenceFilterName} Sequence`, { exact: true });
    await expansionSequenceItem.hover();
    await page.getByLabel(`Expand '${sequenceFilterName} Sequence'`).click();
    await plan.waitForToast('Sequence Templating Successfully');
    await page.getByLabel(`Show Expanded '${sequenceFilterName} Sequence'`).click();
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'attached' });
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'visible' });
    await page.getByText('Loading Editor...').waitFor({ state: 'detached' });
    await expect(plan.sequenceExpansionOutputModal.getByText(sequenceTemplateContent)).toBeVisible();
  });
});