import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export enum DictionaryType {
  CommandDictionary = 'Command Dictionary',
  ChannelDictionary = 'Channel Dictionary',
  ParameterDictionary = 'Parameter Dictionary',
  SequenceAdaptation = 'Sequence Adaptation',
}

export const COMMAND_DICTIONARY_PATH = 'e2e-tests/data/command-dictionary.xml';

export class Dictionaries {
  channelDictionaryBuffer: Buffer;
  channelDictionaryName: string;
  channelDictionaryPath: string = 'e2e-tests/data/channel-dictionary.xml';
  channelDictionaryTableRow: Locator;
  channelDictionaryTableRowDeleteButton: Locator;
  commandDictionaryBuffer: Buffer;
  commandDictionaryName: string;
  commandDictionaryTableRow: Locator;
  commandDictionaryTableRowDeleteButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  inputFile: Locator;
  parameterDictionaryBuffer: Buffer;
  parameterDictionaryName: string;
  parameterDictionaryPath: string = 'e2e-tests/data/parameter-dictionary.xml';
  parameterDictionaryTableRow: Locator;
  parameterDictionaryTableRowDeleteButton: Locator;
  sequenceAdaptationBuffer: Buffer;
  sequenceAdaptationPath: string = 'e2e-tests/data/sequence-adaptation.js';
  sequenceAdaptationTableRow: Locator;
  sequenceAdaptationTableRowCount: number;
  sequenceAdaptationTableRowDeleteButton: Locator;
  sequenceAdaptationTableRows: Locator;

  constructor(public page: Page) {
    this.channelDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.channelDictionaryBuffer = this.readDictionary(this.channelDictionaryName, this.channelDictionaryPath);
    this.commandDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.commandDictionaryBuffer = this.readDictionary(this.commandDictionaryName, COMMAND_DICTIONARY_PATH);
    this.parameterDictionaryName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.parameterDictionaryBuffer = this.readDictionary(this.parameterDictionaryName, this.parameterDictionaryPath);
    this.sequenceAdaptationBuffer = this.readDictionary(DictionaryType.SequenceAdaptation, this.sequenceAdaptationPath);

    this.page = page;
  }

