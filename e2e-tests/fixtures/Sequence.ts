import { Locator, Page, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Sequence {
  command: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  detailPane: Locator;
  editor: Locator;
  jsonEditor: Locator;
  jsonImport: Locator;
  jsonPath: string = 'e2e-tests/data/ban00001.json';
  linter: Locator;
  parcel: Locator;
  sequenceName: string;
  sequenceNameTextbox: Locator;
  sequenceTable: Locator;
  sequenceTableRow: Locator;
  sequenceTableRowDeleteButton: Locator;
  workspaceModal: Locator;
  workspaceName: string;
  workspaceNameTextbox: Locator;
  workspaceTable: Locator;
  workspaceTableRow: Locator;

  constructor(public page: Page) {}

  async createSequence(workspaceName: string, parcelName: string): Promise<string> {
    await this.filterTable(this.workspaceTable, this.workspaceName);
    await this.workspaceTableRow.click();

    await this.page.locator('button:has-text("New")').click();
    await this.page.waitForURL('/sequencing/new?workspaceId=**');

    // select parcel
    this.updatePage(this.page);
    await this.parcel.selectOption(parcelName);

    // name sequence
    await this.sequenceNameTextbox.click();
    this.sequenceName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    await this.sequenceNameTextbox.fill(this.sequenceName);
    await this.sequenceNameTextbox.press('Enter');

    // add text to editor
    await this.editor.click();
    await this.editor.fill('C FSW_CMD_0');
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.waitForURL('/sequencing/edit/**?workspaceId=**');
    await this.page.getByRole('button', { name: 'Close' }).click();

    this.updatePage(this.page);
    await this.sequenceTable.waitFor({ state: 'attached' });
    await this.sequenceTable.waitFor({ state: 'visible' });

    return this.sequenceName;
  }

  async createWorkspace(): Promise<string> {
    await this.page.locator('button:has-text("Create Workspace")').click();

    this.updatePage(this.page);

    await expect(this.workspaceModal).toBeVisible();
    await this.workspaceNameTextbox.click();
    this.workspaceName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    await this.workspaceNameTextbox.fill(this.workspaceName);
    await this.page.locator('button:has-text("Save Workspace")').click();

    await expect(this.workspaceModal).not.toBeVisible();

    this.updatePage(this.page);
    await this.workspaceTableRow.waitFor({ state: 'attached' });
    await this.workspaceTableRow.waitFor({ state: 'visible' });

    return this.workspaceName;
  }

  async deleteSequence() {
    await this.filterTable(this.sequenceTable, this.sequenceName);

    await this.sequenceTableRow.hover();
    await expect(this.sequenceTableRow.locator('.actions-cell')).toBeVisible();
    await this.sequenceTableRowDeleteButton.click({ position: { x: 2, y: 2 } });

    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.sequenceTableRow.waitFor({ state: 'detached' });
    await this.sequenceTableRow.waitFor({ state: 'hidden' });
    await expect(this.sequenceTableRow).not.toBeVisible();
  }

  private async filterTable(table: Locator, itemName: string) {
    await table.waitFor({ state: 'attached' });
    await table.waitFor({ state: 'visible' });

    const nameColumnHeader = await table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(itemName);
    await expect(table.getByRole('row', { name: itemName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/sequencing', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async importSeqJson() {
    await this.sequenceTableRow.hover();
    await this.page.getByRole('button', { name: 'Edit Sequence' }).click();

    await this.page.waitForURL(/sequencing\/edit\/\d+/);
    await this.page.waitForTimeout(1000);
    this.updatePage(this.page);

    // import json
    const jsonFile = readFileSync(this.jsonPath);
    const jsonBuffer = Buffer.from(jsonFile);

    await this.jsonImport.focus();
    await this.jsonImport.setInputFiles({
      buffer: jsonBuffer,
      mimeType: 'application/json',
      name: 'json',
    });
    await this.jsonImport.evaluate(e => e.blur());

    // verify import worked
    await this.page
      .getByText(
        `@ID "testDescription"

    C ECHO "TEST1" # a description
    R00:00:01 FSW_CMD # fsw command description
    @MODEL "cmd" TRUE "00:00:00"
    C FSW_CMD_1
    C FSW_CMD_2 10 "ENUM" # fsw cmd 2 description`,
      )
      .isVisible();

    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  async modifySequence() {
    await this.sequenceTableRow.hover();
    await this.page.getByRole('button', { name: 'Edit Sequence' }).click();

    await this.page.waitForURL(/sequencing\/edit\/\d+/);
    await this.page.waitForTimeout(1000);
    this.updatePage(this.page);
    expect(await this.linter.count()).toBe(1);

    await this.command.click();
    await this.page.getByRole('button', { name: 'Add Missing Arguments' }).click();
    await this.page.waitForTimeout(1000);

    expect(await this.linter.count()).toBe(0);
    await expect(this.command).toHaveText('C FSW_CMD_0 "ON" false 1');
    await this.page
      .locator('fieldset')
      .filter({ hasText: 'enum_arg_0 ONOFF' })
      .getByRole('combobox')
      .selectOption('OFF');

    await expect(this.command).toHaveText('C FSW_CMD_0 "OFF" false 1');

    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  async seqJsonEditor() {
    await this.sequenceTableRow.hover();
    await this.page.getByRole('button', { name: 'Edit Sequence' }).click();

    await this.page.waitForURL(/sequencing\/edit\/\d+/);
    this.updatePage(this.page);

    // open/close seqjson editor
    await this.page.getByLabel('Expand Editor').click();
    await expect(this.jsonEditor).toBeVisible();
    await this.page.getByLabel('Expand Editor').click();

    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  updatePage(page: Page) {
    this.confirmModal = page.locator(`.modal:has-text("Delete User Sequence")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.detailPane = page.locator('#ID_COMMAND_DETAIL_PANE');
    this.editor = page.locator('.cm-activeLine').first();
    this.command = this.editor.getByText(/C\s+FSW_CMD_0.*/);
    this.jsonEditor = page.getByText(`{ "id": "${this.sequenceName}`);
    this.jsonImport = page.locator('input[name="outputFile"]');
    this.linter = page.locator('.cm-lint-marker');
    this.page = page;
    this.parcel = page.locator('select[name="parcel"]');
    this.sequenceNameTextbox = page.getByPlaceholder('Enter Sequence Name');
    this.sequenceTable = page.locator('.panel:has-text("Sequences")').getByRole('treegrid');
    this.sequenceTableRow = this.sequenceTable.getByRole('row', { name: this.sequenceName });
    this.sequenceTableRowDeleteButton = this.sequenceTable
      .getByRole('gridcell')
      .getByRole('button', { name: 'Delete Sequence' });
    this.workspaceModal = this.page.locator('.modal .modal-header:has-text("Create Workspace")');
    this.workspaceNameTextbox = this.page.getByLabel('Workspace name');
    this.workspaceTable = page.locator('.panel:has-text("Sequence Workspaces")').getByRole('treegrid');
    this.workspaceTableRow = this.workspaceTable.getByRole('row', { name: this.workspaceName });
  }
}
