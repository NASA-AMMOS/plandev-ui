import { expect, Locator, Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Action {
  actionDefinitionButton: Locator;
  actionDescription: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  actionFormDescription: Locator;
  actionFormName: Locator;
  actionFormPath: Locator;
  actionName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  actionPath: string = 'e2e-tests/data/aerie-action-demo.js';
  createActionButton: Locator;
  createModal: Locator;
  createModalDeleteButton: Locator;
  runModal: Locator;

  constructor(public page: Page) {}

  async configureAction(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Configure' }).click();
    // Provide the github api url to the action found in `actionPath` so that it can
    // successfully query the api
    await this.page
      .locator(".configure .parameter-base-string:has-text('externalUrl') input")
      .fill('https://api.github.com/');
    await this.page.getByRole('button', { name: 'Save' }).click();
    await this.waitForToast('Action Updated Successfully');
  }

  async createAction(): Promise<string> {
    await this.createActionButton.click();
    await expect(this.createModal).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Create' })).toBeDisabled();
    await this.actionFormName.fill(this.actionName);
    await this.actionFormDescription.fill(this.actionDescription);
    await this.actionFormPath.setInputFiles(this.actionPath);
    await this.page.getByRole('button', { name: 'Create' }).click();
    await this.waitForToast('Action Created Successfully');
    await this.page.getByRole('button', { name: this.actionName });
    await expect(this.actionDefinitionButton).toBeVisible();
    return this.actionName;
  }

  async inspectAction(): Promise<void> {
    await expect(this.actionDefinitionButton).toBeVisible();
    await this.actionDefinitionButton.click();
    await expect(
      this.page.locator(`.action-definition-runs-container:has-text("${this.actionDescription}")`),
    ).toBeVisible();
  }

  async runAction(): Promise<void> {
    await this.actionDefinitionButton.getByRole('button', { name: 'Run' }).click();
    await expect(this.runModal).toBeVisible();
    // Provide the aerie repository path to the action found in `actionPath` so that it can
    // successfully query the api
    await this.runModal.locator(".parameter-base-string:has-text('repository') input").fill('repos/NASA-AMMOS/aerie');
    await this.runModal.getByRole('button', { name: 'Run' }).click();
    await this.page.waitForURL('/sequencing/actions/runs/**');
    await this.page.getByLabel('Complete');
  }

  updatePage(page: Page) {
    this.actionDefinitionButton = page.getByRole('button', { name: this.actionName });
    this.actionFormDescription = page.getByLabel('description');
    this.actionFormPath = page.locator('input[name="file"]');
    this.actionFormName = page.getByLabel('name');
    this.createActionButton = page.getByRole('button', { name: 'New Action' });
    this.createModal = page.locator(`.modal:has-text("New Action")`);
    this.createModalDeleteButton = this.createModal.getByRole('button', { name: 'Delete' });
    this.runModal = page.locator(`.modal:has-text("Run Action")`);
    this.page = page;
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
