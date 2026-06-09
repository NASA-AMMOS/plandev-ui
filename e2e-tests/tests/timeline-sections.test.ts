import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { PanelNames } from '../fixtures/Plan.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await cleanupApiResources(setup);
  await closeBrowserResources(setup);
});

test.describe.serial('Timeline Collapsible Sections', () => {
  const sectionName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  // A row that lives inside a section in the timeline (not the editor list).
  const timelineSectionRow = () => setup.page.locator('.timeline-row-wrapper.timeline-row-in-section');
  // The section header rendered in the timeline.
  const sectionHeader = () => setup.page.getByRole('banner').filter({ hasText: sectionName });

  test('Add a section', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);

    const existingSectionCount = await setup.page.locator('.timeline-section').count();
    await setup.page.getByRole('button', { name: 'New Section' }).click();
    await expect(setup.page.locator('.timeline-section')).toHaveCount(existingSectionCount + 1);
  });

  test('Edit the section name via the section editor', async () => {
    // Open the section editor.
    await setup.page.getByRole('button', { name: 'Edit Section' }).click();

    // The back button indicates the section editor is active.
    await expect(setup.page.locator('.section-back-button').first()).toBeVisible();

    // Rename the section.
    await setup.page.locator('input[name="name"]').first().fill(sectionName);
    await setup.page.locator('input[name="name"]').first().blur();

    // The renamed section header should appear in the timeline.
    await expect(sectionHeader()).toBeVisible();

    // Return to the timeline editor.
    await setup.page.locator('.section-back-button').first().click();
  });

  test('Add a row to the section', async () => {
    await setup.page.getByRole('button', { name: 'Add Row to Section' }).click();

    // The new row should be nested under the section in the timeline.
    await expect(timelineSectionRow()).toHaveCount(1);
  });

  test('Collapse the section hides its rows', async () => {
    await sectionHeader().getByRole('button', { name: 'Collapse Section' }).click();
    await expect(timelineSectionRow()).toHaveCount(0);
  });

  test('Expand the section shows its rows again', async () => {
    await sectionHeader().getByRole('button', { name: 'Expand Section' }).click();
    await expect(timelineSectionRow()).toHaveCount(1);
  });

  test('Delete the section', async () => {
    const existingSectionCount = await setup.page.locator('.timeline-section').count();
    await setup.page.getByRole('button', { name: 'Delete Section' }).first().click();
    await expect(setup.page.locator('.timeline-section')).toHaveCount(existingSectionCount - 1);
  });
});
