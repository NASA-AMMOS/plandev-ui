import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { ExternalSources } from '../fixtures/ExternalSources.js';
import { PanelNames } from '../fixtures/Plan.js';
import { cleanupApiResources, closeBrowserResources, setupTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;
let externalSources: ExternalSources;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  externalSources = new ExternalSources(setup.page);

  await externalSources.goto();
  await externalSources.createTypes(
    externalSources.exampleTypeSchema,
    externalSources.exampleTypeSchemaExpectedSourceTypes,
    externalSources.exampleTypeSchemaExpectedEventTypes,
  );
  await externalSources.uploadExternalSource();
  await setup.plan.goto();
  await setup.plan.showPanel(PanelNames.EXTERNAL_SOURCES);
  await setup.plan.externalSourceManageButton.click();
  await setup.page.getByText('No Derivation Groups Found').waitFor({ state: 'hidden' });
  await externalSources.linkDerivationGroup(externalSources.exampleDerivationGroup, externalSources.exampleSourceType);
  await setup.plan.goto();
});

test.afterAll(async () => {
  await cleanupApiResources(setup);

  // Use API for faster cleanup of external sources artifacts
  try {
    await setup.api.deleteExternalSources(externalSources.exampleDerivationGroup, [externalSources.externalSourceKey]);
    await setup.api.deleteDerivationGroups([externalSources.exampleDerivationGroup]);
    await setup.api.deleteExternalSourceTypes([externalSources.exampleSourceType]);
    await setup.api.deleteExternalEventTypes([externalSources.exampleEventType]);
  } catch {
    // Ignore cleanup errors - resources may not exist or have dependencies
  }

  await closeBrowserResources(setup);
});

