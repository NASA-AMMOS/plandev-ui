import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan Resources', () => {
  test('Uploading external plan dataset file - JSON', async () => {
    await setup.plan.uploadExternalDatasets('e2e-tests/data/external-dataset.json');
    await expect(setup.plan.panelActivityTypes.getByText('/awake')).toBeVisible();
    await expect(setup.plan.panelActivityTypes.getByText('/batteryEnergy')).toBeVisible();
  });

  test('Uploading external plan dataset file - CSV', async () => {
    await setup.plan.uploadExternalDatasets('e2e-tests/data/external-dataset.csv');
    await expect(setup.plan.panelActivityTypes.getByText('TotalPower')).toBeVisible();
    await expect(setup.plan.panelActivityTypes.getByText('BatteryStateOfCharge')).toBeVisible();
    await expect(setup.plan.panelActivityTypes.getByText('Temperature')).toBeVisible();
  });
});
