import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type ModelSetupResult } from '../utilities/api.js';

let setup: ModelSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser, { plan: false });
});

test.afterAll(async () => {
  await teardownTest(setup);
});

// Form validation tests - independent, can run in parallel
test.describe('Plans - Form Validation', () => {
  test.beforeEach(async () => {
    await setup.plans.goto();
  });

  test('Create plan button should be disabled with no errors', async () => {
    await expect(setup.plans.alertError).not.toBeVisible();
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Clicking on the "New plan with model" button should route you to the plans page with that model selected', async ({
    baseURL,
  }) => {
    await setup.models.goto();
    await setup.models.filterTable(setup.models.modelName);
    await setup.models.tableRow().click();
    await setup.models.createPlanButton.click();
    await expect(setup.page).toHaveURL(`${baseURL}/plans`);
    const text = await setup.plans.selectedModel();
    expect(text).toEqual(`${setup.models.modelName} (Version: ${setup.models.modelVersion})`);
  });

  test('Create plan button should be disabled after only entering a name', async () => {
    await setup.plans.fillInputName();
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering a start time', async () => {
    await setup.plans.fillInputStartTime();
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering an end time', async () => {
    await setup.plans.fillInputEndTime();
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Entering an invalid start time should display an error, and the create button should be disabled', async () => {
    await setup.plans.inputStartTime.fill('2022-');
    await setup.page.keyboard.press('Tab');
    await expect(setup.plans.inputStartTime).toHaveAttribute('aria-invalid', 'true');
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Entering an invalid end time should display an error, and the create button should be disabled', async () => {
    await setup.plans.inputEndTime.fill('2022-');
    await setup.page.keyboard.press('Tab');
    await expect(setup.plans.inputEndTime).toHaveAttribute('aria-invalid', 'true');
    await expect(setup.plans.createButton).toBeDisabled();
  });

  test('Entering a valid start and end time should display the appropriate duration text', async () => {
    await setup.plans.fillInputStartTime();
    await setup.plans.fillInputEndTime();
    await expect(setup.plans.durationDisplay).toHaveValue('5d');
  });

  test('Entering a valid start should prepopulate the end time correctly', async () => {
    await setup.plans.fillInputStartTime();

    const endTime = await setup.plans.inputEndTime.inputValue();
    expect(endTime).toEqual('2022-002T00:00:00');
  });

  test('Entering an invalid start should not prepopulate the end time', async () => {
    await setup.plans.inputStartTime.fill('2022-');
    await setup.page.keyboard.press('Tab');

    const endTime = await setup.plans.inputEndTime.inputValue();
    expect(endTime).toEqual('');
  });

  test('Entering an invalid start time should display "None" in the duration text', async () => {
    await setup.plans.inputStartTime.fill('2022-');
    await setup.page.keyboard.press('Tab');
    await setup.plans.fillInputEndTime();
    await expect(setup.plans.durationDisplay).toHaveValue('None');
  });

  test('Entering an invalid end time should display "None" in the duration text', async () => {
    await setup.plans.fillInputStartTime();
    await setup.plans.inputEndTime.fill('2022-');
    await setup.page.keyboard.press('Tab');
    await expect(setup.plans.durationDisplay).toHaveValue('None');
  });

  test('Create button should be enabled after selecting a model, entering a name, entering a start time, and entering an end time ', async () => {
    await setup.plans.selectInputModel();
    await setup.plans.fillInputName();
    await setup.plans.fillInputStartTime();
    await setup.plans.fillInputEndTime();
    await expect(setup.plans.createButton).not.toBeDisabled();
  });
});

// CRUD operations - dependent, must run serially
test.describe.serial('Plans - CRUD Operations', () => {
  test('Create plan', async () => {
    await setup.plans.goto();
    await setup.plans.createPlan();
  });

  test('Delete plan', async () => {
    await setup.plans.deletePlan();
  });

  test('Import plan', async () => {
    await setup.plans.goto();
    await setup.plans.importPlan();
    await setup.plans.deletePlan();
  });
});
