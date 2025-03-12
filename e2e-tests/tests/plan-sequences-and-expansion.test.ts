import test, { type BrowserContext, type Page } from '@playwright/test';
import { Constraints } from '../fixtures/Constraints.js';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Models } from '../fixtures/Models.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames, Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { SequenceTemplates } from '../fixtures/SequenceTemplates.js';

const sequenceTemplateName: string = 'Test Template';
const sequenceTemplateLanguage: string = 'TEXT';

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
  await sequenceTemplates.goto();
  await sequenceTemplates.deleteSequenceTemplate(sequenceTemplateName);
  await page.close();
  await context.close();
});

test.beforeEach(async () => {
  await plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan External Sources', () => {
  test('Expansion Sequence can be created', async () => {
    await plan.showPanel(PanelNames.SEQUENCES_AND_EXPANSION);
    await plan.runSimulation();
    await plan.sequenceExpansionNewButton.click();
    await plan.sequenceExpansionNewSequenceButton.click();
    await plan.sequenceExpansionNewSequenceName.fill(sequenceTemplateName);
    await plan.sequenceExpansionNewSequenceConfirmButton.click();
    // await plan.waitForToast()
  });
  // test('Sequence Filter can be created', async () => {});
  // test('Sequence Filter can be applied to a plan', async () => {});
  // test('Sequence expansion output can be viewed', async () => {});
  // test('Command Expansion can be ran', async () => {});
  // test('Sequence Templating can be run', async () => {});
});
