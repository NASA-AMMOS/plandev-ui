import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Model } from '../fixtures/Model.js';
import { Models } from '../fixtures/Models.js';
import { Plan } from '../fixtures/Plan.js';
import { Plans } from '../fixtures/Plans.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';
import { View } from '../fixtures/View.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let model: Model;
let page: Page;
let plan: Plan;
let plans: Plans;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let schedulingGoalName: string;
let view: View;
let viewName: string;

const checkboxSelector = 'Press SPACE to toggle cell';

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  plan = new Plan(page, plans, constraints, schedulingGoals, schedulingConditions);
  view = new View(page);
  model = new Model(page, models, constraints, schedulingGoals, schedulingConditions);
  schedulingGoalName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  await constraints.gotoNew();
  await constraints.createConstraint(baseURL);
  await schedulingConditions.gotoNew();
  await schedulingConditions.createSchedulingCondition(baseURL);
  await schedulingGoals.gotoNew();
  await schedulingGoals.createSchedulingGoal(baseURL, schedulingGoalName);
  await models.goto();
  await models.createModel(baseURL);
  await plans.goto();
  await plans.createPlan();
  await plan.goto();
  viewName = view.createViewName();
  await view.createView(viewName);
  await model.goto();
});

test.afterAll(async () => {
  await plan.goto();
  await view.deleteView(viewName);
  await plans.goto();
  await plans.deletePlan();
  await models.goto();
  await models.deleteModel();
  await constraints.goto();
  await constraints.deleteConstraint();
  await schedulingConditions.goto();
  await schedulingConditions.deleteSchedulingCondition();
  await schedulingGoals.goto();
  await schedulingGoals.deleteSchedulingGoal(schedulingGoalName);
  await page.close();
  await context.close();
});

test.describe.serial('Model', () => {
  test('Should be able to update the name of a model', async () => {
    await model.updateName(uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }));
  });

  test('Should be able to update the description of a model', async () => {
    await model.updateDescription('Description of the model');
  });

  test('Should be able to update the version of a model', async () => {
    await model.updateVersion('2.0.0');
  });

  test('Should be able to update the default view for a model', async () => {
    await model.updateDefaultView(viewName);
  });

  test('Should be able to add a constraint to the model and specify a version', async () => {
    await model.switchToConstraints();
    await model.switchToLibraryView();
    await model.filterTable(model.constraints.constraintName);
    await model.associationTable
      .getByRole('row', { name: model.constraints.constraintName })
      .getByLabel(checkboxSelector)
      .click();
    await model.switchToModelView();
    await expect(page.getByRole('button', { name: model.constraints.constraintName })).toBeVisible();
    await expect(
      page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox'),
    ).toHaveValue('');
    page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox').selectOption('0');
    await expect(
      page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox'),
    ).toHaveValue('0');
  });

  test('Should be able to add a scheduling condition to the model and specify a version', async () => {
    await model.switchToConditions();
    await model.switchToLibraryView();
    await model.filterTable(model.schedulingConditions.conditionName);
    await model.associationTable
      .getByRole('row', { name: model.schedulingConditions.conditionName })
      .getByLabel(checkboxSelector)
      .click();
    await model.switchToModelView();
    await expect(page.getByRole('button', { name: model.schedulingConditions.conditionName })).toBeVisible();
    await expect(
      page.getByRole('button', { name: model.schedulingConditions.conditionName }).getByRole('combobox'),
    ).toHaveValue('');
    page
      .getByRole('button', { name: model.schedulingConditions.conditionName })
      .getByRole('combobox')
      .selectOption('0');
    await expect(
      page.getByRole('button', { name: model.schedulingConditions.conditionName }).getByRole('combobox'),
    ).toHaveValue('0');
  });

  test('Should be able to add a scheduling goal to the model and specify a version', async () => {
    await model.switchToGoals();
    await model.switchToLibraryView();
    await model.filterTable(schedulingGoalName);
    await model.associationTable.getByRole('row', { name: schedulingGoalName }).getByLabel(checkboxSelector).click();
    await model.switchToModelView();
    await expect(page.getByRole('button', { name: schedulingGoalName })).toBeVisible();
    await expect(page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox')).toHaveValue('');
    page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox').selectOption('0');
    await expect(page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox')).toHaveValue('0');
  });

  test('Should successfully save the model changes', async () => {
    await model.saveModel();
  });
});
