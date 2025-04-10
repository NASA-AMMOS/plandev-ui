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

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const expansionSequenceName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

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

  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);
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

test.describe.serial('Plan Expansion', () => {
  test('Expansion Sequence can be created', async () => {
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.EXPANSION);
    await plan.sequenceExpansionNewButton.click();
    await plan.sequenceExpansionNewSequenceButton.click();
    await plan.sequenceExpansionNewSequenceName.fill(expansionSequenceName);
    await plan.sequenceExpansionNewSequenceConfirmButton.click();
    await plan.waitForToast('Expansion Sequence Created Successfully');
    await expect(page.locator('.sne-items').getByText(expansionSequenceName, { exact: true })).toBeVisible();
  });
  test('Sequence Filter can be created', async () => {
    await plan.showPanel(PanelNames.SIMULATION, true);
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.EXPANSION);
    await plan.createSequenceFilter(sequenceFilterName);
  });
  test('Sequence Filter can be applied to a plan', async () => {
    await plan.addActivity('PeelBanana');
    await plan.showPanel(PanelNames.SIMULATION, true);
    await plan.runSimulation();
    await page.waitForTimeout(1000); // wait for sim results
    await plan.showPanel(PanelNames.EXPANSION);
    await plan.applySequenceFilter(sequenceFilterName, plans.planId);
  });
});
