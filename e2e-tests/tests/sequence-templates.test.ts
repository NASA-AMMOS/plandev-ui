import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { AppNav } from '../fixtures/AppNav.js';
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
const sequenceTemplateContent: string = '/C Example_Command "ARG1"';
const sequenceTemplateLanguage: string = 'Text';

let appNav: AppNav;
let context: BrowserContext;
let constraints: Constraints;
let sequenceTemplates: SequenceTemplates;
let dictionaries: Dictionaries;
let dictionaryName: string;
let models: Models;
let parcels: Parcels;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  appNav = new AppNav(page);

  models = new Models(page);
  await models.goto();
  await models.createModel(baseURL);

  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
  await plan.addActivity('PeelBanana');
  await plan.showPanel(PanelNames.SIMULATION, true);
  await plan.runSimulation();
  await page.waitForTimeout(1000); // wait for sim results

  dictionaries = new Dictionaries(page);
  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;

  parcels = new Parcels(page);
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);

  sequenceTemplates = new SequenceTemplates(page, parcels, models);
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

test.describe.serial('Sequence Templates', () => {
  test(`Clicking on the app menu 'Sequence Templates' option should route to the sequence templates page`, async ({
    baseURL,
  }) => {
    await appNav.appMenuButton.click();
    await appNav.appMenu.waitFor({ state: 'attached' });
    await appNav.appMenu.waitFor({ state: 'visible' });
    await appNav.appMenuItemSequenceTemplates.click();
    await expect(page).toHaveURL(`${baseURL}/sequence-templates`);
  });
  test('Create new sequence template', async () => {
    await sequenceTemplates.goto();
    await sequenceTemplates.createSequenceTemplate(sequenceTemplateName, sequenceTemplateLanguage);
  });
  test('Open and modify a sequence via form editor', async () => {
    await sequenceTemplates.goto();
    await sequenceTemplates.updateSequenceTemplate(sequenceTemplateName, sequenceTemplateContent);
  });
  test('Sequence Templating can be run', async () => {
    await plan.goto();
    await plan.showPanel(PanelNames.EXPANSION);
    await plan.createSequenceFilter(sequenceFilterName);
    await plan.applySequenceFilter(sequenceFilterName, plans.planId);
    const expansionSequenceItem = page.locator('.sne-items').getByText(`${sequenceFilterName} Sequence`);
    await expansionSequenceItem.hover();
    await page.getByLabel('Expand Sequence').click();
    await plan.waitForToast('Sequence Templating Successfully');
    await page.getByLabel('Show Expanded Sequence').click();
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'attached' });
    await plan.sequenceExpansionOutputModal.waitFor({ state: 'visible' });
    await page.getByText('Loading Editor...').waitFor({ state: 'detached' });
    await expect(plan.sequenceExpansionOutputModal.getByText(sequenceTemplateContent)).toBeVisible();
  });
  test('Delete a sequence template', async () => {
    await sequenceTemplates.goto();
    await sequenceTemplates.deleteSequenceTemplate(sequenceTemplateName);
  });
});
