import { Models } from '../fixtures/Models.js';
import { Plans } from '../fixtures/Plans.js';
import { expect, test, type BrowserContext, type Page } from '../fixtures/PlaywrightTest.js';

let context: BrowserContext;
let models: Models;
let page: Page;
let plans: Plans;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();

  models = new Models(page);
  plans = new Plans(page, models);

  await models.goto();
  await models.createModel();
});

test.afterAll(async () => {
  await models.goto();
  await models.deleteModel();
  await page.close();
  await context.close();
});

test.describe.serial('Plans', () => {
  test.beforeEach(async () => {
    await plans.goto();
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
    await page.keyboard.press('Tab');
    await expect(plans.inputStartTime).toHaveClass(/error/);
    await expect(plans.createButton).toBeDisabled();
  });

  test('Entering an invalid end time should display an error, and the create button should be disabled', async () => {
    await plans.inputEndTime.fill('2022-');
    await page.keyboard.press('Tab');
    await expect(plans.inputEndTime).toHaveClass(/error/);
    await expect(plans.createButton).toBeDisabled();
  });

  test('Entering a valid start and end time should display the appropriate duration text', async () => {
    await plans.fillInputStartTime();
    await plans.fillInputEndTime();
    await expect(plans.durationDisplay).toHaveValue('5d');
  });

  test('Entering a valid start should prepopulate the end time correctly', async () => {
    await plans.fillInputStartTime();

    const endTime = await plans.inputEndTime.inputValue();
    expect(endTime).toEqual(plans.startTime);
  });

  test('Entering an invalid start should not prepopulate the end time', async () => {
    await plans.inputStartTime.fill('2022-');
    await page.keyboard.press('Tab');

    const endTime = await plans.inputEndTime.inputValue();
    expect(endTime).toEqual('');
  });

  test('Entering an invalid start time should display "None" in the duration text', async () => {
    await plans.inputStartTime.fill('2022-');
    await page.keyboard.press('Tab');
    await plans.fillInputEndTime();
    await expect(plans.durationDisplay).toHaveValue('None');
  });

  test('Entering an invalid end time should display "None" in the duration text', async () => {
    await plans.fillInputStartTime();
    await plans.inputEndTime.fill('2022-');
    await page.keyboard.press('Tab');
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
