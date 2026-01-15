import test, { expect } from '@playwright/test';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();

  await setup.plan.showPanel(PanelNames.SIMULATION, true);

  await setup.plan.addActivity('child');
  await setup.page.getByRole('button', { name: 'Simulate' }).click();

  await setup.plan.panelSimulation.locator('.parameter-base-number input[type="number"]').first().fill('199');
  await setup.plan.panelSimulation.locator('.parameter-base-number input[type="number"]').first().blur();

  await setup.plan.fillSimulationTemplateName('Template 1');

  await setup.plan.panelSimulation.getByRole('button', { name: 'Enter a unique name for the new template' }).click();
  await setup.plan.panelSimulation.locator('.dropdown-header').waitFor({ state: 'detached' });

  await setup.page.waitForFunction(() => document.querySelector('.selected-display-value')?.innerHTML === 'Template 1');

  await setup.plan.panelSimulation.locator('.parameter-base-number input[type="number"]').first().fill('120');
  await setup.plan.panelSimulation.locator('.parameter-base-number input[type="number"]').first().blur();

  await setup.plan.fillSimulationTemplateName('Template 2');

  await setup.plan.panelSimulation.getByRole('button', { name: 'Enter a unique name for the new template' }).click();
  await setup.plan.panelSimulation.locator('.dropdown-header').waitFor({ state: 'detached' });

  await setup.page.waitForFunction(() => document.querySelector('.selected-display-value')?.innerHTML === 'Template 2');

  await setup.plan.selectSimulationTemplateByName('None');

  await expect(setup.page.getByRole('combobox', { name: 'None' })).toBeVisible();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan Simulation Templates', async () => {
  test(`Setting a simulation template to a simulation should update the parameter values`, async () => {
    await setup.plan.selectSimulationTemplateByName('Template 1');

    await expect(setup.plan.panelSimulation.getByRole('combobox', { name: 'Template 1' })).toBeVisible();
  });

  test(`Removing an simulation template from a simulation should reflect that it is no longer present`, async () => {
    await setup.plan.selectSimulationTemplateByName('None');

    await expect(setup.page.getByRole('combobox', { name: 'None' })).toBeVisible();
  });

  test('Deleting an simulation template should remove it from the list of templates', async () => {
    await setup.plan.selectSimulationTemplateByName('Template 1');

    await setup.page.getByRole('combobox', { name: 'Template 1' }).click();

    await setup.page.getByRole('button', { name: 'Delete Template' }).waitFor({ state: 'attached' });
    await setup.page.getByRole('button', { name: 'Delete Template' }).click();
    await setup.page.getByRole('button', { name: 'Delete Template' }).waitFor({ state: 'detached' });

    await setup.page.locator('.modal').waitFor({ state: 'attached' });
    await setup.page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    await setup.page.waitForFunction(() => document.querySelector('.selected-display-value')?.innerHTML === 'None');

    await expect(setup.page.getByRole('combobox', { name: 'None' })).toBeVisible();
  });
});
