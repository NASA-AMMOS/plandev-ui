import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { COMMAND_DICTIONARY_PATH, Dictionaries, DictionaryType } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionRuns } from '../fixtures/ExpansionRuns.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { getOptionValueFromText } from '../utilities/selectors.js';

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

let context: BrowserContext;
let constraints: Constraints;
let dictionaries: Dictionaries;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;
let models: Models;
let page: Page;
let parcels: Parcels;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let expansionRuns: ExpansionRuns;

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
  expansionRules = new ExpansionRules(page, parcels, models);
  expansionSets = new ExpansionSets(page, parcels, models, expansionRules);
  expansionRuns = new ExpansionRuns(page, plan, sequenceFilterName);

  const dictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  const dictionaryBuffer = dictionaries.readDictionary(dictionaryName, COMMAND_DICTIONARY_PATH);

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
  await plan.addActivity('PeelBanana');
  await plan.showPanel(PanelNames.SIMULATION, true);
  await plan.runSimulation();
  await page.waitForTimeout(1000); // wait for sim results

  await dictionaries.goto();
  await dictionaries.updatePage(page, DictionaryType.CommandDictionary, dictionaryName);
  await dictionaries.createDictionary(
    dictionaryBuffer,
    dictionaryName,
    dictionaries.commandDictionaryTable,
    dictionaries.commandDictionaryTableRow,
    DictionaryType.CommandDictionary,
  );
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);
  await expansionRules.goto();
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

test.describe.serial('Expansion', () => {
  test('Create expansion rule', async ({ baseURL }) => {
    await expansionRules.createExpansionRule(baseURL);
  });
  test('Create expansion set', async ({ baseURL }) => {
    await expansionSets.createExpansionSet(baseURL);
  });
  test('Typescript Expansion can be run', async () => {
    await plan.goto();
    await plan.showPanel(PanelNames.EXPANSION);
    await page.waitForSelector(`option:has-text("${expansionSets.expansionSetName}")`, {
      state: 'attached',
    });
    const value = await getOptionValueFromText(page, 'select[name="expansionSetId"]', expansionSets.expansionSetName);
    await page.locator('select[name="expansionSetId"]').focus();
    await page.locator('select[name="expansionSetId"]').selectOption(value);
    await page.locator('select[name="expansionSetId"]').evaluate(e => e.blur());
    await plan.createSequenceFilter(sequenceFilterName);
    await plan.applySequenceFilter(sequenceFilterName, plans.planId);
    const expansionSequenceItem = page.locator('.sne-items').getByText(`${sequenceFilterName} Sequence`);
    await expansionSequenceItem.hover();
    await page.getByLabel('Expand Sequence').waitFor({ state: 'visible' });
    await page.waitForTimeout(1000); // wait for expansion results
    await page.getByLabel('Expand Sequence').click();
    await plan.waitForToast('Plan Expanded Successfully');
    await page.getByLabel('Show Expanded Sequence').click();
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'attached' });
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'visible' });
    await page.getByText('Loading Editor...').waitFor({ state: 'detached' });
    await expect(plan.sequenceExpansionOutputModal.getByText('steps')).toBeVisible();
    await expansionRuns.goto();
    await expansionRuns.selectSequence();
    await expansionRuns.waitForContents(`@ID "${sequenceFilterName}`);
  });
  test('Delete expansion rule', async () => {
    await expansionRules.deleteExpansionRule();
  });
});
