import { expect, type Locator, type Page } from '@playwright/test';
import { filterAgGridTable } from '../utilities/helpers.js';
import { schemaUploadFile, type ExternalSourceFixture, type UploadFile } from '../utilities/external-sources.js';

export class ExternalSources {
  deleteSourceButton: Locator;
  deleteSourceButtonConfirmation: Locator;
  externalEventSelectedForm: Locator;
  externalEventTableHeaderDuration: Locator;
  externalEventTableHeaderEventType: Locator;
  externalSourceSelectedForm: Locator;
  externalSourcesTable: Locator;
  inputFile: Locator;
  uploadButton: Locator;
  viewContainedEventTypes: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  /** Upload the fixture's type schemas through the UI and wait for its types to be listed. */
  async createTypes(fixture: ExternalSourceFixture) {
    await this.gotoTypeManager();

    const externalSourceTypeTable = this.page.locator('.external-source-type-table');
    const externalEventTypeTable = this.page.locator('.external-event-type-table');
    const schemaFileInput = this.page.getByLabel('Type JSON Schema File');
    const uploadButton = this.page.getByLabel('Upload External Source & Event Type(s)');

    await this.setFileAndAwaitButton(schemaFileInput, schemaUploadFile(fixture), uploadButton);

    const sourceTypes = Object.keys(fixture.schemas?.source_types ?? {});
    const eventTypes = Object.keys(fixture.schemas?.event_types ?? {});
    for (const name of [...sourceTypes, ...eventTypes]) {
      await expect(this.page.locator(`li:text("${name}")`)).toBeVisible({ timeout: 5000 });
    }

    await uploadButton.click();

    for (const name of sourceTypes) {
      await expect(externalSourceTypeTable.getByRole('gridcell', { name })).toBeVisible({ timeout: 10000 });
    }
    for (const name of eventTypes) {
      await expect(externalEventTypeTable.getByRole('gridcell', { name })).toBeVisible({ timeout: 10000 });
    }
  }

  async deleteDerivationGroup(derivationGroupName: string) {
    await this.deleteFromTable(
      'derivation-group-table',
      derivationGroupName,
      'Derivation Group',
      'Delete Derivation Group',
    );
  }

  async deleteExternalEventType(eventTypeName: string) {
    await this.deleteFromTable(
      'external-event-type-table',
      eventTypeName,
      'External Event Type',
      'Delete External Event Type',
    );
  }

  async deleteExternalSourceType(sourceTypeName: string) {
    await this.deleteFromTable(
      'external-source-type-table',
      sourceTypeName,
      'External Source Type',
      'Delete External Source Type',
    );
  }

  /**
   * Delete a row through its confirmation modal with real pointer clicks. The grid is first filtered
   * down to the row being deleted: the tables are global, so otherwise other suites' rows fill the
   * grid and its scrollbar can sit over the row's action button. Throws if the row, its button, or
   * the confirmation is missing.
   */
  private async deleteFromTable(
    tableCssClass: string,
    itemName: string,
    nameColumn: string,
    deleteButtonLabel: string,
  ) {
    const table = this.page.locator(`.${tableCssClass}`);
    await filterAgGridTable(this.page, table, itemName, { columnName: nameColumn, exactColumnMatch: true });
    const row = table.getByRole('row', { name: itemName });
    await expect(row).toHaveCount(1);
    // Row actions only appear while the row is hovered.
    await row.hover();
    await row.getByLabel(deleteButtonLabel).click();
    await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
    await expect(row).toBeHidden({ timeout: 10000 });
  }

  /** Select a source in the sources table and delete it through the UI. */
  async deleteSource(sourceKey: string) {
    const cell = this.externalSourcesTable.getByRole('gridcell', { name: sourceKey });
    await expect(cell).toBeVisible({ timeout: 10000 });
    await cell.click();
    await expect(this.page.getByText('Selected External Source', { exact: true })).toBeVisible({ timeout: 5000 });
    await this.deleteSourceButton.click();
    await this.deleteSourceButtonConfirmation.click();
    await expect(cell).toBeHidden({ timeout: 10000 });
  }

  /**
   * Assert that no source or event is selected (upload form should be visible).
   */
  async expectNoSelection() {
    await expect(this.externalEventSelectedForm).not.toBeVisible();
    await expect(this.externalSourceSelectedForm).not.toBeVisible();
    await expect(this.inputFile).toBeVisible();
  }

  /**
   * Assert that an external source is currently selected.
   */
  async expectSourceSelected() {
    await expect(this.page.locator('.external-source-header')).toBeVisible({ timeout: 10000 });
  }

