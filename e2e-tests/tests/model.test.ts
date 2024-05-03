import test, { expect, type BrowserContext, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Constraints } from '../fixtures/Constraints.js';
import { Model } from '../fixtures/Model.js';
import { Models } from '../fixtures/Models.js';
import { SchedulingConditions } from '../fixtures/SchedulingConditions.js';
import { SchedulingGoals } from '../fixtures/SchedulingGoals.js';

let constraints: Constraints;
let context: BrowserContext;
let models: Models;
let model: Model;
let page: Page;
let schedulingConditions: SchedulingConditions;
let schedulingGoals: SchedulingGoals;
let schedulingGoalName: string;

const checkboxSelector = 'Press SPACE to toggle cell';

test.beforeAll(async ({ baseURL, browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  constraints = new Constraints(page);
  schedulingConditions = new SchedulingConditions(page);
  schedulingGoals = new SchedulingGoals(page);
  model = new Model(page, models, constraints, schedulingGoals, schedulingConditions);
  schedulingGoalName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  await constraints.gotoNew();
  await constraints.createConstraint(baseURL);
  await schedulingConditions.gotoNew();
  await schedulingConditions.createSchedulingCondition(baseURL);
  await schedulingGoals.gotoNew();
  await schedulingGoals.createSchedulingGoal(baseURL, schedulingGoalName);
  await models.goto();
  await models.createModel();
  await model.goto();
});

test.afterAll(async () => {
  await model.deleteModel();
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

  test('Should be able to add a constraint to the model and specify a version', async () => {
    await model.switchToConstraints();
    await model.switchToLibraryView();
    await model.switchToLibraryView();
    await model.associationTable
      .getByRole('row', { name: model.constraints.constraintName })
      .getByLabel(checkboxSelector)
      .check();
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
    await model.associationTable
      .getByRole('row', { name: model.schedulingConditions.conditionName })
      .getByLabel(checkboxSelector)
      .check();
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
    await model.associationTable.getByRole('row', { name: schedulingGoalName }).getByLabel(checkboxSelector).check();
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
