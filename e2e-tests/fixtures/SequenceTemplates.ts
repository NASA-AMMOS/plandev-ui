import { expect, Locator, Page } from '@playwright/test';
import { Models } from './Models';
import { Parcels } from './Parcels';

export class SequenceTemplates {
  confirmDeleteSequenceTemplateButton: Locator;
  createNewSequenceTemplateButton: Locator;
  deleteSequenceTemplateButton: Locator;
  editor: Locator;
  newSequenceTemplateActivityTypeInput: Locator;
  newSequenceTemplateButton: Locator;
  newSequenceTemplateLanguageInput: Locator;
  newSequenceTemplateModelIdInput: Locator;
  newSequenceTemplateNameInput: Locator;
  newSequenceTemplateParcelIdInput: Locator;
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

    await this.selectLanguage(newSequenceTemplateLanguage);
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
    await this.newSequenceTemplateActivityTypeInput.click();
    await expect(this.page.getByRole('option', { name: this.sequenceTemplateActivityType })).toBeVisible();
    await this.page.getByRole('option', { name: this.sequenceTemplateActivityType }).click();
  }

  async selectLanguage(language) {
    await this.newSequenceTemplateLanguageInput.click();
    await expect(this.page.getByRole('option', { name: language })).toBeVisible();
    await this.page.getByRole('option', { name: language }).click();
  }

  async selectModel() {
    const { modelName } = this.models;
    await this.newSequenceTemplateModelIdInput.click();
    await expect(this.page.getByRole('option', { name: modelName })).toBeVisible();
    await this.page.getByRole('option', { name: modelName }).click();
  }

  async selectParcel() {
    const { parcelName } = this.parcels;
    await this.newSequenceTemplateParcelIdInput.click();
    await expect(this.page.getByRole('option', { name: parcelName })).toBeVisible();
    await this.page.getByRole('option', { name: parcelName }).click();
  }

  async updatePage(page: Page) {
    this.newSequenceTemplateActivityTypeInput = page
      .getByRole('combobox')
      .filter({ hasText: 'Select an activity type' });
    this.newSequenceTemplateButton = page.getByRole('button', { name: 'New Template' });
    this.newSequenceTemplateLanguageInput = page.getByRole('combobox').filter({ hasText: 'Select a language' });
    this.newSequenceTemplateModelIdInput = page.getByRole('combobox').filter({ hasText: 'Select a model' });
    this.newSequenceTemplateNameInput = page.getByRole('textbox', { name: 'name' });
    this.newSequenceTemplateParcelIdInput = page.getByRole('combobox').filter({ hasText: 'Select a parcel' });
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
