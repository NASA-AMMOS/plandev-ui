import { expect, type Locator, type Page } from '@playwright/test';
import { Constraints } from './Constraints.js';
import { Models } from './Models.js';
import { SchedulingConditions } from './SchedulingConditions.js';
import { SchedulingGoals } from './SchedulingGoals.js';

export class Model {
  associationTable: Locator;
  closeButton: Locator;
  conditionRadioButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  constraintRadioButton: Locator;
  deleteButton: Locator;
  descriptionInput: Locator;
  goalRadioButton: Locator;
  libraryRadioButton: Locator;
  modelRadioButton: Locator;
  nameInput: Locator;
  newPlanButton: Locator;
  saveButton: Locator;
  versionInput: Locator;

  constructor(
    public page: Page,
    public models: Models,
    public constraints: Constraints,
    public schedulingGoals: SchedulingGoals,
    public schedulingConditions: SchedulingConditions,
  ) {
    this.updatePage(page);
  }

  async close() {
    await this.closeButton.click();
    await expect(this.page).toHaveURL('.*/models$');
  }

  async deleteModel() {
    await expect(this.confirmModal).not.toBeVisible();
    await this.deleteButton.click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
  }

  /**
   * Wait for Hasura events to finish seeding the database after a model is created.
   * If we do not wait then navigation to the plan will fail because the data is not there yet.
   * If your tests fail then the timeout might be too short.
   * Re-run the tests and increase the timeout if you get consistent failures.
   */
  async goto() {
    await this.page.waitForTimeout(1200);
    await this.page.goto(`/models/${this.models.modelId}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  async saveModel() {
    await expect(this.saveButton).toBeVisible();
    await this.saveButton.click();
    await expect(this.saveButton).toBeVisible();
  }

  async switchToConditions() {
    await this.conditionRadioButton.click();
    this.updatePage(this.page);
    await expect(this.page.getByText('Condition - Definition')).toBeVisible();
  }

  async switchToConstraints() {
    await this.constraintRadioButton.click();
    this.updatePage(this.page);
    await expect(this.page.getByText('Constraint - Definition')).toBeVisible();
  }

  async switchToGoals() {
    await this.goalRadioButton.click();
    this.updatePage(this.page);
    await expect(this.page.getByText('Goal - Definition')).toBeVisible();
  }

  async switchToLibraryView() {
    await this.libraryRadioButton.click();
    this.updatePage(this.page);
    await expect(this.associationTable).toBeVisible();
  }

  async switchToModelView() {
    await this.modelRadioButton.click();
    this.updatePage(this.page);
    await expect(this.associationTable).not.toBeVisible();
  }

  async updateDescription(modelDescription: string) {
    await this.descriptionInput.click();
    await this.descriptionInput.fill(modelDescription);
    await expect(this.descriptionInput).toHaveValue(modelDescription);
  }

  async updateName(modelName: string) {
    await this.nameInput.click();
    await this.nameInput.fill(modelName);
    await expect(this.nameInput).toHaveValue(modelName);
  }

  async updatePage(page: Page): Promise<Promise<void>> {
    this.closeButton = page.getByRole('button', { name: 'Close' });
    this.conditionRadioButton = page.getByRole('button', { name: 'Conditions' });
    this.constraintRadioButton = page.getByRole('button', { name: 'Constraints' });
    this.deleteButton = page.getByRole('button', { name: 'Delete model' });
    this.descriptionInput = page.locator('textarea[name="description"]');
    this.goalRadioButton = page.getByRole('button', { name: 'Goals' });
    this.goalRadioButton = page.getByRole('button', { name: 'Goals' });
    this.libraryRadioButton = page.getByRole('button', { name: 'Library' });
    this.modelRadioButton = page.getByRole('button', { exact: true, name: 'Model' });
    this.nameInput = page.locator('input[name="name"]');
    this.newPlanButton = page.getByRole('button', { name: 'New plan with model' });
    this.versionInput = page.locator('input[name="version"]');
    this.associationTable = page.getByRole('treegrid');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.confirmModal = page.locator(`.modal:has-text("Delete Model")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete Model") >> button:has-text("Delete")`);
  }

  async updateVersion(modelVersion: string) {
    await this.nameInput.focus();
    await this.nameInput.fill(modelVersion);
    await expect(this.nameInput).toHaveValue(modelVersion);
  }
}