  async getCanvasPixelData() {
    await this.page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas !== null && canvas !== undefined) {
        const context = canvas.getContext('2d');
        if (context !== null && context !== undefined) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          return imageData.data;
        }
      }
    });
    return null;
  }

  async goto() {
    // Use 'domcontentloaded' + an explicit anchor instead of 'networkidle': this page holds live
    // Hasura subscriptions/polling, so the network never goes idle and 'networkidle' can hang to
    // the test timeout. Either the sources table (sources exist) or the upload input (empty state)
    // is present once the page is ready.
    await this.page.goto('/external-sources', { waitUntil: 'domcontentloaded' });
    // Resolve as soon as either anchor becomes visible. Callers that need a specific element
    // (table for selectSource, upload input for uploadExternalSource) wait for it explicitly after.
    await this.externalSourcesTable.or(this.inputFile).first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async gotoTypeManager() {
    await this.page.goto('/external-sources/types', { waitUntil: 'domcontentloaded' });
    // Anchor on the schema-file input's accessible label rather than a table CSS class.
    await this.page.getByLabel('Type JSON Schema File').waitFor({ state: 'visible', timeout: 15000 });
  }

  async linkDerivationGroup(derivationGroupName: string, sourceTypeName: string) {
    // Assumes the Manage Derivation Groups modal is already showing
    const row = this.page.getByRole('row', { name: derivationGroupName });
    // Use click with force for AG Grid checkboxes - check/uncheck fails with Chrome for Testing
    const checkbox = row.getByRole('checkbox');
    const isAlreadyChecked = await checkbox.isChecked();
    if (!isAlreadyChecked) {
      await checkbox.click({ force: true });
      await expect(checkbox).toBeChecked();
      await this.page.getByRole('button', { name: 'Update' }).click();
    }
    await this.page.getByRole('button', { name: 'Close' }).click();
    await expect(this.page.getByRole('button', { exact: true, name: sourceTypeName })).toBeVisible();
  }

  async selectEvent(eventName: string, sourceKey: string) {
    await this.selectSource(sourceKey);
    const eventCell = this.page.getByRole('gridcell', { name: eventName });
    await eventCell.waitFor({ state: 'visible', timeout: 10000 });
    await eventCell.click();
  }

  async selectSource(sourceKey: string) {
    // The sources grid is fed by a global live subscription, so other suites' uploads and deletes keep
    // re-rendering it. A click that lands mid-refresh can select the row without opening the source,
    // and clicking again does not recover, so each attempt starts from a freshly loaded page.
    await expect(async () => {
      await this.goto();
      const sourceRow = this.externalSourcesTable.getByRole('gridcell', { name: sourceKey });
      await sourceRow.waitFor({ state: 'visible', timeout: 5000 });
      await sourceRow.click();
      // Use exact match to avoid matching "No external sources matching the selected external..."
      await expect(this.page.getByText('Selected External Source', { exact: true })).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
  }

  /**
   * Set the file on an upload input and wait for the page to enable its upload button. The change is
   * re-applied until the button enables, so a file set before the page is ready to receive it is not
   * lost; if it never enables, this throws rather than letting the caller click a disabled button.
   */
  private async setFileAndAwaitButton(input: Locator, file: UploadFile, button: Locator) {
    await expect(input).toBeVisible({ timeout: 15000 });
    await expect(async () => {
      await input.setInputFiles(file);
      await expect(button).toBeEnabled({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
  }

  async unlinkDerivationGroup(derivationGroupName: string, sourceTypeName: string) {
    // Assumes the Manage Derivation Groups modal is already showing
    const derivationGroupIsLinked: boolean = await this.page
      .getByRole('row', { name: derivationGroupName })
      .getByRole('checkbox')
      .isChecked();
    if (!derivationGroupIsLinked) {
      return;
    }
    await this.page.getByRole('row', { name: derivationGroupName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
    await expect(this.page.getByRole('button', { exact: true, name: sourceTypeName })).not.toBeVisible();
  }

  updatePage(page: Page): void {
    this.deleteSourceButton = page.getByRole('button', { exact: true, name: 'Delete external source' });
    this.deleteSourceButtonConfirmation = page.getByRole('button', { exact: true, name: 'Delete' });
    this.externalEventSelectedForm = page.locator('.external-event-form-container');
    this.externalEventTableHeaderDuration = page.getByText('Duration');
    this.externalEventTableHeaderEventType = page.getByText('Event Type', { exact: true });
    this.externalSourceSelectedForm = page.locator('.selected-source-forms');
    this.externalSourcesTable = page.locator('#external-sources-table');
    this.inputFile = page.locator('input[name="file"]');
    this.uploadButton = page.getByRole('button', { name: 'Upload' });
    this.viewContainedEventTypes = page.getByRole('button', { name: 'View Contained Event Types' });
  }

  /**
   * Upload a source through the UI form. With `validateUpload` (default) waits for the new source to be
   * selected; pass `false` when the upload is expected to fail and assert on the failure instead.
   */
  async uploadExternalSource(file: UploadFile, validateUpload: boolean = true) {
    await this.goto();
    await this.setFileAndAwaitButton(this.inputFile, file, this.uploadButton);
    await this.uploadButton.click();

    if (validateUpload) {
      // Allow generous time: on a loaded CI backend the create + selection round-trip can exceed 10s.
      await expect(this.page.getByText('Selected External Source', { exact: true })).toBeVisible({ timeout: 20000 });
    }
  }

  async waitForToast(message: string, timeout: number = 10000) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout });
  }
}
