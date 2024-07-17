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
  table: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page) {}

  async createSequence(parcelName: string): Promise<string> {
    await this.page.locator('button:has-text("New")').click();
    await this.page.waitForURL('/sequencing/new');

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
    await this.page.getByRole('button', { name: 'Close' }).click();

    this.updatePage(this.page);
    await this.tableRow.waitFor({ state: 'attached' });
    await this.tableRow.waitFor({ state: 'visible' });

    return this.sequenceName;
  }

  async deleteSequence() {
    await this.filterTable(this.sequenceName);

    await this.tableRow.hover();
    await expect(this.tableRow.locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton.click({ position: { x: 2, y: 2 } });

    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow.waitFor({ state: 'detached' });
    await this.tableRow.waitFor({ state: 'hidden' });
    await expect(this.tableRow).not.toBeVisible();
  }

  private async filterTable(sequenceName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(sequenceName);
    await expect(this.table.getByRole('row', { name: sequenceName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/sequencing', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async importSeqJson() {
    await this.tableRow.hover();
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
    await this.tableRow.hover();
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
    await this.detailPane.getByRole('combobox').selectOption('OFF');

    await expect(this.command).toHaveText('C FSW_CMD_0 "OFF" false 1');

    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.page.getByRole('button', { name: 'Close' }).click();
  }

  async seqJsonEditor() {
    await this.tableRow.hover();
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
    this.table = page.locator('.panel:has-text("Sequences")').getByRole('treegrid');
    this.tableRow = this.table.getByRole('row', { name: this.sequenceName });
    this.tableRowDeleteButton = this.tableRow.getByRole('gridcell').getByRole('button', { name: 'Delete Sequence' });
  }
}
