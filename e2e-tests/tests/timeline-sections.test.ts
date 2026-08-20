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

  // Every section in the editor list has one Edit button, so counting them counts the sections.
  const editorSections = () => setup.page.getByRole('button', { name: 'Edit Section' });
  // A section and its rows are one named group; every row renders a header.
  const sectionGroup = () => setup.page.getByRole('group', { name: sectionName });
  const sectionRows = () => sectionGroup().getByRole('banner');
  // The colored band alone, as opposed to the group of band plus rows.
  const sectionBand = () => sectionGroup().getByRole('toolbar', { name: `${sectionName} controls` });
  const timelineRows = () => setup.page.getByRole('banner');

  test('Add a section', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);

    const existingSectionCount = await editorSections().count();
    await setup.page.getByRole('button', { name: 'New Section' }).click();
    await expect(editorSections()).toHaveCount(existingSectionCount + 1);
  });

  test('Edit the section name via the section editor', async () => {
    await editorSections().last().click();

    // The Section Name field only exists once the section editor is active.
    const nameField = setup.page.getByLabel('Section Name');
    await expect(nameField).toBeVisible();

    await nameField.fill(sectionName);
    await nameField.blur();

    // The renamed section should appear in the timeline.
    await expect(sectionGroup()).toBeVisible();

    // Return to the timeline editor.
    await setup.page.getByRole('button', { name: /Back to Timeline/ }).click();
  });

  test('Drag a row into the empty section', async () => {
    // An empty section has only its placeholder to drop onto; the header's own drop band is a
    // few pixels tall.
    await setup.page.getByRole('button', { exact: true, name: 'New Row' }).click();

    const placeholder = sectionGroup().getByText('Drag a row here');
    await expect(placeholder).toBeVisible();

    // A row drag starts only from its title or handle, and canDrag hit-tests for the class - so
    // this one selector cannot be expressed as a role.
    const rootRowTitle = setup.page
      .locator('.timeline-row-wrapper:not(.timeline-row-in-section) .row-header-title')
      .first();
    await rootRowTitle.dragTo(placeholder);

    await expect(sectionRows()).toHaveCount(1);
    await expect(placeholder).toBeHidden();
  });

  test('Add a row to the section', async () => {
    await setup.page.getByRole('button', { name: 'Add Row to Section' }).click();

    // Joining the row dragged in above.
    await expect(sectionRows()).toHaveCount(2);
  });

  test('Collapse the section hides its rows', async () => {
    await sectionGroup().getByRole('button', { name: 'Collapse Section' }).click();
    await expect(sectionRows()).toHaveCount(0);
  });

  test('Expand the section shows its rows again', async () => {
    await sectionGroup().getByRole('button', { name: 'Expand Section' }).click();
    await expect(sectionRows()).toHaveCount(2);
  });

  test('Set the section color', async () => {
    // The band starts at the neutral default every section is created with.
    await expect(sectionBand()).toHaveCSS('background-color', 'rgb(214, 217, 221)');

    await editorSections().last().click();
    await setup.page.getByRole('button', { exact: true, name: 'Color' }).click();
    // The default leads the palette, so the second swatch is the first real color.
    await setup.page.getByRole('button', { name: 'preset color' }).nth(1).click();

    await expect(sectionBand()).toHaveCSS('background-color', 'rgb(252, 221, 143)');
    await setup.page.getByRole('button', { name: /Back to Timeline/ }).click();
  });

  test('Duplicate the section copies its rows and its color', async () => {
    const existingSectionCount = await editorSections().count();
    const existingRowCount = await sectionRows().count();

    await setup.page.getByRole('button', { name: 'Duplicate Section' }).last().click();
    await expect(editorSections()).toHaveCount(existingSectionCount + 1);

    const copy = setup.page.getByRole('group', { name: `${sectionName} (copy)` });
    await expect(copy).toBeVisible();
    await expect(copy.getByRole('banner')).toHaveCount(existingRowCount);
    await expect(copy.getByRole('toolbar', { name: `${sectionName} (copy) controls` })).toHaveCSS(
      'background-color',
      'rgb(252, 221, 143)',
    );

    // The copy is inserted directly after the original, so it is the last section in the list.
    await setup.page.getByRole('button', { name: 'Delete Section' }).last().click();
    await expect(copy).toBeHidden();
  });

  test('Delete the section, keeping its rows', async () => {
    const existingSectionCount = await editorSections().count();
    const existingRowCount = await timelineRows().count();

    await setup.page.getByRole('button', { name: 'Delete Section' }).last().click();

    await expect(editorSections()).toHaveCount(existingSectionCount - 1);
    await expect(sectionGroup()).toBeHidden();
    // Deleting a section only ungroups: every row it held returns to the root level.
    await expect(timelineRows()).toHaveCount(existingRowCount);
  });

  test('Delete All Sections keeps every row', async () => {
    // Regression guard: this used to empty `sections` and nothing else, so the rows a section
    // held lost their only reference and disappeared from the timeline entirely.
    await setup.page.getByRole('button', { name: 'New Section' }).click();
    const rowCount = await timelineRows().count();

    await setup.page.getByRole('button', { name: 'More Row Actions' }).click();
    await setup.page.getByRole('menuitem', { name: 'Delete All Sections' }).click();
    await setup.page.getByRole('button', { exact: true, name: 'Delete' }).click();

    await expect(editorSections()).toHaveCount(0);
    await expect(timelineRows()).toHaveCount(rowCount);

    // And the freed ids can be reused without colliding with a leftover reference.
    await setup.page.getByRole('button', { name: 'New Section' }).click();
    await expect(editorSections()).toHaveCount(1);
  });
});
