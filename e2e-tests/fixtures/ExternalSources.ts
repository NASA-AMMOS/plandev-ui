import { expect, type Locator, type Page } from '@playwright/test';

export class ExternalSources {
  alertError: Locator;
  closeButton: Locator;
  createTypesButton: Locator;
  createTypesModal: Locator;
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
  derivationTestGroupName: string = 'Derivation Test Default';
  derivationTestSourceType: string = 'Derivation Test';
  derivationTestSourceTypeName: string = 'Derivation Test';
  derivationTestSourceTypeSchema: string = 'e2e-tests/data/Schema_Derivation-Test.json';
  deselectEventButton: Locator;
  deselectSourceButton: Locator;
  exampleDerivationGroup: string = 'Example External Source Default';
  exampleEventType: string = 'ExampleEvent';
  exampleSourceType: string = 'Example External Source';
  externalEventSelectedForm: Locator;
  externalEventTableHeaderDuration: Locator;
  externalEventTableHeaderEventType: Locator;
  externalEventTableRow: Locator;
  externalEventTypeName: string = 'ExampleEvent';
  externalEventTypeSchema: string = 'e2e-tests/data/Schema_ExampleEvent.json';
  externalSourceFileName: string = 'example-external-source.json';
  externalSourceFilePath: string = 'e2e-tests/data/example-external-source.json';
  externalSourceFilePathMissingField: string = 'e2e-tests/data/example-external-source-missing-field.json';
  externalSourceFilePathSyntaxError: string = 'e2e-tests/data/example-external-source-syntax-error.json';
  externalSourceSelectedForm: Locator;
  externalSourceTypeName: string = 'Example External Source';
  externalSourceTypeSchema: string = 'e2e-tests/data/Schema_Example-External-Source.json';
  externalSourceUpload: Locator;
  externalSourcesTable: Locator;
  inputFile: Locator;
  manageGroupsAndTypesButton: Locator;
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

  async createType(typeName: string, typeSchema: string, isSourceType: boolean) {
    await this.createTypesButton.click();
    await expect(this.createTypesModal).toBeVisible();
    if (isSourceType) {
      await this.page.getByRole('radio', { name: 'External Source Type' }).click();
    }
    await this.page.getByPlaceholder('New Type Name').fill(typeName);
    await this.page.locator('#svelte-modal input[name="file"]').focus();
    await this.page.locator('#svelte-modal input[name="file"]').setInputFiles(typeSchema);
    await this.page.locator('#svelte-modal input[name="file"]').evaluate(e => e.blur());
    await this.page.getByRole('button', { exact: true, name: 'Create' }).click();
    if (isSourceType) {
      await this.waitForToast('External Source Type Created Successfully');
    } else {
      await this.waitForToast('External Event Type Created Successfully');
    }
    await expect(this.createTypesModal).not.toBeVisible();
  }
  async deleteDerivationGroup(derivationGroupName: string) {
    await this.page.getByRole('button', { exact: true, name: 'Derivation Group' }).click();
    await this.page.getByRole('row', { name: derivationGroupName }).hover();
    await this.page.getByRole('row', { name: derivationGroupName }).getByLabel('Delete Derivation Group').click();
    await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
    await expect(this.page.getByRole('row', { name: derivationGroupName })).not.toBeVisible();
  }

  async deleteExternalEventType(eventTypeName: string) {
    await this.page.getByRole('button', { exact: true, name: 'External Event Type' }).click();
    await this.page.getByRole('row', { name: eventTypeName }).hover();
    await this.page.getByRole('row', { name: eventTypeName }).getByLabel('Delete External Event Type').click();
    await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
    await expect(this.page.getByRole('row', { name: eventTypeName })).not.toBeVisible();
  }

  async deleteExternalSourceType(sourceTypeName: string) {
    await this.page.getByRole('button', { exact: true, name: 'External Source Type' }).click();
    await this.page.getByRole('row', { name: sourceTypeName }).hover();
    await this.page.getByRole('row', { name: sourceTypeName }).getByLabel('Delete External Source Type').click();
    await this.page.getByRole('button', { exact: true, name: 'Delete' }).click();
    await expect(this.page.getByRole('row', { name: sourceTypeName })).not.toBeVisible();
  }

  async deleteSource(sourceName: string) {
    // Only delete a source if its visible in the table
    if (await this.page.getByRole('gridcell', { name: sourceName }).first().isVisible()) {
      await this.selectSource(sourceName);
      await this.deleteSourceButton.click();
      await this.deleteSourceButtonConfirmation.click();
      await expect(this.externalSourcesTable.getByText(sourceName)).not.toBeVisible();
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

  async linkDerivationGroup(derivationGroupName: string, sourceTypeName: string) {
    // Assumes the Manage Derivation Groups modal is already showing
    await this.page.getByRole('row', { name: derivationGroupName }).getByRole('checkbox').click();
    await this.page.getByRole('button', { name: 'Update' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
    await expect(this.page.getByRole('button', { exact: true, name: sourceTypeName })).toBeVisible();
  }

  async selectEvent(eventName: string, sourceName: string = 'example-external-source.json') {
    // Assumes the selected source was the test source, and selects the specific event from it
    // NOTE: This may not be the case, and should be re-visited when we implement deletion for External Sources!
    await this.selectSource(sourceName);
    await this.page.getByRole('gridcell', { name: eventName }).click();
  }

  async selectSource(sourceName: string = 'example-external-source.json') {
    // Always selects the first source with the example's source type in the table
    await this.page.getByRole('gridcell', { name: sourceName }).first().click();
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
    this.createTypesButton = page.getByLabel('Create external source types or external event types.');
    this.manageGroupsAndTypesButton = page.getByLabel('Manage and inspect existing');
    this.createTypesModal = page.locator(`.modal:has-text("Create New External Source/Event Types")`);
  }

  async uploadExternalSource(
    inputFilePath: string = this.externalSourceFilePath,
    inputFileName: string = this.externalSourceFileName,
  ) {
    await this.fillInputFile(inputFilePath);
    // Wait for all errors to disappear, assuming stores are just taking time to load
    await this.page.getByLabel('please create one before uploading an external source').waitFor({ state: 'hidden' });
    await this.page.getByLabel('Please create it!').waitFor({ state: 'hidden' });
    await this.uploadButton.click();
    await this.waitForToast('External Source Created Successfully');
    await expect(this.externalSourcesTable).toBeVisible();
    await expect(this.externalSourcesTable.getByRole('gridcell', { name: inputFileName })).toBeVisible();
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
