import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();

  await setup.plan.addActivityByDragAndDrop('GrowBanana');
  await setup.plan.panelActivityDirectivesTable.getByRole('gridcell', { name: 'GrowBanana' }).first().click();

  await setup.plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').fill('2');
  await setup.plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').blur();

  await setup.plan.fillActivityPresetName('Preset 1');

  await setup.plan.panelActivityForm.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();
  await setup.plan.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'detached' });

  await setup.plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').fill('12');
  await setup.plan.panelActivityForm.locator('.parameter-base-number input[type="number"]').blur();

  await setup.plan.fillActivityPresetName('Preset 2');

  await setup.plan.panelActivityForm.getByRole('button', { name: 'Enter a unique name for the new preset' }).click();
  await setup.plan.panelActivityForm.locator('.dropdown-header').waitFor({ state: 'detached' });

  await setup.page.waitForFunction(
    () => document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === 'Preset 2',
  );

  await setup.plan.selectActivityPresetByName('None');

  await expect(setup.plan.panelActivityForm.getByRole('combobox', { name: 'None' })).toBeVisible();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan Activity Presets', () => {
  test(`Setting a preset to a directive should update the parameter values`, async () => {
    await setup.plan.selectActivityPresetByName('Preset 1');
    await expect(setup.page.getByRole('combobox', { name: 'Preset 1' })).toBeVisible();
  });

  test(`Removing an activity preset from a directive should reflect that it is no longer present`, async () => {
    await setup.plan.selectActivityPresetByName('None');
    await expect(setup.page.getByRole('combobox', { name: 'None' })).toBeVisible();
  });

  test('Deleting an activity preset should remove it from the list of presets', async () => {
    await setup.plan.selectActivityPresetByName('Preset 1');

    await setup.page.getByRole('combobox', { name: 'Preset 1' }).click();

    await setup.page.getByRole('button', { name: 'Delete preset' }).waitFor({ state: 'attached' });
    await setup.page.getByRole('button', { name: 'Delete preset' }).click();
    await setup.page.getByRole('button', { name: 'Delete preset' }).waitFor({ state: 'detached' });

    await setup.page.locator('.modal').waitFor({ state: 'attached' });
    await setup.page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    await setup.page.waitForFunction(
      () => document.querySelector('.activity-preset-input-container .selected-display-value')?.innerHTML === 'None',
    );

    await expect(setup.page.getByRole('combobox', { name: 'None' })).toBeVisible();
  });
});
