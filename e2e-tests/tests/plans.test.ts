import { expect, test, type Page } from '@playwright/test';
import { Models } from '../fixtures/Models.js';
import { Plans } from '../fixtures/Plans.js';

let models: Models;
let page: Page;
let plans: Plans;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();

  models = new Models(page);
  plans = new Plans(page, models);

  await models.goto();
  await models.createModel();
  await plans.goto();
});

test.afterAll(async () => {
  await models.goto();
  await models.deleteModel();
  await page.close();
});

test.describe.serial('Plans', () => {
  test.beforeEach(async () => {
    await page.reload();
  });

  test('Create plan button should be disabled with no errors', async () => {
    await expect(plans.alertError).not.toBeVisible();
    await expect(plans.createButton).toBeDisabled();
  });

  test('Clicking on a model on the models page should route you to the plans page with that model selected', async ({
    baseURL,
  }) => {
    await models.goto();
    await models.tableRow.click();
    await expect(page).toHaveURL(`${baseURL}/plans`);
    const { text } = await plans.selectedModel();
    expect(text).toEqual(models.modelName);
  });

  test('Create plan button should be disabled after only entering a name', async () => {
    await plans.fillInputName();
    await expect(plans.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering a start time', async () => {
    await plans.fillInputStartTime();
    await expect(plans.createButton).toBeDisabled();
  });

  test('Create plan button should be disabled after only entering an end time', async () => {
    await plans.fillInputEndTime();
    await expect(plans.createButton).toBeDisabled();
  });

  test('Entering an invalid start time should display an error, and the create button should be disabled', async () => {
    await plans.inputStartTime.fill('2022-');
    await plans.inputStartTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await plans.inputStartTime.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await expect(plans.inputStartTime).toHaveClass(/error/);
    await expect(plans.createButton).toBeDisabled();
  });

  test('Entering an invalid end time should display an error, and the create button should be disabled', async () => {
    await plans.inputEndTime.fill('2022-');
    await plans.inputEndTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await plans.inputEndTime.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await expect(plans.inputEndTime).toHaveClass(/error/);
    await expect(plans.createButton).toBeDisabled();
  });

  test('Entering a valid start and end time should display the appropriate duration text', async () => {
    await plans.fillInputStartTime();
    await plans.fillInputEndTime();
    await expect(plans.durationDisplay).toHaveValue('5d');
  });

  test('Entering an invalid start time should display "None" in the duration text', async () => {
    await plans.inputStartTime.fill('2022-');
    await plans.inputStartTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await plans.inputStartTime.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await plans.fillInputEndTime();
    await expect(plans.durationDisplay).toHaveValue('None');
  });

  test('Entering an invalid end time should display "None" in the duration text', async () => {
    await plans.fillInputStartTime();
    await plans.inputEndTime.fill('2022-');
    await plans.inputEndTime.evaluate(e => e.dispatchEvent(new Event('change')));
    await plans.inputEndTime.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await expect(plans.durationDisplay).toHaveValue('None');
  });

  test('Create button should be enabled after selecting a model, entering a name, entering a start time, and entering an end time ', async () => {
    await plans.selectInputModel();
    await plans.fillInputName();
    await plans.fillInputStartTime();
    await plans.fillInputEndTime();
    await expect(plans.createButton).not.toBeDisabled();
  });

  test('Create plan', async () => {
    await plans.createPlan();
  });

  test('Delete plan', async () => {
    await plans.deletePlan();
  });
});