test.describe.serial('Timeline View Editing', () => {
  const newActivityStartTime: string = '2022-005T00:00:00.000';
  const rowName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

  test('Add an activity to the parent plan', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_ITEMS);
    await setup.plan.addActivityByDragAndDrop('PickBanana');
    await setup.plan.addActivityByDragAndDrop('PeelBanana');
  });

  test('Change the start time of the activity', async () => {
    await setup.page.getByRole('gridcell', { name: 'PickBanana' }).first().click();
    await setup.plan.showPanel(PanelNames.SELECTED_ACTIVITY);
    await setup.page.locator('input[name="start-time"]').first().click();
    await setup.page.locator('input[name="start-time"]').first().fill(newActivityStartTime);
    await setup.page.locator('input[name="start-time"]').first().press('Enter');
  });

  test('Add a vertical guide', async () => {
    await setup.plan.showPanel(PanelNames.TIMELINE_EDITOR);
    const existingGuideCount = await setup.page.locator('.guide').count();
    await setup.page.getByRole('button', { name: 'New Vertical Guide' }).click();
    const newGuideCount = await setup.page.locator('.guide').count();
    expect(newGuideCount - existingGuideCount).toEqual(1);
  });

  test('Remove a vertical guide', async () => {
    const existingGuideCount = await setup.page.locator('.guide').count();
    await setup.page.getByRole('button', { name: 'Delete Guide' }).last().click();
    const newGuideCount = await setup.page.locator('.guide').count();
    expect(newGuideCount - existingGuideCount).toEqual(-1);
  });

  test('Add a row', async () => {
    const existingRowCount = await setup.page.locator('.timeline-row').count();
    await setup.page.getByRole('button', { exact: true, name: 'New Row' }).click();
    const newRowCount = await setup.page.locator('.timeline-row').count();
    expect(newRowCount - existingRowCount).toEqual(1);
  });

  test('Delete a row', async () => {
    const existingRowCount = await setup.page.locator('.timeline-row').count();

    // Click on delete button of last row
    await setup.page.locator('.timeline-row').last().locator("button[aria-label='Delete Row']").click();

    // Confirm deletion of row in modal
    await setup.page.locator('#svelte-modal').getByRole('button', { name: 'Delete' }).click();

    const newRowCount = await setup.page.locator('.timeline-row').count();
    expect(newRowCount - existingRowCount).toEqual(-1);
  });

  test('Edit a row', async () => {
    // Create a new row
    await setup.page.getByRole('button', { exact: true, name: 'New Row' }).click();

    // Click on edit button of last row
    await setup.page.locator('.timeline-row').last().locator("button[aria-label='Edit Row']").click();

    // Look for back button indicating that the row editor is active
    expect(setup.page.locator('.section-back-button ').first()).toBeDefined();

    // Give the row a name
    await setup.page.locator('input[name="name"]').first().fill(rowName);
    await setup.page.locator('input[name="name"]').first().blur();
  });

  test('Add an activity layer', async () => {
    const activityLayerEditor = setup.page.getByLabel('Activity Layer-editor');
    const existingLayerCount = await activityLayerEditor.locator('.timeline-layer-editor').count();

    // Add an activity layer
    await activityLayerEditor.getByRole('button', { name: 'New Activity Layer' }).click();
    const newLayerCount = await activityLayerEditor.locator('.timeline-layer-editor').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect the activity layer to include all activities
    expect(await activityLayerEditor.locator('.timeline-layer-editor').first()).toHaveText('Activity Layer');
  });

  test('Edit an activity layer', async () => {
    const activityLayerEditor = setup.page.getByLabel('Activity Layer-editor');

    // Open the activity filter builder
    await activityLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByLabel('Toggle activity filter builder modal')
      .click();

    // Expect that the modal is present
    const modal = activityLayerEditor.getByRole('dialog');
    expect(modal).toBeDefined();

    // Expect that layer name is showing in the name input
    expect(modal.locator('input[name="layer-name"]')).toHaveValue('Activity Layer');

    // Expect that the resulting types list is not empty
    const resultingTypesList = modal.locator('.resulting-types-list');
    const allActivityTypesCount = await resultingTypesList.locator('.filter-type-result').count();
    expect(allActivityTypesCount).toBeGreaterThan(0);

    // Expect that manually selecting types cause the types to appear in the resulting types list
    await modal.locator("input[name='manual-types-filter-input']").click();
    expect(await modal.locator('.manual-types-menu').first()).toBeDefined();
    await modal.getByRole('menuitem', { name: 'ChangeProducer' }).click();
    await modal.getByRole('menuitem', { name: 'ControllableDurationActivity' }).click();
    await setup.page.keyboard.press('Escape');

    expect(await resultingTypesList.getByText('ChangeProducer')).toBeDefined();
    expect(await resultingTypesList.getByText('ControllableDurationActivity')).toBeDefined();

    // Expect that dynamic types can be added
    await modal.getByLabel('dynamic-types').getByRole('button', { name: 'Add Filter' }).click();
    expect(await modal.getByLabel('dynamic-types').getByRole('listitem').count()).toBe(1);
    await modal.getByLabel('dynamic-types').getByRole('listitem').locator("input[name='filter-value']").fill('banana');
    expect(await resultingTypesList.locator('.filter-type-result').count()).toEqual(11);

    // Expect that other filters can be added
    await modal.getByLabel('other-filters').getByRole('button', { name: 'Add Filter' }).click();
    expect(await modal.getByLabel('other-filters').getByRole('listitem').count()).toBe(1);
    // Select parameter field
    await modal.getByLabel('other-filters').locator("select[aria-label='field']").selectOption('Parameter');
    // Select specific parameter
    await modal.getByLabel('other-filters').getByText('Select Parameter').click();
    await modal.getByLabel('other-filters').getByText('quantity (int)').click();
    // Select operator
    await modal.getByLabel('other-filters').locator("select[aria-label='operator']").selectOption('equals');
    // Fill filter value input
    await modal.getByLabel('other-filters').getByRole('listitem').locator("input[name='filter-value']").fill('10');
    // Ensure that only one instance (PickBanana) is listed
    expect(await modal.getByText('1 instance')).toBeDefined();

    // Expect that type subfilters can be added
    const activityResult = resultingTypesList.getByRole('listitem', { name: 'filter-type-result-PickBanana' });
    await activityResult.getByRole('button', { name: 'Add Filter' }).click();
    expect(await activityResult.getByRole('listitem').count()).toBe(1);
    // Select name field
    await activityResult.locator("select[aria-label='field']").selectOption('Name');
    // Select operator
    await activityResult.locator("select[aria-label='operator']").selectOption('includes');
    // Fill filter value input
    await activityResult.getByRole('listitem').locator("input[name='filter-value']").fill('foo');
    // Ensure that only one instance (PickBanana) is listed
    expect(await modal.getByText('0 instances')).toBeDefined();

    // Expect that type subfilters can be removed
    await activityResult.getByRole('button', { name: 'Remove filter' }).click();
    expect(await modal.getByText('1 instance')).toBeDefined();

    // Expect that other filters can be removed
    await modal.getByLabel('other-filters').getByRole('button', { name: 'Remove filter' }).click();
    expect(await modal.getByText('2 instances')).toBeDefined();

    // Expect that dynamic types can be removed
    await modal.getByLabel('dynamic-types').getByRole('button', { name: 'Remove filter' }).click();
    expect(await resultingTypesList.locator('.filter-type-result').count()).toEqual(2);

    // Expect that manual types can be cleared
    await modal.locator("input[name='manual-types-filter-input']").click();
    await modal.getByRole('menuitem', { name: 'ChangeProducer' }).click();
    await setup.page.keyboard.press('Escape');
    await modal.getByRole('button', { name: 'Remove Types' }).click();
    expect(await resultingTypesList.locator('.filter-type-result').count()).toEqual(allActivityTypesCount);

    // Give the layer a new name
    await modal.locator('input[name="layer-name"]').fill('Foo');

    // Close the modal
    await modal.getByRole('button', { name: 'close' }).click();

    // Expect name to match given name
    expect(await activityLayerEditor.locator('.timeline-layer-editor').first()).toHaveText('Foo');
  });

  test('Change activity layer settings', async () => {
    const activityLayerEditor = await setup.page.getByLabel('Activity Layer-editor');

    // Expect to not see an activity tree group in this row
    expect(
      await setup.page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.activity-tree').count(),
    ).toBe(0);

    // Switch to grouped display mode
    await setup.page.locator('button', { hasText: 'Grouped' }).click();

    // Expect to see an activity tree group for this activity in this row
    expect(
      await setup.page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.collapse-root', { hasText: 'PickBanana' })
        .count(),
    ).toBe(1);

    // Delete an activity layer
    await activityLayerEditor.locator('.timeline-layer-editor').first().getByRole('button', { name: 'Delete' }).click();
    expect(await activityLayerEditor.locator('.timeline-layer-editor').count()).toBe(0);
  });

  test('Add a resource layer', async () => {
    const resourceLayerEditor = await setup.page.getByLabel('Resource Layer-editor');
    const yAxisEditor = await setup.page.getByLabel('Y Axis-editor');
    const existingLayerCount = await resourceLayerEditor.locator('.timeline-layer-editor').count();
    const existingYAxesCount = await yAxisEditor.locator('.timeline-y-axis').count();

    // Expect no y-axis label to exist for the row in the timeline
    expect(
      await setup.page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.row-header-y-axis-label')
        .count(),
    ).toBe(0);

    // Add a resource layer
    await resourceLayerEditor.getByRole('button', { name: 'New Resource Layer' }).click();
    const newLayerCount = await resourceLayerEditor.locator('.timeline-layer-editor').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect a y-axis to have been automatically created
    const newYAxisCount = await yAxisEditor.locator('.timeline-y-axis').count();
    expect(newYAxisCount - existingYAxesCount).toEqual(1);

    // Select a resource
    await resourceLayerEditor.getByRole('combobox').click();
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).waitFor({ state: 'attached' });
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).click();
    await resourceLayerEditor.getByRole('menuitem', { name: '/peel' }).waitFor({ state: 'detached' });

    // Run simulation
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.runSimulation();

    // Expect the resource to have a y-axis label in the timline
    await setup.page
      .locator('.timeline-row-wrapper', { hasText: rowName })
      .locator('.row-header-y-axis-label')
      .waitFor({ state: 'attached' });
    expect(
      await setup.page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.row-header-y-axis-label')
        .count(),
    ).toBe(1);

    // Duplicate a resource layer
    await resourceLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByRole('button', { name: 'Duplicate' })
      .click();
    expect(await resourceLayerEditor.locator('.timeline-layer-editor').count()).toBe(2);

    // Delete a resource layer
    await resourceLayerEditor.locator('.timeline-layer-editor').first().getByRole('button', { name: 'Delete' }).click();
    expect(await resourceLayerEditor.locator('.timeline-layer-editor').count()).toBe(1);
  });

  test('Change resource layer line and point styles', async () => {
    const resourceLayerEditor = setup.page.getByLabel('Resource Layer-editor');
    const layer = resourceLayerEditor.locator('.timeline-layer-editor').first();

    // Open the layer settings menu
    await layer.getByRole('button', { name: 'Layer Settings' }).click();

    const lineStyle = layer.getByRole('combobox', { name: 'Line Style' });
    const lineOpacity = layer.getByRole('spinbutton', { name: 'Line Opacity' });
    const pointShape = layer.getByRole('combobox', { name: 'Point Shape' });
    const showPoints = layer.getByRole('combobox', { name: 'Show Points' });

    // Expect the defaults to match how the layer rendered before these options existed
    await expect(lineStyle).toHaveValue('solid');
    await expect(lineOpacity).toHaveValue('1');
    await expect(pointShape).toHaveValue('circle');
    await expect(showPoints).toHaveValue('auto');
    await expect(layer.getByRole('button', { name: 'Line Color' })).toBeVisible();
    await expect(layer.getByRole('button', { name: 'Point Color' })).toBeVisible();

    // Change every style option and expect each to stick
    await lineStyle.selectOption('dashed');
    await pointShape.selectOption('diamond');
    await showPoints.selectOption('never');
    await lineOpacity.fill('0.5');

    await expect(lineStyle).toHaveValue('dashed');
    await expect(pointShape).toHaveValue('diamond');
    await expect(showPoints).toHaveValue('never');
    await expect(lineOpacity).toHaveValue('0.5');

    // The row still renders after restyling -- a bad globalAlpha or dash pattern would throw during
    // the canvas draw and leave the row blank. Clamping and NaN handling are unit tested.
    await expect(setup.page.locator('.timeline-row-wrapper', { hasText: rowName })).toBeVisible();

    await lineStyle.selectOption('solid');
    await showPoints.selectOption('auto');
    await lineOpacity.fill('1');

    await layer.getByRole('button', { name: 'Layer Settings' }).click();
  });

  test('Change resource layer area fill settings', async () => {
    const resourceLayerEditor = setup.page.getByLabel('Resource Layer-editor');
    const layer = resourceLayerEditor.locator('.timeline-layer-editor').first();

    await layer.getByRole('button', { name: 'Layer Settings' }).click();

    // Area fill is off by default, so its dependent controls should not be rendered yet
    const fillAreaCheckbox = setup.page.getByRole('checkbox', { name: 'Fill Area' });
    await expect(fillAreaCheckbox).not.toBeChecked();
    await expect(setup.page.getByRole('spinbutton', { name: 'Fill Opacity' })).toBeHidden();
    await expect(setup.page.getByRole('button', { name: 'Fill Color' })).toBeHidden();

    // Enabling the fill reveals the color and opacity controls
    await fillAreaCheckbox.check();
    await expect(fillAreaCheckbox).toBeChecked();
    const fillOpacity = setup.page.getByRole('spinbutton', { name: 'Fill Opacity' });
    await expect(fillOpacity).toHaveValue('0.25');
    await expect(setup.page.getByRole('button', { name: 'Fill Color' })).toBeVisible();

    await fillOpacity.fill('0.5');
    await expect(fillOpacity).toHaveValue('0.5');

    // Clearing the field must not persist NaN, which would fail view schema validation and render
    // the fill fully opaque, so the layer keeps its last valid opacity
    await fillOpacity.fill('');
    await layer.getByRole('button', { name: 'Layer Settings' }).click();
    await layer.getByRole('button', { name: 'Layer Settings' }).click();
    await expect(setup.page.getByRole('spinbutton', { name: 'Fill Opacity' })).toHaveValue('0.5');

    // Disabling the fill hides its dependent controls again
    await setup.page.getByRole('checkbox', { name: 'Fill Area' }).uncheck();
    await expect(setup.page.getByRole('spinbutton', { name: 'Fill Opacity' })).toBeHidden();
    await expect(setup.page.getByRole('button', { name: 'Fill Color' })).toBeHidden();

    await layer.getByRole('button', { name: 'Layer Settings' }).click();
  });

  test('Add an external event layer', async () => {
    const externalEventLayerEditor = setup.page.getByLabel('Event Layer-editor');
    const existingLayerCount = await externalEventLayerEditor.locator('.timeline-layer-editor').count();

    // Add an external event layer
    await externalEventLayerEditor.getByRole('button', { name: 'New Event Layer' }).click();
    const newLayerCount = await externalEventLayerEditor.locator('.timeline-layer-editor').count();
    expect(newLayerCount - existingLayerCount).toEqual(1);

    // Expect the external event layer to include all external events
  });

  test('Edit an external event layer', async () => {
    const externalEventLayerEditor = setup.page.getByLabel('Event Layer-editor');

    // Open the external event filter builder
    await externalEventLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByLabel('Toggle external event filter builder modal')
      .click();

    // Expect that the modal is present
    const modal = externalEventLayerEditor.getByRole('dialog');
    expect(modal).toBeDefined();

    // Expect that the resulting types list is not empty
    const resultingTypesList = modal.locator('.resulting-types-list');
    const allExternalEventTypesCount = await resultingTypesList.locator('.filter-type-result').count();
    expect(allExternalEventTypesCount).toBeGreaterThan(0);

    // Expect that manually selecting types cause the types to appear in the resulting types list
    await modal.locator("input[name='manual-types-filter-input']").click();
    expect(await modal.locator('.manual-types-menu').first()).toBeDefined();
    await modal.getByRole('menuitem', { name: 'ExampleEvent' }).click();
    await setup.page.keyboard.press('Escape');

    expect(await resultingTypesList.getByText('ExampleEvent')).toBeDefined();

    // Expect that dynamic types can be added
    await modal.getByLabel('dynamic-types').getByRole('button', { name: 'Add Filter' }).click();
    expect(await modal.getByLabel('dynamic-types').getByRole('listitem').count()).toBe(1);
    // Fill filter value input
    await modal.getByLabel('dynamic-types').getByRole('listitem').locator("input[name='filter-value']").fill('Example');
    // Ensure that only one instance (ExampleEvent) is listed
    expect(await resultingTypesList.locator('.filter-type-result').count()).toEqual(1);

    expect(await modal.getByText('1 instance')).toBeVisible();

    // Give the layer a new name
    await modal.locator('input[name="layer-name"]').fill('Foo');

    // Close the modal
    await modal.getByRole('button', { name: 'close' }).click();

    // Expect name to match given name
    expect(await externalEventLayerEditor.locator('.timeline-layer-editor').first()).toHaveText(/\s+Foo\s/);
  });

  test('Change external event layer settings', async () => {
    const externalEventLayerEditor = await setup.page.getByLabel('Event Layer-editor');

    // Expect to not see an external event tree group in this row
    expect(await setup.page.locator('.timeline-row-wrapper', { hasText: rowName }).locator('.event-tree').count()).toBe(
      0,
    );

    // Switch to grouped display mode
    await setup.page.locator('button', { hasText: 'Grouped' }).click();

    // Expect to see an external event tree group for this event in this row
    expect(
      await setup.page
        .locator('.timeline-row-wrapper', { hasText: rowName })
        .locator('.collapse-root', { hasText: 'ExampleEvent' })
        .count(),
    ).toBe(1);

    // Delete an external event layer
    await externalEventLayerEditor
      .locator('.timeline-layer-editor')
      .first()
      .getByRole('button', { name: 'Delete' })
      .click();
    expect(await externalEventLayerEditor.locator('.timeline-layer-editor').count()).toBe(0);
  });

  test('Open and close the row header context menu', async () => {
    await setup.page.pause();
    const rowHeader = setup.page.getByRole('banner').filter({ hasText: 'Activities by Type' });
    // Ensure the element is in the viewport before interacting with it
    await rowHeader.scrollIntoViewIfNeeded();
    await rowHeader.waitFor({ state: 'visible' });
    await rowHeader.hover();

    const rowHeaderMenuButton = rowHeader.getByRole('button', { name: 'Row Settings' });
    await rowHeaderMenuButton.waitFor({ state: 'visible' });
    await rowHeaderMenuButton.click({ force: true });

    await expect(setup.page.getByRole('menu', { name: 'Context Menu' })).toBeVisible();
    await expect(setup.page.getByRole('listitem').filter({ hasText: 'Activities by Type' })).toBeVisible();
    // Wait for the context menu to not ignore clicks outside
    await setup.page.waitForTimeout(500);
    await setup.page.getByRole('listitem').filter({ hasText: 'Activities by Type' }).click();
    await expect(setup.page.getByRole('menu', { name: 'Context Menu' })).not.toBeVisible();
  });
});
