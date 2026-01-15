import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Model } from '../fixtures/Model.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
let model: Model;
let schedulingGoalName: string;
let viewName: string;

const checkboxSelector = 'Press SPACE to toggle cell';

test.beforeAll(async ({ baseURL, browser }) => {
  setup = await setupTest(browser);
  model = new Model(setup.page, setup.models, setup.constraints, setup.schedulingGoals, setup.schedulingConditions);
  schedulingGoalName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  await setup.constraints.gotoNew();
  await setup.constraints.createConstraint(baseURL);
  await setup.schedulingConditions.gotoNew();
  await setup.schedulingConditions.createSchedulingCondition(baseURL);
  await setup.schedulingGoals.gotoNew();
  await setup.schedulingGoals.createSchedulingGoal(baseURL, schedulingGoalName);

  await setup.plan.goto();
  viewName = setup.view.createViewName();
  await setup.view.createView(viewName);
  await model.goto();
});

test.afterAll(async () => {
  await setup.plan.goto();
  await setup.view.deleteView(viewName);
  await cleanupApiResources(setup);
  await setup.constraints.goto();
  await setup.constraints.deleteConstraint();
  await setup.schedulingConditions.goto();
  await setup.schedulingConditions.deleteSchedulingCondition();
  await setup.schedulingGoals.goto();
  await setup.schedulingGoals.deleteSchedulingGoal(schedulingGoalName);
  await closeBrowserResources(setup);
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
    await expect(setup.page.getByRole('button', { name: model.constraints.constraintName })).toBeVisible();
    await expect(
      setup.page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox'),
    ).toHaveValue('');
    setup.page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox').selectOption('0');
    await expect(
      setup.page.getByRole('button', { name: model.constraints.constraintName }).getByRole('combobox'),
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
    await expect(setup.page.getByRole('button', { name: model.schedulingConditions.conditionName })).toBeVisible();
    await expect(
      setup.page.getByRole('button', { name: model.schedulingConditions.conditionName }).getByRole('combobox'),
    ).toHaveValue('');
    setup.page
      .getByRole('button', { name: model.schedulingConditions.conditionName })
      .getByRole('combobox')
      .selectOption('0');
    await expect(
      setup.page.getByRole('button', { name: model.schedulingConditions.conditionName }).getByRole('combobox'),
    ).toHaveValue('0');
  });

  test('Should be able to add a scheduling goal to the model and specify a version', async () => {
    await model.switchToGoals();
    await model.switchToLibraryView();
    await model.filterTable(schedulingGoalName);
    await model.associationTable.getByRole('row', { name: schedulingGoalName }).getByLabel(checkboxSelector).click();
    await model.switchToModelView();
    await expect(setup.page.getByRole('button', { name: schedulingGoalName })).toBeVisible();
    await expect(setup.page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox')).toHaveValue('');
    setup.page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox').selectOption('0');
    await expect(setup.page.getByRole('button', { name: schedulingGoalName }).getByRole('combobox')).toHaveValue('0');
  });

  test('Should successfully save the model changes', async () => {
    await model.saveModel();
  });
});
