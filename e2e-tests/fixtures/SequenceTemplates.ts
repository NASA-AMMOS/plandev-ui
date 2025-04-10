import { expect, Locator, Page } from '@playwright/test';
import { getOptionValueFromText } from '../utilities/selectors';
import { Models } from './Models';
import { Parcels } from './Parcels';

export class SequenceTemplates {
  confirmDeleteSequenceTemplateButton: Locator;
  createNewSequenceTemplateButton: Locator;
  deleteSequenceTemplateButton: Locator;
  editor: Locator;
  newSequenceTemplateActivityTypeInput: Locator;
  newSequenceTemplateActivityTypeSelector: string = 'select[name="activityType"]';
  newSequenceTemplateButton: Locator;
  newSequenceTemplateLanguageInput: Locator;
  newSequenceTemplateModelIdInput: Locator;
  newSequenceTemplateModelIdSelector: string = 'select[name="modelId"]';
  newSequenceTemplateNameInput: Locator;
  newSequenceTemplateParcelIdInput: Locator;
  newSequenceTemplateParcelIdSelector: string = 'select[name="parcelId"]';
  saveSequenceTemplateButton: Locator;
  sequenceTemplateActivityType: string = 'PeelBanana';
  sequenceTemplateEditorActiveLine: Locator;
  sequenceTemplateTable: Locator;

  constructor(
    public page: Page,
    public parcels: Parcels,
    public models: Models,
  ) {
    this.updatePage(page);
  }

  async createSequenceTemplate(newSequenceTemplateName: string, newSequenceTemplateLanguage: string) {
    await this.newSequenceTemplateButton.click();
    await this.newSequenceTemplateNameInput.fill(newSequenceTemplateName);
    await this.newSequenceTemplateLanguageInput.fill(newSequenceTemplateLanguage);

    await this.selectParcel();
    await this.selectModel();
    await this.selectActivityType();

    await this.createNewSequenceTemplateButton.click();
    await expect(this.sequenceTemplateTable).toBeVisible();
    await expect(this.sequenceTemplateTable.getByRole('gridcell', { name: newSequenceTemplateName })).toBeVisible();
  }

  async deleteSequenceTemplate(sequenceTemplateToDeleteName: string) {
    await expect(
      this.sequenceTemplateTable.getByRole('gridcell', { name: sequenceTemplateToDeleteName }),
    ).toBeVisible();
    await this.sequenceTemplateTable.getByRole('gridcell', { name: sequenceTemplateToDeleteName }).hover();
    await this.deleteSequenceTemplateButton.click();
    await this.confirmDeleteSequenceTemplateButton.click();
  }

  async goto() {
    await this.page.goto('/sequence-templates', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async selectActivityType() {
    await this.page.waitForSelector(`option:has-text("${this.sequenceTemplateActivityType}")`, { state: 'attached' });
    const value = await getOptionValueFromText(
      this.page,
      this.newSequenceTemplateActivityTypeSelector,
      this.sequenceTemplateActivityType,
    );
    await this.newSequenceTemplateActivityTypeInput.focus();
    await this.newSequenceTemplateActivityTypeInput.selectOption(value);
    await this.newSequenceTemplateActivityTypeInput.evaluate(e => e.blur());
  }

  async selectModel() {
    const { modelName, modelId } = this.models;
    await this.page.waitForSelector(`option:has-text("${modelName} (${modelId})")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.newSequenceTemplateModelIdSelector, modelName);
    await this.newSequenceTemplateModelIdInput.focus();
    await this.newSequenceTemplateModelIdInput.selectOption(value);
    await this.newSequenceTemplateModelIdInput.evaluate(e => e.blur());
  }

  async selectParcel() {
    const { parcelName } = this.parcels;
    await this.page.locator(this.newSequenceTemplateParcelIdSelector).inputValue();
    await this.page.waitForSelector(`option:has-text("${parcelName}")`, { state: 'attached' });
    const value = await getOptionValueFromText(this.page, this.newSequenceTemplateParcelIdSelector, parcelName);
    await this.newSequenceTemplateParcelIdInput.focus();
    await this.newSequenceTemplateParcelIdInput.selectOption(value);
    await this.newSequenceTemplateParcelIdInput.evaluate(e => e.blur());
  }

  updatePage(page: Page) {
    this.newSequenceTemplateActivityTypeInput = page.locator(this.newSequenceTemplateActivityTypeSelector);
    this.newSequenceTemplateButton = page.getByRole('button', { name: 'New Template' });
    this.newSequenceTemplateLanguageInput = page.getByLabel('Template Language');
    this.newSequenceTemplateModelIdInput = page.locator(this.newSequenceTemplateModelIdSelector);
    this.newSequenceTemplateNameInput = page.getByLabel('Template Name');
    this.newSequenceTemplateParcelIdInput = page.locator(this.newSequenceTemplateParcelIdSelector);
    this.createNewSequenceTemplateButton = page.getByRole('button', { name: 'Create Template' });
    this.sequenceTemplateTable = page.locator('#sequence-templates-table');
    this.sequenceTemplateEditorActiveLine = page.locator('.cm-activeLine');
    this.saveSequenceTemplateButton = page.getByLabel('Save sequence template');
    this.deleteSequenceTemplateButton = page.getByRole('button', { name: 'Delete Template' });
    this.confirmDeleteSequenceTemplateButton = page.getByRole('button', { exact: true, name: 'Delete' });
    this.editor = page.locator('.cm-activeLine').first();
  }

  async updateSequenceTemplate(sequenceTemplateName: string, sequenceTemplateLineContent: string) {
    await this.sequenceTemplateTable.getByRole('gridcell', { name: sequenceTemplateName }).click();
    await this.editor.click();
    await this.editor.fill(sequenceTemplateLineContent);
    await this.page.waitForTimeout(500); // TODO: The CodeMirror update 'listener' seems to require a timeout here to register the content has changed
    await this.saveSequenceTemplateButton.click();
    await this.waitForToast('Updated Sequence Template');
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
