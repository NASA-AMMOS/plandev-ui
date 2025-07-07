import { expect, type Locator, type Page } from '@playwright/test';

export class ExternalSources {
  alertError: Locator;
  closeButton: Locator;
  deleteSourceButton: Locator;
  deleteSourceButtonConfirmation: Locator;
  derivationATypeName: string = 'DerivationA';
  derivationATypeSchema: string = 'e2e-tests/data/Schema_DerivationA.json';
  derivationBTypeName: string = 'DerivationB';
  derivationBTypeSchema: string = 'e2e-tests/data/Schema_DerivationB.json';
  derivationCTypeName: string = 'DerivationC';
  derivationCTypeSchema: string = 'e2e-tests/data/Schema_DerivationC.json';
  derivationDTypeName: string = 'DerivationD';
  derivationDTypeSchema: string = 'e2e-tests/data/Schema_DerivationD.json';
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
  derivationTestTypeSchema: string = 'e2e-tests/data/Schema_Example_Derivation.json';
  derivationTestTypeSchemaExpectedEventTypes: string[] = ['DerivationA', 'DerivationB', 'DerivationC', 'DerivationD'];
  derivationTestTypeSchemaExpectedSourceTypes: string[] = ['DerivationTest'];
  deselectEventButton: Locator;
  deselectSourceButton: Locator;
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
  externalEventTableRow: Locator;
  externalEventTypeName: string = 'ExampleEvent';
  externalSourceEmptyAttributeFilePath: string = 'e2e-tests/data/example-external-source_empty-attr.json';
  externalSourceEmptyAttributeKey: string = 'ExampleExternalSource:example-external-source_no-attr.json';
  externalSourceFileName: string = 'example-external-source.json';
  externalSourceFilePath: string = 'e2e-tests/data/example-external-source.json';
  externalSourceFilePathMissingField: string = 'e2e-tests/data/example-external-source-missing-field.json';
  externalSourceFilePathSyntaxError: string = 'e2e-tests/data/example-external-source-syntax-error.json';
  externalSourceNoAttributeFilePath: string = 'e2e-tests/data/example-external-source_no-attr.json';
  externalSourceNoAttributeKey: string = 'NoAttrSource:example-external-source_no-attr.json';
  externalSourceSelectedForm: Locator;
  externalSourceTypeName: string = 'Example External Source';
  externalSourceUpload: Locator;
  externalSourcesTable: Locator;
  inputFile: Locator;
  nameInput: Locator;
  panelExternalEventsTable: Locator;
  saveButton: Locator;
  selectEventTableView: Locator;
  toastTimeout: number = 5500; // How long to wait for a toast to disappear - they should take 5000ms, 500 extra for buffer
  uploadButton: Locator;
  viewContainedEventTypes: Locator;
  viewEventSourceMetadata: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async close() {
    await this.closeButton.click();
  }

  async createTypes(typeSchema: string, expectedSourceTypes: string[], expectedEventTypes: string[]) {
    await this.gotoTypeManager();

    const externalSourceTypeTable = await this.page.locator('.external-source-type-table');
    const externalEventTypeTable = await this.page.locator('.external-event-type-table');

    await this.page.getByRole('textbox').isVisible();
    await this.page.getByRole('textbox').focus();
    await this.page.getByRole('textbox').setInputFiles(typeSchema);
    await this.page.getByRole('textbox').evaluate(e => e.blur());

    await this.page.getByText('Source & Event Type Attribute Schema Parsed').isVisible();

    for (const expectedSourceType of expectedSourceTypes) {
      await expect(this.page.locator(`li:text("${expectedSourceType}")`)).toBeVisible();
    }
    for (const expectedEventType of expectedEventTypes) {
      await expect(this.page.locator(`li:text("${expectedEventType}")`)).toBeVisible();
    }

    await this.page.getByLabel('Upload External Source & Event Type(s)').click();

    for (const expectedSourceType of expectedSourceTypes) {
      await expect(externalSourceTypeTable.getByRole('gridcell', { name: expectedSourceType })).toBeVisible();
    }
    for (const expectedEventType of expectedEventTypes) {
      await expect(externalEventTypeTable.getByRole('gridcell', { name: expectedEventType })).toBeVisible();
    }
  }

  async deleteDerivationGroup(derivationGroupName: string) {
    const derivationGroupTable = await this.page.locator('.derivation-group-table');
    if (await derivationGroupTable.getByRole('row', { name: derivationGroupName }).isVisible()) {
      await derivationGroupTable.getByRole('row', { name: derivationGroupName }).hover();
      await derivationGroupTable
        .getByRole('row', { name: derivationGroupName })
        .getByLabel('Delete Derivation Group')
        .click();
      await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
      await expect(derivationGroupTable.getByRole('row', { name: derivationGroupName })).not.toBeVisible();
    }
  }

