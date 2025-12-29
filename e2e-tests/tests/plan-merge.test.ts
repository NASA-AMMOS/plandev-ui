import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan Merge', () => {
  const newActivityStartTime: string = '2022-005T00:00:00';
  const planBranchName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test('Add an activity to the parent plan', async () => {
    await setup.plan.addActivity('BiteBanana');
  });

  test('Create a branch', async ({ baseURL }) => {
    await setup.plan.createBranch(baseURL, planBranchName);
  });

  test('Change the start time of the activity on the branch', async () => {
    await setup.page.waitForTimeout(2000);
    const row = await setup.page.getByRole('row', { name: 'BiteBanana' });
    await row.waitFor({ state: 'visible' });
    await row.first().click();
    await setup.page.waitForSelector('.activity-header-title-edit-button:has-text("BiteBanana")', {
      state: 'visible',
    });
    await setup.page.locator('input[name="start-time"]').click({ position: { x: 2, y: 2 } });
    await setup.page.locator('input[name="start-time"]').fill(newActivityStartTime);
    await setup.page.locator('input[name="start-time"]').press('Enter');
    await setup.plan.waitForToast('Activity Directive Updated Successfully');
  });

  test('Create a merge request from branch to parent plan', async () => {
    await setup.page.getByText(planBranchName).first().click();
    await setup.page.getByText('Create merge request').click();
    await setup.page.getByRole('button', { name: 'Create Merge Request' }).click();
    await setup.plan.waitForToast('Merge Request Created Successfully');
  });

  test('Switch to parent plan', async () => {
    await setup.page.getByRole('link', { name: setup.plans.planName }).click();
  });

  test('Start a merge review', async ({ baseURL }) => {
    await setup.page.getByRole('button', { name: '1 incoming, 0 outgoing' }).click();
    await setup.page.getByRole('button', { name: 'Review' }).click();
    await setup.page.waitForURL(`${baseURL}/plans/*/merge`);
    await setup.page.waitForTimeout(250);
  });

  test('Complete the merge review', async ({ baseURL }) => {
    await setup.page.getByRole('button', { name: 'Approve Changes' }).click();
    await setup.page.waitForURL(`${baseURL}/plans/${setup.plans.planId}/merge`);
    await setup.page.waitForTimeout(250);
  });

  test('Make sure the start time of the activity in the parent plan now equals the start time of the activity in branch', async () => {
    await setup.page.getByRole('gridcell', { name: 'BiteBanana' }).first().click();
    await expect(setup.page.locator('input[name="start-time"]')).toHaveValue(newActivityStartTime);
  });
});

test.describe.serial('Plan Merge with Deleted Source Plan', () => {
  const newActivityStartTime: string = '2022-005T00:00:00';
  const planBranchName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test('Add an activity to the parent plan', async () => {
    await setup.plan.addActivity('GrowBanana');
  });

  test('Create a branch', async ({ baseURL }) => {
    await setup.plan.createBranch(baseURL, planBranchName);
  });

  test('Change the start time of the activity on the branch', async () => {
    await setup.page.waitForTimeout(2000);
    const row = await setup.page.getByRole('row', { name: 'GrowBanana' });
    await row.waitFor({ state: 'visible' });
    await row.first().click();
    await setup.page.waitForSelector('.activity-header-title-edit-button:has-text("GrowBanana")', {
      state: 'visible',
    });
    await setup.page.locator('input[name="start-time"]').click({ position: { x: 2, y: 2 } });
    await setup.page.locator('input[name="start-time"]').fill(newActivityStartTime);
    await setup.page.locator('input[name="start-time"]').press('Enter');
    await setup.plan.waitForToast('Activity Directive Updated Successfully');
  });

  test('Create a merge request from branch to parent plan', async () => {
    await setup.page.getByText(planBranchName).first().click();
    await setup.page.getByText('Create merge request').click();
    await setup.page.getByRole('button', { name: 'Create Merge Request' }).click();
    await setup.plan.waitForToast('Merge Request Created Successfully');
  });

  test('Delete source plan', async () => {
    await setup.plans.goto();
    await setup.plans.deletePlan(planBranchName);
  });

  test('Switch to parent plan', async () => {
    await setup.plan.goto();
  });

  test('Start a merge review', async ({ baseURL }) => {
    await setup.page.getByRole('button', { name: '1 incoming, 0 outgoing' }).click();
    await setup.page.getByRole('button', { name: 'Review' }).click();
    await setup.page.waitForURL(`${baseURL}/plans/*/merge`);
    await setup.page.waitForTimeout(250);
  });

  test('Complete the merge review', async ({ baseURL }) => {
    await setup.page.getByRole('button', { name: 'Approve Changes' }).click();
    await setup.page.waitForURL(`${baseURL}/plans/${setup.plans.planId}/merge`);
    await setup.page.waitForTimeout(250);
  });

  test('Make sure the start time of the activity in the parent plan now equals the start time of the activity in branch', async () => {
    await setup.page.getByRole('gridcell', { name: 'GrowBanana' }).first().click();
    await expect(setup.page.locator('input[name="start-time"]')).toHaveValue(newActivityStartTime);
  });
});
