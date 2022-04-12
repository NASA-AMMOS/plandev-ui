import { expect, test as base } from '@playwright/test';
import { ModelsPage } from '../fixtures/ModelsPage';
import { PlansPage } from '../fixtures/PlansPage';

const test = base.extend<{ modelsPage: ModelsPage; plansPage: PlansPage }>({
  modelsPage: async ({ page }, use) => {
    const modelsPage = new ModelsPage(page);
    await use(modelsPage);
  },
  plansPage: async ({ page }, use) => {
    const plansPage = new PlansPage(page);
    await use(plansPage);
  },
});

test.describe('Plans Page', () => {
  test.beforeEach(async ({ modelsPage, plansPage }) => {
    await modelsPage.goto();
    await modelsPage.createModel();
    await plansPage.goto();
  });

  test.afterEach(async ({ modelsPage }) => {
    await modelsPage.goto();
    await modelsPage.deleteModel();
  });

  test('Create plan button should be disabled with no errors', async ({ plansPage }) => {
    await expect(plansPage.alertError).not.toBeVisible();
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Clicking on a model on the models page should route you to the plans page with that model selected', async ({
    baseURL,
    modelsPage,
    page,
    plansPage,
  }) => {
    await modelsPage.goto();
    await modelsPage.tableRow.click();
    await expect(page).toHaveURL(`${baseURL}/plans`);
    const { text } = await plansPage.selectedModel();
    expect(text).toEqual(modelsPage.modelName);
  });

  test('Create plan button should be disabled after only entering a name', async ({ plansPage }) => {
    await plansPage.fillInputName();
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering a start time', async ({ plansPage }) => {
    await plansPage.fillInputStartTime();
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering an end time', async ({ plansPage }) => {
    await plansPage.fillInputEndTime();
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Entering an invalid start time should display an error, and the create button should be disabled', async ({
    plansPage,
  }) => {
    await plansPage.inputStartTime.fill('2022-');
    await plansPage.inputStartTime.evaluate(e => e.blur());
    await expect(plansPage.inputStartTime).toHaveClass(/error/);
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Entering an invalid end time should display an error, and the create button should be disabled', async ({
    plansPage,
  }) => {
    await plansPage.inputEndTime.fill('2022-');
    await plansPage.inputEndTime.evaluate(e => e.blur());
    await expect(plansPage.inputEndTime).toHaveClass(/error/);
    await expect(plansPage.createButton).toBeDisabled();
  });

  test('Create button should be enabled after selecting a model, entering a name, entering a start time, and entering an end time ', async ({
    modelsPage,
    plansPage,
  }) => {
    await plansPage.selectInputModel(modelsPage.modelName);
    await plansPage.fillInputName();
    await plansPage.fillInputStartTime();
    await plansPage.fillInputEndTime();
    await expect(plansPage.createButton).not.toBeDisabled();
  });

  test('Create and delete plan', async ({ modelsPage, plansPage }) => {
    await plansPage.createPlan(modelsPage.modelName);
    await plansPage.deletePlan();
  });
});
