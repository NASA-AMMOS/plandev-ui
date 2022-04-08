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
});
