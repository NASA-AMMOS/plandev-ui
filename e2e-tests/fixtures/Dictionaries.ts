import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export enum DictionaryType {
  CommandDictionary = 'Command Dictionary',
  ChannelDictionary = 'Channel Dictionary',
  ParameterDictionary = 'Parameter Dictionary',
  SequenceAdaptation = 'Sequence Adaptation',
}

export const COMMAND_DICTIONARY_PATH = 'e2e-tests/data/command-dictionary.xml';

export class Dictionaries {
  channelDictionaryName: string;
  channelDictionaryPath: string = 'e2e-tests/data/channel-dictionary.xml';
  channelDictionaryTable: Locator;
  channelDictionaryTableRow: Locator;
  channelDictionaryTableRowDeleteButton: Locator;
  commandDictionaryName: string;
  commandDictionaryTable: Locator;
  commandDictionaryTableRow: Locator;
  commandDictionaryTableRowDeleteButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  inputFile: Locator;
  parameterDictionaryName: string;
  parameterDictionaryPath: string = 'e2e-tests/data/parameter-dictionary.xml';
  parameterDictionaryTable: Locator;
  parameterDictionaryTableRow: Locator;
  parameterDictionaryTableRowDeleteButton: Locator;
  sequenceAdaptationName: string;
  sequenceAdaptationNameInputField: Locator;
  sequenceAdaptationPath: string = 'e2e-tests/data/sequence-adaptation.js';
  sequenceAdaptationTable: Locator;
  sequenceAdaptationTableRow: Locator;
  sequenceAdaptationTableRowDeleteButton: Locator;
  sequenceAdaptationTableRows: Locator;

  constructor(public page: Page) {
    this.channelDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.commandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.parameterDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.sequenceAdaptationName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

    this.updatePage(this.page);
  }

