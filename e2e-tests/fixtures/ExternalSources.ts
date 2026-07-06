import { expect, type Locator, type Page } from '@playwright/test';
import { setFileInputByFilepath } from '../utilities/helpers';

export class ExternalSources {
  deleteSourceButton: Locator;
  deleteSourceButtonConfirmation: Locator;
  derivationATypeName: string = 'DerivationA';
  derivationBTypeName: string = 'DerivationB';
  derivationCTypeName: string = 'DerivationC';
  derivationDTypeName: string = 'DerivationD';
  derivationTestFile1: string = 'e2e-tests/data/external-event-derivation-1.json';
  derivationTestFile2: string = 'e2e-tests/data/external-event-derivation-2.json';
  derivationTestFile3: string = 'e2e-tests/data/external-event-derivation-3.json';
  derivationTestFile4: string = 'e2e-tests/data/external-event-derivation-4.json';
  derivationTestFileKey1: string = 'external-event-derivation-1.json';
  derivationTestFileKey2: string = 'external-event-derivation-2.json';
  derivationTestFileKey3: string = 'external-event-derivation-3.json';
  derivationTestFileKey4: string = 'external-event-derivation-4.json';
  derivationTestGroupName: string = 'DerivationTest Default';
  derivationTestSourceType: string = 'DerivationTest';
  derivationTestSourceTypeName: string = 'DerivationTest';
  exampleDerivationGroup: string = 'Example External Source Default';
  exampleEmptyDerivationGroup: string = 'Empty External Source Default';
  exampleEmptyEventType: string = 'EmptyEvent';
  exampleEmptySourceType: string = 'Empty External Source';
  exampleEventType: string = 'ExampleEvent';
  exampleSourceType: string = 'Example External Source';
  exampleTypeSchema: string = 'e2e-tests/data/Schema_Example_Source.json';
  exampleTypeSchemaExpectedEventTypes: string[] = ['ExampleEvent'];
  exampleTypeSchemaExpectedSourceTypes: string[] = ['Example External Source'];
  externalEventSelectedForm: Locator;
  externalEventTableHeaderDuration: Locator;
  externalEventTableHeaderEventType: Locator;
  externalSourceEmptyAttributeFilePath: string = 'e2e-tests/data/example-external-source_empty-attr.json';
  externalSourceEmptyAttributeKey: string = 'EmptyExternalSource:example-external-source_empty-attr.json';
  externalSourceFileName: string = 'example-external-source.json';
  externalSourceFilePath: string = 'e2e-tests/data/example-external-source.json';
  externalSourceFilePathMissingField: string = 'e2e-tests/data/example-external-source-missing-field.json';
  externalSourceFilePathSyntaxError: string = 'e2e-tests/data/example-external-source-syntax-error.json';
  externalSourceKey: string = 'ExampleExternalSource:example-external-source.json';
  externalSourceNoAttributeFilePath: string = 'e2e-tests/data/example-external-source_no-attr.json';
  externalSourceNoAttributeKey: string = 'NoAttrSource:example-external-source_no-attr.json';
  externalSourceSelectedForm: Locator;
  externalSourcesTable: Locator;
  inputFile: Locator;
  noAttrDerivationGroup: string = 'NoAttrSource Default';
  noAttrEventType: string = 'NoAttrEvent';
  noAttrSourceType: string = 'NoAttrSource';
  uploadButton: Locator;
  viewContainedEventTypes: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  // Public methods in alphabetical order
  async createTypes(typeSchema: string, expectedSourceTypes: string[], expectedEventTypes: string[]) {
    await this.gotoTypeManager();

    const externalSourceTypeTable = this.page.locator('.external-source-type-table');
    const externalEventTypeTable = this.page.locator('.external-event-type-table');

    // Check if all types already exist - if so, skip creation
    let allTypesExist = true;
    for (const expectedSourceType of expectedSourceTypes) {
      const exists = await externalSourceTypeTable
        .getByRole('gridcell', { name: expectedSourceType })
        .isVisible()
        .catch(() => false);
      if (!exists) {
        allTypesExist = false;
        break;
      }
    }
    if (allTypesExist) {
      for (const expectedEventType of expectedEventTypes) {
        const exists = await externalEventTypeTable
          .getByRole('gridcell', { name: expectedEventType })
          .isVisible()
          .catch(() => false);
        if (!exists) {
          allTypesExist = false;
          break;
        }
      }
    }

    // If all types exist, just verify and return
    if (allTypesExist) {
      return;
    }

    const schemaFileInput = this.page.getByLabel('Type JSON Schema File');
    const uploadButton = this.page.getByLabel('Upload External Source & Event Type(s)');
    await expect(schemaFileInput).toBeVisible({ timeout: 10000 });
    await setFileInputByFilepath(this.page, schemaFileInput, typeSchema, uploadButton);

    // Wait for schema to be parsed
    await expect(uploadButton).toBeVisible({ timeout: 10000 });

    for (const expectedSourceType of expectedSourceTypes) {
      await expect(this.page.locator(`li:text("${expectedSourceType}")`)).toBeVisible({ timeout: 5000 });
    }
    for (const expectedEventType of expectedEventTypes) {
      await expect(this.page.locator(`li:text("${expectedEventType}")`)).toBeVisible({ timeout: 5000 });
    }

    await uploadButton.click();

    // Wait for types to appear in tables with longer timeout
    for (const expectedSourceType of expectedSourceTypes) {
      await expect(externalSourceTypeTable.getByRole('gridcell', { name: expectedSourceType })).toBeVisible({
        timeout: 10000,
      });
    }
    for (const expectedEventType of expectedEventTypes) {
      await expect(externalEventTypeTable.getByRole('gridcell', { name: expectedEventType })).toBeVisible({
        timeout: 10000,
      });
    }
  }

