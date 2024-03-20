import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { fillEditorText } from '../utilities/editor.js';
import { Models } from './Models.js';

export class Constraints {
  closeButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  constraintDefinition: string = `export default function peelGreaterThanOrEqual3(): Constraint { return Real.Resource('/peel').greaterThanOrEqual(3); }`;
  constraintDescription: string = 'This is a constraint description.';
  constraintName: string;
  inputConstraintDefinition: Locator;
  inputConstraintDescription: Locator;
  inputConstraintModel: Locator;
  inputConstraintModelSelector: string = 'select[name="model"]';
  inputConstraintName: Locator;
  saveButton: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page, public models: Models) {
    this.constraintName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
    this.updatePage(page);
  }

  async createConstraint(baseURL: string | undefined) {
    await expect(this.saveButton).toBeDisabled();
    await this.fillConstraintName();
    await this.fillConstraintDescription();
    await this.fillConstraintDefinition();
    await expect(this.saveButton).not.toBeDisabled();
    await this.saveButton.click();
    await this.page.waitForURL(`${baseURL}/constraints/edit/*`);
    await expect(this.closeButton).not.toBeDisabled();
    await this.closeButton.click();
    await this.page.waitForURL(`${baseURL}/constraints`);
  }

  async deleteConstraint() {
    await this.goto();
    await expect(this.tableRow).toBeVisible();
    await expect(this.tableRowDeleteButton).not.toBeVisible();
    await this.tableRow.hover();
    await this.tableRowDeleteButton.waitFor({ state: 'attached' });
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow.waitFor({ state: 'detached' });
    await this.tableRow.waitFor({ state: 'hidden' });
    await expect(this.tableRow).not.toBeVisible();
  }

  async fillConstraintDefinition() {
    await fillEditorText(this.inputConstraintDefinition, this.constraintDefinition);
  }

  async fillConstraintDescription() {
    await this.inputConstraintDescription.focus();
    await this.inputConstraintDescription.fill(this.constraintDescription);
    await this.inputConstraintDescription.evaluate(e => e.blur());
  }

  async fillConstraintName() {
    await this.inputConstraintName.focus();
    await this.inputConstraintName.fill(this.constraintName);
    await this.inputConstraintName.evaluate(e => e.blur());
  }

  async goto() {
    await this.page.goto('/constraints', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Constraint")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Constraint") >> button:has-text("Delete")`);
    this.inputConstraintDefinition = page.locator('.monaco-editor >> textarea.inputarea');
    this.inputConstraintDescription = page.locator('textarea[name="metadata-description"]');
    this.inputConstraintModel = page.locator(this.inputConstraintModelSelector);
    this.inputConstraintName = page.locator('input[name="metadata-name"]');
    this.page = page;
    this.saveButton = page.locator(`button:has-text("Save")`);
    this.tableRow = page.locator(`.ag-row:has-text("${this.constraintName}")`);
    this.tableRowDeleteButton = page.locator(
      `.ag-row:has-text("${this.constraintName}") >> button[aria-label="Delete Constraint"]`,
    );
  }
}
