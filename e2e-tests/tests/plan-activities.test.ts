import test, { expect } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';
import { setFileInputByFilepath } from '../utilities/helpers.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterEach(async () => {
  await setup.plan.deleteAllActivities();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan Activities', () => {
  test('Deleting an activity directive with another directive anchored to it should and selecting re-anchor to plan should re-anchor to plan', async () => {
    await setup.plan.addActivity('GrowBanana');
    await setup.plan.addActivity('PickBanana');
    await setup.plan.addActivity('ThrowBanana');
    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'PickBanana' }).first().click();
    await setup.plan.panelActivityForm
      .getByRole('button', { name: 'Is Relative To Another Activity Directive' })
      .click();
    await setup.plan.selectActivityAnchorByIndex(1);

    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'GrowBanana' }).first().click();
    await setup.plan.panelActivityDirectivesTable.getByRole('button', { name: 'Delete Activity Directive' }).click();
    await setup.page.locator('.modal-content select').nth(1).selectOption('anchor-plan');
    await setup.page.getByRole('button', { name: 'Confirm' }).click();
    await setup.plan.panelActivityDirectivesTable
      .getByRole('row', { name: 'GrowBanana' })
      .waitFor({ state: 'detached', timeout: 2000 });
    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'PickBanana' }).first().click();
    await setup.plan.panelActivityForm
      .getByRole('button', { name: 'Is Relative To Another Activity Directive' })
      .click();
    await setup.page.waitForFunction(
      () => document.querySelector('.anchor-form .selected-display-value')?.innerHTML === 'To Plan',
    );

    await expect(setup.plan.panelActivityForm.getByRole('combobox', { name: 'To Plan' })).toBeVisible();
  });

  test('Deleting multiple activity directives but only 1 has a remaining anchored dependent should prompt for just the one with a remaining dependent', async () => {
    await setup.plan.addActivity('GrowBanana');
    await setup.plan.addActivity('PickBanana');
    await setup.plan.addActivity('ThrowBanana');
    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'PickBanana' }).first().click();
    await setup.plan.panelActivityForm
      .getByRole('button', { name: 'Is Relative To Another Activity Directive' })
      .click();
    await setup.plan.selectActivityAnchorByIndex(1);

    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'ThrowBanana' }).first().click();
    await setup.plan.selectActivityAnchorByIndex(2);

    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'GrowBanana' }).first().click();
    await setup.plan.panelActivityDirectivesTable
      .getByRole('row', { name: 'PickBanana' })
      .first()
      .click({
        modifiers: ['Meta'],
      });
    await setup.plan.panelActivityDirectivesTable.getByRole('row', { name: 'GrowBanana' }).first().click({
      button: 'right',
    });
    await setup.page.getByText('Delete 2 Activity Directives').click();
    await expect(setup.page.locator('.modal-content .anchor-item')).toHaveCount(1);
    await setup.page.locator('.modal-content select').nth(1).selectOption('anchor-root');
    await setup.page.getByRole('button', { name: 'Confirm' }).click();
  });

  test('Setting an input path successfully uploads the corresponding file', async () => {
    await setup.plan.addActivity('LineCount');

    await setFileInputByFilepath(
      setup.page,
      setup.page.locator('input[type="file"]'),
      './e2e-tests/data/valid-view.json',
    );

    const errorBadge = await setup.page.locator('.input-error-badge-root');

    expect(errorBadge).not.toBeAttached();
  });

  test('Activity validation is run when activities are changed and is resolvable', async () => {
    await setup.plan.waitForActivityCheckingStatus(Status.Complete);
    await setup.plan.hoverMenu(setup.plan.navButtonActivityChecking);
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('0/0 activities checked');
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
    await setup.plan.addActivity('GrowBanana');
    await setup.plan.addActivity('GrowBanana');
    await setup.plan.waitForActivityCheckingStatus(Status.Complete);
    await setup.plan.hoverMenu(setup.plan.navButtonActivityChecking);
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('2/2 activities checked');
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
    await setup.plan.addActivity('BakeBananaBread');
    await setup.plan.waitForActivityCheckingStatus(Status.Failed);
    await setup.plan.hoverMenu(setup.plan.navButtonActivityChecking);
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('3/3 activities checked');
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('1 activity has problems');
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('2 missing parameters');
    await setup.plan.navButtonActivityCheckingMenu.getByRole('button', { name: 'View in console' }).click();
    await setup.plan.consoleContainer.getByRole('tab', { name: 'Activity Validation' }).first().click();
    await setup.plan.consoleContainer
      .getByRole('tabpanel')
      .first()
      .getByRole('row', { name: 'BakeBananaBread' })
      .first()
      .click();
    const tbSugar = setup.plan.panelActivityForm.locator('.parameter', { hasText: 'tbSugar' }).locator('input');
    await tbSugar.fill('100');
    await tbSugar.evaluate(e => e.blur());
    await expect(
      setup.plan.panelActivityForm
        .locator('.parameter', { hasText: 'tbSugar' })
        .getByLabel('Parameter not explicitly set'),
    ).not.toBeVisible();
    await setup.plan.panelActivityForm.locator('.parameter', { hasText: 'glutenFree' }).getByRole('checkbox').click();
    await expect(
      setup.plan.panelActivityForm
        .locator('.parameter', { hasText: 'glutenFree' })
        .getByLabel('Parameter not explicitly set'),
    ).not.toBeVisible();
    await setup.plan.waitForActivityCheckingStatus(Status.Complete);
    await setup.plan.hoverMenu(setup.plan.navButtonActivityChecking);
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('3/3 activities checked');
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText('No problems detected');
  });
});
