import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { COMMAND_DICTIONARY_PATH, Dictionaries } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionRuns } from '../fixtures/ExpansionRuns.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';
import { getOptionValueFromText } from '../utilities/selectors.js';

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

let setup: BrowserSetupResult;
let constraints: Constraints;
let dictionaries: Dictionaries;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;
let models: Models;
let parcels: Parcels;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let expansionRuns: ExpansionRuns;

test.beforeAll(async ({ baseURL, browser }) => {
  setup = await setupTest(browser, { model: false });

  models = new Models(setup.page);
  plans = new Plans(setup.page, models);
  constraints = new Constraints(setup.page);
  schedulingConditions = new SchedulingConditions(setup.page);
  schedulingGoals = new SchedulingGoals(setup.page);
  plan = new Plan(setup.page, plans, constraints, schedulingGoals, schedulingConditions);
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  expansionRules = new ExpansionRules(setup.page, parcels, models);
  expansionSets = new ExpansionSets(setup.page, parcels, models, expansionRules);
  expansionRuns = new ExpansionRuns(setup.page, plan, sequenceFilterName);

  const dictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
  await plan.addActivity('PeelBanana');
  await plan.showPanel(PanelNames.SIMULATION, true);
  await plan.runSimulation();

  await dictionaries.goto();
  await dictionaries.createCommandDictionary(dictionaryName, COMMAND_DICTIONARY_PATH);
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
  await teardownTest(setup);
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
    await setup.page.waitForSelector(`option:has-text("${expansionSets.expansionSetName}")`, {
      state: 'attached',
    });
    const value = await getOptionValueFromText(
      setup.page,
      'select[name="expansionSetId"]',
      expansionSets.expansionSetName,
    );
    await setup.page.locator('select[name="expansionSetId"]').focus();
    await setup.page.locator('select[name="expansionSetId"]').selectOption(value);
    await setup.page.locator('select[name="expansionSetId"]').evaluate(e => e.blur());
    await plan.createSequenceFilter(sequenceFilterName);
    await plan.applySequenceFilter(sequenceFilterName, plans.planId);
    const expansionSequenceItem = setup.page.locator('.sne-items').getByText(`${sequenceFilterName} Sequence`);
    await expansionSequenceItem.hover();
    await setup.page.getByLabel('Expand Sequence').waitFor({ state: 'visible' });
    await setup.page.getByLabel('Expand Sequence').click();
    await plan.waitForToast('Plan Expanded Successfully');
    await setup.page.getByLabel('Show Expanded Sequence').click();
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'attached' });
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'visible' });
    await setup.page.getByText('Loading Editor...').waitFor({ state: 'detached' });
    await expect(plan.sequenceExpansionOutputModal.getByText('steps')).toBeVisible();
    await expansionRuns.goto();
    await expansionRuns.selectSequence();
    await expansionRuns.waitForContents(`@ID "${sequenceFilterName}`);
  });
  test('Delete expansion rule', async () => {
    await expansionRules.deleteExpansionRule();
  });
});