  async createChannelDictionary(
    dictionaryName: string = this.channelDictionaryName,
    dictionaryPath: string = this.channelDictionaryPath,
  ): Promise<void> {
    this.channelDictionaryTableRow = this.channelDictionaryTable.getByRole('row', { name: dictionaryName });

    const dictionaryBuffer = await this.readDictionary(dictionaryName, dictionaryPath);
    await this.createDictionary(
      dictionaryBuffer,
      dictionaryName,
      this.channelDictionaryTable,
      this.channelDictionaryTableRow,
      DictionaryType.ChannelDictionary,
    );

    this.confirmModal = this.page.locator(`.modal:has-text("Delete ${DictionaryType.ChannelDictionary}")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.channelDictionaryTableRowDeleteButton = this.channelDictionaryTableRow
      .getByRole('gridcell')
      .getByRole('button', { name: `Delete ${DictionaryType.ChannelDictionary}` });
  }

  async createCommandDictionary(
    dictionaryName: string = this.commandDictionaryName,
    dictionaryPath: string = COMMAND_DICTIONARY_PATH,
  ): Promise<void> {
    this.commandDictionaryTableRow = this.commandDictionaryTable.getByRole('row', { name: dictionaryName });

    const dictionaryBuffer = await this.readDictionary(dictionaryName, dictionaryPath);
    await this.createDictionary(
      dictionaryBuffer,
      dictionaryName,
      this.commandDictionaryTable,
      this.commandDictionaryTableRow,
      DictionaryType.CommandDictionary,
    );

    this.confirmModal = this.page.locator(`.modal:has-text("Delete ${DictionaryType.CommandDictionary}")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.commandDictionaryTableRowDeleteButton = this.commandDictionaryTable
      .getByRole('gridcell')
      .getByRole('button', { name: `Delete ${DictionaryType.CommandDictionary}` });
  }

  async createDictionary(
    dictionaryBuffer: Buffer,
    dictionaryName: string,
    table: Locator,
    tableRow: Locator,
    type: DictionaryType,
  ): Promise<void> {
    await this.fillInputFile(dictionaryBuffer, dictionaryName, type);

    if (type === DictionaryType.SequenceAdaptation) {
      await expect(this.sequenceAdaptationNameInputField).toBeVisible();
      await this.sequenceAdaptationNameInputField.fill(this.sequenceAdaptationName);
    }

    await this.createButton.click();
    await this.filterTable(table, dictionaryName, type);
    await tableRow.waitFor({ state: 'attached' });
    await tableRow.waitFor({ state: 'visible' });
    await expect(tableRow).toBeVisible();
  }

  async createParameterDictionary(
    dictionaryName: string = this.parameterDictionaryName,
    dictionaryPath: string = this.parameterDictionaryPath,
  ): Promise<void> {
    this.parameterDictionaryTableRow = this.parameterDictionaryTable.getByRole('row', {
      name: dictionaryName,
    });

    const dictionaryBuffer = await this.readDictionary(dictionaryName, dictionaryPath);
    await this.createDictionary(
      dictionaryBuffer,
      dictionaryName,
      this.parameterDictionaryTable,
      this.parameterDictionaryTableRow,
      DictionaryType.ParameterDictionary,
    );

    this.confirmModal = this.page.locator(`.modal:has-text("Delete ${DictionaryType.ParameterDictionary}")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.parameterDictionaryTableRowDeleteButton = this.parameterDictionaryTable
      .getByRole('gridcell')
      .getByRole('button', { name: `Delete ${DictionaryType.ParameterDictionary}` });
  }

  async createSequenceAdaptation(
    sequenceName: string = this.sequenceAdaptationName,
    sequencePath: string = this.sequenceAdaptationPath,
  ): Promise<void> {
    this.sequenceAdaptationTableRow = this.sequenceAdaptationTable.getByRole('row', {
      name: sequenceName,
    });
    this.sequenceAdaptationNameInputField = this.page.getByRole('textbox', { name: 'Enter Sequence Adaptation Name' });
    const dictionaryBuffer = await this.readDictionary(sequenceName, sequencePath);
    await this.createDictionary(
      dictionaryBuffer,
      sequenceName,
      this.sequenceAdaptationTable,
      this.sequenceAdaptationTableRow,
      DictionaryType.SequenceAdaptation,
    );

    this.confirmModal = this.page.locator(`.modal:has-text("Delete ${DictionaryType.SequenceAdaptation}")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.sequenceAdaptationTableRowDeleteButton = this.sequenceAdaptationTable
      .getByRole('gridcell')
      .getByRole('button', { name: `Delete ${DictionaryType.SequenceAdaptation}` });
  }

  async deleteChannelDictionary(): Promise<void> {
    await this.filterTable(this.channelDictionaryTable, this.channelDictionaryName, DictionaryType.ChannelDictionary);
    await this.deleteDictionary(this.channelDictionaryTableRow, this.channelDictionaryTableRowDeleteButton);
  }

  async deleteCommandDictionary(): Promise<void> {
    await this.filterTable(this.commandDictionaryTable, this.commandDictionaryName, DictionaryType.CommandDictionary);

    await this.deleteDictionary(this.commandDictionaryTableRow, this.commandDictionaryTableRowDeleteButton);
  }

  /**
   * @note Automatically cascade deletes any dependent expansion rules and expansion sets.
   */
  private async deleteDictionary(tableRow: Locator, tableRowDeleteButton: Locator) {
    await expect(tableRow).toBeVisible();

    await tableRow.hover();
    await expect(tableRow.locator('.actions-cell')).toBeVisible();
    await tableRowDeleteButton.waitFor({ state: 'attached' });
    await tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await tableRowDeleteButton.click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();

    await tableRow.waitFor({ state: 'detached' });
    await tableRow.waitFor({ state: 'hidden' });
    await expect(tableRow).not.toBeVisible();
  }

  async deleteParameterDictionary(): Promise<void> {
    await this.filterTable(
      this.parameterDictionaryTable,
      this.parameterDictionaryName,
      DictionaryType.ParameterDictionary,
    );
    await this.deleteDictionary(this.parameterDictionaryTableRow, this.parameterDictionaryTableRowDeleteButton);
  }

  async deleteSequenceAdaptation(): Promise<void> {
    await this.filterTable(
      this.sequenceAdaptationTable,
      this.sequenceAdaptationName,
      DictionaryType.SequenceAdaptation,
    );
    await this.deleteDictionary(this.sequenceAdaptationTableRow, this.sequenceAdaptationTableRowDeleteButton);
  }

  private async fillInputFile(dictionaryBuffer: Buffer, dictionaryName: string, type: DictionaryType) {
    let mimeType: string;
    let name: string;

    if (type === DictionaryType.SequenceAdaptation) {
      mimeType = 'application/x-javascript';
      name = dictionaryName + '.js';
    } else {
      mimeType = 'application/xml';
      name = dictionaryName + '.xml';
    }

    await this.page.waitForTimeout(1000);
    await this.inputFile.focus();
    await this.inputFile.setInputFiles({
      buffer: dictionaryBuffer,
      mimeType,
      name,
    });
    await this.inputFile.blur();
  }

  private async filterTable(table: Locator, dictionaryName: string, type: DictionaryType) {
    await table.waitFor({ state: 'attached' });
    await table.waitFor({ state: 'visible' });
    let nameColumnHeader: Locator | undefined = undefined;

    if (type === DictionaryType.SequenceAdaptation) {
      nameColumnHeader = table.getByRole('columnheader', { name: 'Name' });
    } else {
      nameColumnHeader = table.getByRole('columnheader', { name: 'Mission' });
    }

    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-filter');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(dictionaryName);
    await expect(table.getByRole('row', { name: dictionaryName })).toBeVisible();
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(250);
  }

  async goto() {
    await this.page.goto('/dictionaries', { waitUntil: 'load' });
    await this.page.waitForTimeout(250);
  }

  async readDictionary(dictionaryName: string, dictionaryPath: string): Promise<Buffer> {
    try {
      const dictionaryBuffer = await readFile(dictionaryPath);
      const dictionaryFile = dictionaryBuffer.toString().replace(/GENERIC/, dictionaryName);

      return Buffer.from(dictionaryFile);
    } catch (error) {
      console.error('Error reading dictionary', error);
      throw error;
    }
  }

  async updatePage(page: Page): Promise<void> {
    this.page = page;
    this.createButton = this.page.locator(`button:has-text("Create")`);
    this.inputFile = this.page.locator('input[name="file"]');

    this.channelDictionaryTable = this.page
      .locator('div[role="tabpanel"]:has-text("Channel Dictionaries")')
      .getByRole('treegrid');

    this.commandDictionaryTable = this.page
      .locator('div[role="tabpanel"]:has-text("Command Dictionaries")')
      .getByRole('treegrid');

    this.parameterDictionaryTable = this.page
      .locator('div[role="tabpanel"]:has-text("Parameter Dictionaries")')
      .getByRole('treegrid');

    this.sequenceAdaptationTable = this.page
      .locator('div[role="tabpanel"]:has-text("Sequence Adaptations")')
      .getByRole('treegrid');
  }
}