  async createChannelDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.ChannelDictionary, this.channelDictionaryName);

    await this.createDictionary(
      this.channelDictionaryBuffer,
      this.channelDictionaryName,
      this.channelDictionaryTableRow,
      DictionaryType.ChannelDictionary,
    );
  }

  async createCommandDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.CommandDictionary, this.commandDictionaryName);

    await this.createDictionary(
      this.commandDictionaryBuffer,
      this.commandDictionaryName,
      this.commandDictionaryTableRow,
      DictionaryType.CommandDictionary,
    );
  }

  private async createDictionary(
    dictionaryBuffer: Buffer,
    dictionaryName: string,
    tableRow: Locator,
    type: DictionaryType,
  ): Promise<void> {
    // TODO: Remove this conditional when we add Sequence Adaptation names and we can tie to a specific row.
    if (type !== DictionaryType.SequenceAdaptation) {
      await expect(tableRow).not.toBeVisible();
    }

    await this.fillInputFile(dictionaryBuffer, dictionaryName);
    await this.createButton.click();
    await tableRow.waitFor({ state: 'attached' });
    await tableRow.waitFor({ state: 'visible' });
    await expect(tableRow).toBeVisible();
  }

  async createParameterDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.ParameterDictionary, this.parameterDictionaryName);

    await this.createDictionary(
      this.parameterDictionaryBuffer,
      this.parameterDictionaryName,
      this.parameterDictionaryTableRow,
      DictionaryType.ParameterDictionary,
    );
  }

  async createSequenceAdaptation(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.SequenceAdaptation);

    this.createDictionary(
      this.sequenceAdaptationBuffer,
      'Sequence Adaptation',
      this.sequenceAdaptationTableRow,
      DictionaryType.SequenceAdaptation,
    );
  }

  async deleteChannelDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.ChannelDictionary, this.channelDictionaryName);

    await this.deleteDictionary(
      this.channelDictionaryTableRow,
      this.channelDictionaryTableRowDeleteButton,
      DictionaryType.ChannelDictionary,
    );
  }

  async deleteCommandDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.CommandDictionary, this.commandDictionaryName);

    await this.deleteDictionary(
      this.commandDictionaryTableRow,
      this.commandDictionaryTableRowDeleteButton,
      DictionaryType.CommandDictionary,
    );
  }

  /**
   * @note Automatically cascade deletes any dependent expansion rules and expansion sets.
   */
  private async deleteDictionary(tableRow: Locator, tableRowDeleteButton: Locator, type: DictionaryType) {
    await expect(tableRow).toBeVisible();
    await expect(tableRowDeleteButton).not.toBeVisible();

    await tableRow.hover();
    await tableRowDeleteButton.waitFor({ state: 'attached' });
    await tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await tableRowDeleteButton.click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();

    // TODO: Remove this conditional when we add Sequence Adaptation names and we can tie to a specific row.
    if (type !== DictionaryType.SequenceAdaptation) {
      await tableRow.waitFor({ state: 'detached' });
      await tableRow.waitFor({ state: 'hidden' });
      await expect(tableRow).not.toBeVisible();
    } else {
      // This will never go below 0.
      expect(Math.max(0, (await this.sequenceAdaptationTableRows.count()) - 1)).toEqual(
        this.sequenceAdaptationTableRowCount,
      );
    }
  }

  async deleteParameterDictionary(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.ParameterDictionary, this.parameterDictionaryName);

    await this.deleteDictionary(
      this.parameterDictionaryTableRow,
      this.parameterDictionaryTableRowDeleteButton,
      DictionaryType.ParameterDictionary,
    );
  }

  async deleteSequenceAdaptation(): Promise<void> {
    await this.updatePage(this.page, DictionaryType.SequenceAdaptation);

    await this.deleteDictionary(
      this.sequenceAdaptationTableRow,
      this.sequenceAdaptationTableRowDeleteButton,
      DictionaryType.SequenceAdaptation,
    );
  }

  private async fillInputFile(dictionaryBuffer: Buffer, dictionaryName: string) {
    await this.inputFile.focus();
    await this.inputFile.setInputFiles({
      buffer: dictionaryBuffer,
      mimeType: 'application/xml',
      name: dictionaryName,
    });
    await this.inputFile.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/dictionaries', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  private readDictionary(dictionaryName: string, dictionaryPath: string): Buffer {
    const dictionaryFile = readFileSync(dictionaryPath)
      .toString()
      .replace(/GENERIC/, dictionaryName);
    const dictionary = dictionaryFile.toString().replace(/GENERIC/, dictionaryName);

    return Buffer.from(dictionary);
  }

  private async updatePage(
    page: Page,
    dictionaryType: DictionaryType,
    dictionaryName?: string | undefined,
  ): Promise<void> {
    this.page = page;

    this.confirmModal = this.page.locator(`.modal:has-text("Delete ${dictionaryType}")`);
    this.confirmModalDeleteButton = this.page.locator(
      `.modal:has-text("Delete ${dictionaryType}") >> button:has-text("Delete")`,
    );
    this.createButton = this.page.locator(`button:has-text("Create")`);
    this.inputFile = this.page.locator('input[name="file"]');

    // TODO: Sequence Adaptations don't have a name, so skip this for these tests. Can be cleaned up when we add names.
    if (dictionaryName !== undefined) {
      this.channelDictionaryTableRow = this.page.locator(`.ag-row:has-text("${dictionaryName}")`);
      this.channelDictionaryTableRowDeleteButton = this.page.locator(
        `.ag-row:has-text("${dictionaryName}") >> button[aria-label="Delete ${DictionaryType.ChannelDictionary}"]`,
      );

      this.commandDictionaryTableRow = this.page.locator(`.ag-row:has-text("${dictionaryName}")`);
      this.commandDictionaryTableRowDeleteButton = this.page.locator(
        `.ag-row:has-text("${dictionaryName}") >> button[aria-label="Delete ${DictionaryType.CommandDictionary}"]`,
      );

      this.parameterDictionaryTableRow = this.page.locator(`.ag-row:has-text("${dictionaryName}")`);
      this.parameterDictionaryTableRowDeleteButton = this.page.locator(
        `.ag-row:has-text("${dictionaryName}") >> button[aria-label="Delete ${DictionaryType.ParameterDictionary}"]`,
      );
    } else {
      this.sequenceAdaptationTableRows = this.page
        .locator('.panel', { hasText: 'Sequence Adaptations' })
        .locator('.body .ag-row');
      this.sequenceAdaptationTableRowCount = await this.sequenceAdaptationTableRows.count();
      this.sequenceAdaptationTableRow = this.sequenceAdaptationTableRows.first();
      this.sequenceAdaptationTableRowDeleteButton = this.sequenceAdaptationTableRow.locator(
        `button[aria-label="Delete ${DictionaryType.SequenceAdaptation}"]`,
      );
    }
  }
}