  async deleteDerivationGroup(derivationGroupName: string) {
    await this.deleteFromTable('derivation-group-table', derivationGroupName, 'Delete Derivation Group');
  }

  async deleteExternalEventType(eventTypeName: string) {
    await this.deleteFromTable('external-event-type-table', eventTypeName, 'Delete External Event Type');
  }

  async deleteExternalSourceType(sourceTypeName: string) {
    await this.deleteFromTable('external-source-type-table', sourceTypeName, 'Delete External Source Type');
  }

  /**
   * Generic helper to delete an item from a table with confirmation modal.
   */
  private async deleteFromTable(tableCssClass: string, itemName: string, deleteButtonLabel: string) {
    // Close any open modals first
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page
      .locator('.modal')
      .waitFor({ state: 'hidden', timeout: 2000 })
      .catch(() => {});

    const table = this.page.locator(`.${tableCssClass}`);
    const row = table.getByRole('row', { name: itemName });

    if (!(await row.isVisible().catch(() => false))) {
      return;
    }

    await row.hover();
    const deleteButton = row.getByLabel(deleteButtonLabel);
    if (!(await deleteButton.isVisible().catch(() => false))) {
      return; // Can't delete, no permission or button not shown
    }

    await deleteButton.click();
    const modal = this.page.locator('.modal');
    await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const confirmButton = this.page.getByRole('button', { exact: true, name: 'Delete' });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      await row.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    } else {
      // Item has dependencies - close the modal instead
      await this.page
        .getByRole('button', { exact: true, name: 'Close' })
        .click()
        .catch(() => {});
    }
  }

  async deleteSource(sourceKey: string) {
    // Only delete a source if it's visible in the table
    const tableVisible = await this.externalSourcesTable.isVisible().catch(() => false);
    if (!tableVisible) {
      return;
    }
    const cell = this.externalSourcesTable.getByRole('gridcell', { name: sourceKey });
    const isVisible = await cell.isVisible().catch(() => false);
    if (isVisible) {
      await cell.click();
      // Wait for selection to complete
      await this.page
        .getByText('Selected External Source')
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {});
      const deleteButtonVisible = await this.deleteSourceButton.isVisible().catch(() => false);
      if (deleteButtonVisible) {
        await this.deleteSourceButton.click();
        const confirmVisible = await this.deleteSourceButtonConfirmation.isVisible().catch(() => false);
        if (confirmVisible) {
          await this.deleteSourceButtonConfirmation.click();
          // Wait for deletion to complete
          await cell.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
        }
      }
    }
  }

  /**
   * Delete a source if it exists. Useful for test setup to ensure clean state.
   */
  async deleteSourceIfExists(sourceKey: string) {
    await this.goto();
    await this.deleteSource(sourceKey);
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

  async fillInputFile(externalSourceFilePath: string) {
    await setFileInputByFilepath(this.page, this.inputFile, externalSourceFilePath);
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
    await Promise.race([
      this.externalSourcesTable.waitFor({ state: 'visible', timeout: 15000 }),
      this.inputFile.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});
  }

  async gotoTypeManager() {
    await this.page.goto('/external-sources/types', { waitUntil: 'domcontentloaded' });
    await this.page.locator('.external-source-type-table').waitFor({ state: 'visible', timeout: 15000 });
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

  async selectEvent(eventName: string, sourceName: string = 'example-external-source.json') {
    await this.goto();
    await this.selectSource(sourceName);
    const eventCell = this.page.getByRole('gridcell', { name: eventName });
    await eventCell.waitFor({ state: 'visible', timeout: 10000 });
    await eventCell.click();
  }

  async selectSource(sourceName: string = 'example-external-source.json') {
    await this.goto();
    // Wait for table to be visible and the specific source row to be ready
    await this.externalSourcesTable.waitFor({ state: 'visible', timeout: 10000 });
    const sourceRow = this.page.getByRole('gridcell', { name: sourceName });
    await sourceRow.waitFor({ state: 'visible', timeout: 10000 });
    // Playwright's click auto-waits for the row to be stable/actionable, so no networkidle wait
    // is needed here (and networkidle can hang on this page's live subscriptions).
    await sourceRow.click();
    // Use exact match to avoid matching "No external sources matching the selected external..."
    await expect(this.page.getByText('Selected External Source', { exact: true })).toBeVisible({ timeout: 10000 });
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

  async uploadExternalSource(
    inputFilePath: string = this.externalSourceFilePath,
    validateUpload: boolean = true,
    handleUniquenessViolation: boolean = true,
  ) {
    await this.goto();
    // goto() now waits for a concrete anchor element, so the page (and the file input) is settled
    // before we interact — no fixed sleep needed.
    await this.fillInputFile(inputFilePath);

    // Wait for upload button to be enabled
    await expect(this.uploadButton).toBeEnabled({ timeout: 10000 });
    await this.uploadButton.click();

    // Check if a uniqueness violation occurred (source already exists). The waitFor below already
    // polls for the response, so no fixed sleep is needed here.
    const uniquenessViolation = this.page.getByLabel('Uniqueness violation.');
    const hasUniquenessViolation = await uniquenessViolation
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (hasUniquenessViolation && handleUniquenessViolation) {
      // Source already exists - find it in the table and select it
      // Extract the source key from the JSON file content by reading the filename pattern
      const filename = inputFilePath.split('/').pop() || inputFilePath;
      // Wait for table to be visible first
      await this.externalSourcesTable.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      // Try to find the source by filename substring in the table (the key contains the filename)
      const sourceCell = this.externalSourcesTable.getByRole('gridcell', { name: filename });
      const sourceExists = await sourceCell
        .first()
        .isVisible()
        .catch(() => false);
      if (sourceExists) {
        await sourceCell.first().click();
        // Wait for selection to complete
        await this.page
          .locator('.external-source-header')
          .waitFor({ state: 'visible', timeout: 5000 })
          .catch(() => {});
      }
    }

    if (validateUpload) {
      // Wait for the source to be selected by checking for the source header div. Allow generous
      // time: on a loaded CI backend the create + selection round-trip can exceed 10s.
      await expect(this.page.locator('.external-source-header')).toBeVisible({ timeout: 20000 });
    }
  }

  async waitForToast(message: string, timeout: number = 10000) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout });
  }
}
