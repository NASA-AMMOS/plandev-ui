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
  // A section is one named item of the timeline's list; every row it holds renders a header.
  const sectionGroup = () => setup.page.getByRole('listitem', { name: sectionName });
  const sectionRows = () => sectionGroup().getByRole('banner');
  // The colored band alone, as opposed to the section of band plus rows.
  const sectionBand = () => sectionGroup().getByRole('group', { name: `${sectionName} controls` });
  const timelineRows = () => setup.page.getByRole('banner');
  // A section created without renaming it, which is what the two menu tests at the end make.
  const defaultBand = () => setup.page.getByRole('group', { name: 'Section controls' });

  async function deleteAllSections() {
    if ((await editorSections().count()) === 0) {
      return;
    }
    await setup.page.getByRole('button', { name: 'More Row Actions' }).click();
    await setup.page.getByRole('menuitem', { name: 'Delete All Sections' }).click();
    await setup.page.getByRole('button', { exact: true, name: 'Delete' }).click();
    await expect(editorSections()).toHaveCount(0);
  }

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

    // Stepped by hand rather than dragTo: the drop target only registers once it has seen a few
    // dragover events, and a two-event drag lands as a cancel instead of a drop. Everything is
    // measured after the press, since hovering the source can scroll the list under it.
    await rootRowTitle.hover();
    await setup.page.mouse.down();

    const source = await rootRowTitle.boundingBox();
    const target = await placeholder.boundingBox();
    const x = (target?.x ?? 0) + (target?.width ?? 0) / 2;
    const y = (target?.y ?? 0) + (target?.height ?? 0) / 2;

    // A short nudge first, so the drag is under way before the long move.
    await setup.page.mouse.move((source?.x ?? 0) + 8, (source?.y ?? 0) + 8);
    await setup.page.mouse.move(x, y, { steps: 12 });
    await setup.page.mouse.move(x, y);
    await setup.page.mouse.up();

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

    // The name takes the contrast foreground picked against the band, not Stellar's own text
    // color. It carries .st-typography-label, which sets a translucent grey of its own, and an
    // inherited value loses to a directly-matching declaration - so the band's color has to reach
    // it by a rule that names it. When that regressed the title stayed grey on every band.
    await expect(sectionBand().getByText(sectionName, { exact: true })).toHaveCSS('color', 'rgb(27, 29, 31)');

    await setup.page.getByRole('button', { name: /Back to Timeline/ }).click();
  });

  test('Duplicate the section copies its rows and its color', async () => {
    const existingSectionCount = await editorSections().count();
    const existingRowCount = await sectionRows().count();

    await setup.page.getByRole('button', { name: 'Duplicate Section' }).last().click();
    await expect(editorSections()).toHaveCount(existingSectionCount + 1);

    const copy = setup.page.getByRole('listitem', { name: `${sectionName} (copy)` });
    await expect(copy).toBeVisible();
    await expect(copy.getByRole('banner')).toHaveCount(existingRowCount);
    await expect(copy.getByRole('group', { name: `${sectionName} (copy) controls` })).toHaveCSS(
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

  test('Insert Section lands next to the row it was invoked from', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);

    // Start with no sections, so the one inserted below is the only band on the timeline, and
    // with two rows, so "next to the first" is distinguishable from "at the end".
    await deleteAllSections();
    if ((await timelineRows().count()) < 2) {
      await setup.page.getByRole('button', { exact: true, name: 'New Row' }).click();
    }
    await expect(timelineRows()).not.toHaveCount(1);

    await timelineRows().first().getByRole('button', { name: 'Row Settings' }).click();
    await setup.page.getByRole('menuitem', { name: 'Insert Section' }).click();
    await expect(defaultBand()).toBeVisible();

    const firstRowBox = await timelineRows().first().boundingBox();
    const bandBox = await defaultBand().boundingBox();
    const secondRowBox = await timelineRows().nth(1).boundingBox();

    // Between the row it came from and the one that follows, rather than after every row.
    expect(bandBox?.y ?? 0).toBeGreaterThan(firstRowBox?.y ?? 0);
    expect(bandBox?.y ?? 0).toBeLessThan(secondRowBox?.y ?? 0);
  });

  test('Collapse Timeline folds every row and section, Expand Timeline opens them', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);

    // One section of its own rather than whatever the test above left behind, since a retry of
    // this serial group restarts from a fresh plan. It holds no rows, so collapsing it hides no
    // row headers and the count below stays stable.
    await deleteAllSections();
    await setup.page.getByRole('button', { name: 'New Section' }).click();
    await expect(defaultBand()).toBeVisible();

    const rowCount = await timelineRows().count();

    await timelineRows().first().getByRole('button', { name: 'Row Settings' }).click();
    await setup.page.getByRole('menuitem', { name: 'Collapse Timeline' }).click();

    await expect(setup.page.getByRole('button', { name: 'Expand Row' })).toHaveCount(rowCount);
    await expect(defaultBand().getByRole('button', { name: 'Expand Section' })).toBeVisible();

    // A collapsed row is too short to render its Row Settings button, so the way back is the
    // section band's own right-click menu - which offers the same pair. Wait for the first menu
    // to unmount, or the two menus both match the item below.
    await expect(setup.page.getByRole('menuitem', { name: 'Collapse Timeline' })).toHaveCount(0);
    await defaultBand().click({ button: 'right' });
    await setup.page.getByRole('menuitem', { name: 'Expand Timeline' }).click();

    await expect(setup.page.getByRole('button', { name: 'Collapse Row' })).toHaveCount(rowCount);
    await expect(defaultBand().getByRole('button', { name: 'Collapse Section' })).toBeVisible();
  });
});
