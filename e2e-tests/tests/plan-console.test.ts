import test, { expect } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Plan error console', () => {
  test('All Problems aggregates BakeBananaBread validation errors', async () => {
    await setup.plan.waitForActivityCheckingStatus(Status.Complete);
    await setup.plan.addActivity('BakeBananaBread');
    await setup.plan.waitForActivityCheckingStatus(Status.Failed);

    // Open the console at the All Problems tab — clicking a tab always expands the pane.
    const allProblemsTab = setup.plan.consoleContainer.getByRole('tab', { name: /All Problems/ });
    await allProblemsTab.click();
    await expect(allProblemsTab).toHaveAttribute('data-state', 'active');

    // Validation errors for the new activity should be present.
    const tabPanel = setup.plan.consoleContainer.getByRole('tabpanel').first();
    await expect(tabPanel.getByText('BakeBananaBread').first()).toBeVisible();
  });

  test('Search filter narrows All Problems and shows the empty-state message', async () => {
    const search = setup.plan.consoleContainer.getByPlaceholder('Search');
    const tabPanel = setup.plan.consoleContainer.getByRole('tabpanel').first();

    await search.fill('BakeBananaBread');
    await expect(tabPanel.getByText('BakeBananaBread').first()).toBeVisible();

    await search.fill('definitely-no-such-error');
    await expect(tabPanel.getByText(/No matches/i).first()).toBeVisible();

    await search.fill('');
  });

  test('Expanding a row reveals its full timestamp', async () => {
    const tabPanel = setup.plan.consoleContainer.getByRole('tabpanel').first();
    const firstRow = tabPanel.locator('[data-index="0"]').first();
    const details = firstRow.locator('details');

    await expect(details).not.toHaveAttribute('open', '');
    await firstRow.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(firstRow.getByText(/Timestamp:/).first()).toBeVisible();

    // Collapse to leave clean state for the next test.
    await firstRow.locator('summary').click();
    await expect(details).not.toHaveAttribute('open', '');
  });

  test('Open row state survives scrolling out of view and back', async () => {
    // Bulk-create invalid activities via the API so the virtualized list is long
    // enough that the first row gets recycled out of the DOM when scrolled away.
    const bulk = Array.from({ length: 60 }, () =>
      setup.api.createActivityDirective({
        anchor_id: null,
        anchored_to_start: true,
        arguments: {},
        metadata: {},
        name: 'bad',
        plan_id: setup.planId,
        start_offset: 'PT0S',
        type: 'BakeBananaBread',
      }),
    );
    await Promise.all(bulk);
    await setup.plan.waitForActivityCheckingStatus(Status.Failed);

    // Wait for X/X in the activity-checking menu (matching numerator + denominator
    // via the backreference) — strongest signal that the full batch has validated.
    await setup.plan.hoverMenu(setup.plan.navButtonActivityChecking);
    await expect(setup.plan.navButtonActivityCheckingMenu).toContainText(/(\d+)\/\1 activities checked/, {
      timeout: 30_000,
    });

    // $allProblems regenerates `new Date()` timestamps on every derive, so
    // `[data-index="0"]` is unstable. Pin to a directive ID instead — the row's
    // message embeds it, so a hasText filter survives re-sorts and remounts.
    const allProblemsTab = setup.plan.consoleContainer.getByRole('tab', { name: /All Problems/ });
    await allProblemsTab.click();
    const tabPanel = setup.plan.consoleContainer.getByRole('tabpanel').first();
    const firstRowText = await tabPanel.locator('[data-index="0"]').first().textContent();
    const idMatch = firstRowText?.match(/Activity Directive (\d+)/);
    if (!idMatch) {
      throw new Error(`Could not extract directive ID from first row: ${firstRowText}`);
    }
    const targetRow = tabPanel.locator('details').filter({ hasText: `Activity Directive ${idMatch[1]} ` });

    await targetRow.locator('summary').click();
    await expect(targetRow).toHaveAttribute('open', '');

    // Scroll the virtualized list to the bottom and back. After the roundtrip the
    // targeted row must still be open — that's the contract `openIndices` keeps
    // when the virtualizer remounts a recycled row.
    const scrollContainer = tabPanel.getByTestId('console-logs-list');
    await scrollContainer.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await scrollContainer.evaluate(el => el.scrollTo(0, 0));
    await expect(targetRow).toHaveAttribute('open', '');
  });
});