  async deleteExternalEventType(eventTypeName: string) {
    const externalEventTypeTable = await this.page.locator('.external-event-type-table');
    if (await externalEventTypeTable.getByRole('row', { name: eventTypeName }).isVisible()) {
      await externalEventTypeTable.getByRole('row', { name: eventTypeName }).hover();
      await externalEventTypeTable
        .getByRole('row', { name: eventTypeName })
        .getByLabel('Delete External Event Type')
        .click();
      await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
      await expect(externalEventTypeTable.getByRole('row', { name: eventTypeName })).not.toBeVisible();
    }
  }

  async deleteExternalSourceType(sourceTypeName: string) {
    const externalSourceTypeTable = await this.page.locator('.external-source-type-table');
    if (await externalSourceTypeTable.getByRole('row', { name: sourceTypeName }).isVisible()) {
      await externalSourceTypeTable.getByRole('row', { name: sourceTypeName }).hover();
      await externalSourceTypeTable
        .getByRole('row', { name: sourceTypeName })
        .getByLabel('Delete External Source Type')
        .click();
      await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
      await expect(externalSourceTypeTable.getByRole('row', { name: sourceTypeName })).not.toBeVisible();
    }
  }

  async deleteSource(sourceKey: string) {
    // Only delete a source if its visible in the table

    if (await this.externalSourcesTable.getByRole('gridcell', { name: sourceKey }).isVisible()) {
      await this.selectSource(sourceKey);
      await this.deleteSourceButton.click();
      await this.deleteSourceButtonConfirmation.click();
      await expect(this.externalSourcesTable.getByRole('gridcell', { name: sourceKey })).not.toBeVisible();
    }
  }

  async fillInputFile(externalSourceFilePath: string) {
    await this.inputFile.focus();
    await this.inputFile.setInputFiles(externalSourceFilePath);
    await this.inputFile.evaluate(e => e.blur());
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
    await this.page.goto('/external-sources', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async gotoTypeManager() {
    await this.page.goto('/external-sources/types', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async linkDerivationGroup(derivationGroupName: string, sourceTypeName: string) {
    // Assumes the Manage Derivation Groups modal is already showing
    await this.page.getByRole('row', { name: derivationGroupName }).getByRole('checkbox').check();
    await expect(this.page.getByRole('row', { name: derivationGroupName }).getByRole('checkbox')).toBeChecked();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
    await expect(this.page.getByRole('button', { exact: true, name: sourceTypeName })).toBeVisible();
  }

  async selectEvent(eventName: string, sourceName: string = 'example-external-source.json') {
    await this.goto();
    await this.selectSource(sourceName);
    await this.page.getByRole('gridcell', { name: eventName }).click();
  }

  async selectSource(sourceName: string = 'example-external-source.json') {
    await this.goto();
    await this.page.getByRole('gridcell', { name: sourceName }).click();
    await expect(this.page.getByText('Selected External Source')).toBeVisible();
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

  async updatePage(page: Page): Promise<void> {
    this.inputFile = page.locator('input[name="file"]');
    this.uploadButton = page.getByRole('button', { name: 'Upload' });
    this.externalEventSelectedForm = page.locator('.external-event-form-container');
    this.externalSourceSelectedForm = page.locator('.selected-external-source-details');
    this.alertError = page.locator('.alert-error');
    this.deselectEventButton = page.locator('[name="DeselectEvent"]');
    this.deselectSourceButton = page.getByLabel('Deselect Source');
    this.deleteSourceButton = page.getByRole('button', { exact: true, name: 'Delete external source' });
    this.deleteSourceButtonConfirmation = page.getByRole('button', { exact: true, name: 'Delete' });
    this.selectEventTableView = page.locator('[name="SelectEventViewType"]');
    this.externalEventTableHeaderEventType = page.getByText('Event Type', { exact: true });
    this.externalEventTableHeaderDuration = page.getByText('Duration');
    this.viewContainedEventTypes = page.getByRole('button', { name: 'View Contained Event Types' });
    this.viewEventSourceMetadata = page.getByRole('button', { name: 'View Event Source Metadata' });
    this.panelExternalEventsTable = page.locator('[data-component-name="ExternalEventsTablePanel"]');
    this.externalSourcesTable = page.locator('#external-sources-table');
  }

  async uploadExternalSource(inputFilePath: string = this.externalSourceFilePath, validateUpload: boolean = true) {
    await this.goto();
    await this.fillInputFile(inputFilePath);
    // Wait for all errors to disappear, assuming stores are just taking time to load
    await this.page.getByLabel('please create one before uploading an external source').waitFor({ state: 'hidden' });
    await this.page.getByLabel('Please create it!').waitFor({ state: 'hidden' });
    await this.uploadButton.click();
    if (validateUpload) {
      await expect(this.page.getByText('Selected External Source')).toBeVisible();
    }
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
