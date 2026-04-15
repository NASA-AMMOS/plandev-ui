import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { setFileInputByFilepath } from '../utilities/helpers';

export class Action {
  actionDescription: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  actionName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  actionPath: string = 'e2e-tests/data/aerie-action-demo.js';
  actionsSidebarTab!: Locator;
  createActionButton!: Locator;
  createModal!: Locator;

  constructor(
    public page: Page,
    public workspaceId: string,
  ) {
    this.updatePage(page);
  }

  async archiveAction(): Promise<void> {
    // Navigate to Configure tab and click Archive Action
    await this.page.getByRole('tab', { name: 'Configure' }).click();
    await this.page.getByRole('button', { name: 'Archive Action' }).click();
    // Confirm the archive modal
    const confirmModal = this.page.locator('#modal-container');
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole('button', { name: 'Archive' }).click();
    // Verify the Archived badge appears in the detail view header
    await expect(this.page.getByText('Archived', { exact: true })).toBeVisible();
    // Verify Run Action button is disabled
    await expect(this.page.getByRole('button', { name: 'Run Action' })).toBeDisabled();
  }

  async configureAction(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Configure' }).click();
    // Fill in the externalUrl setting and blur to trigger change event
    const externalUrlInput = this.page.locator(".parameter-base-string:has-text('externalUrl') input");
    await externalUrlInput.fill('https://api.github.com/');
    await externalUrlInput.dispatchEvent('change');
    // Wait for Save button to become enabled (isDirty must be true)
    const saveButton = this.page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await this.waitForToast('Action Updated Successfully');
  }

  async createAction(): Promise<string> {
    const createButton = this.page.getByRole('button', { name: 'Create' });
    await this.createActionButton.click();
    await expect(this.createModal).toBeVisible();
    await expect(createButton).toBeDisabled();
    await this.page.getByLabel('name').fill(this.actionName);
    await this.page.getByLabel('description').fill(this.actionDescription);
    const fileInput = this.page.locator('input[name="file"]');
    await fileInput.waitFor({ state: 'attached' });
    await setFileInputByFilepath(this.page, fileInput, this.actionPath, createButton);
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await this.waitForToast('Action Created Successfully');
    // Verify action appears in sidebar
    await expect(this.page.getByRole('button', { name: this.actionName })).toBeVisible();
    return this.actionName;
  }

  async inspectAction(): Promise<void> {
    // Click action in sidebar to open detail view
    await this.page.getByRole('button', { name: this.actionName }).click();
    // Verify action detail view shows name and description
    await expect(this.page.getByRole('heading', { name: this.actionName })).toBeVisible();
    await expect(this.page.getByText(this.actionDescription)).toBeVisible();
    // Verify tabs are present
    await expect(this.page.getByRole('tab', { name: /Runs/ })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Configure' })).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Code' })).toBeVisible();
  }

  async runAction(): Promise<void> {
    // Click "Run Action" button in the detail view header
    await this.page.getByRole('button', { name: 'Run Action' }).click();
    // Wait for the run modal to appear
    const runModal = this.page.locator('#modal-container');
    await expect(runModal).toBeVisible();
    // Click the Run button in the modal footer
    await runModal.getByRole('button', { exact: true, name: 'Run' }).click();
    // Verify we navigated to the run detail view
    await expect(this.page.getByRole('heading', { name: /Run #\d+/ })).toBeVisible({ timeout: 15000 });
    // Wait for a terminal status (Complete or Failed) in the main content area
    await expect(
      this.page
        .getByRole('tabpanel')
        .getByRole('button', { name: `Complete ${this.actionName}` })
        .or(this.page.getByRole('tabpanel').getByRole('button', { name: `Failed ${this.actionName}` })),
    ).toBeVisible({
      timeout: 30000,
    });
  }

  async selectActionInSidebar(): Promise<void> {
    // Click the action in the sidebar list (scoped to complementary to avoid matching other elements)
    await this.page
      .getByRole('tabpanel')
      .getByRole('button', { name: `${this.actionName} Last run` })
      .click();
    await expect(this.page.getByRole('heading', { name: this.actionName })).toBeVisible();
  }

  async switchToActionsTab(): Promise<void> {
    await this.actionsSidebarTab.click();
    await expect(this.page.getByText('Workspace Actions')).toBeVisible();
  }

  async unarchiveAction(): Promise<void> {
    // Navigate to Configure tab and click Unarchive Action
    await this.page.getByRole('tab', { name: 'Configure' }).click();
    await this.page.getByRole('button', { name: 'Unarchive Action' }).click();
    // Confirm the unarchive modal
    const confirmModal = this.page.locator('#modal-container');
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole('button', { name: 'Unarchive' }).click();
    // Verify Run Action button is enabled again
    await expect(this.page.getByRole('button', { name: 'Run Action' })).toBeEnabled();
  }

  updatePage(page: Page) {
    this.actionsSidebarTab = page.getByLabel('Actions', { exact: true });
    this.createActionButton = page.getByRole('button', { name: 'New Action' });
    this.createModal = page.locator('.modal:has-text("New Action")');
    this.page = page;
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
