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
    // The demo schema has a required setting with no default; fill it so Save can enable
    const requiredSettingInput = this.page.locator(".parameter-base-string:has-text('requiredSetting') input");
    await requiredSettingInput.fill('test-setting-value');
    await requiredSettingInput.dispatchEvent('change');
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

  async runAction(options?: {
    actionTimeout?: number;
    expectedStatus?: 'Complete' | 'Failed';
    mode?: string;
    stringParameters?: Record<string, string>;
  }): Promise<void> {
    const { actionTimeout = 30000, expectedStatus, mode, stringParameters } = options ?? {};

    // Click "Run Action" button in the detail view header
    await this.page.getByRole('button', { name: 'Run Action' }).click();
    // Wait for the run modal to appear
    const runModal = this.page.locator('#modal-container');
    await expect(runModal).toBeVisible();

    // If a mode is specified, select it in the variant dropdown
    if (mode) {
      await runModal.getByRole('combobox', { name: 'mode' }).selectOption(mode);
    }

    // Fill in any provided string parameter values
    if (stringParameters) {
      for (const [name, value] of Object.entries(stringParameters)) {
        const input = runModal.getByRole('textbox', { exact: true, name });
        await input.fill(value);
        await input.dispatchEvent('change');
      }
    }

    // Click the Run button in the modal footer
    await runModal.getByRole('button', { exact: true, name: 'Run' }).click();
    // Verify we navigated to the run detail view
    const runHeading = this.page.getByRole('heading', { name: /Run #\d+/ });
    await expect(runHeading).toBeVisible({ timeout: 15000 });

    // Scope the status badge to the run-detail header (parent of the heading) so we
    // don't accidentally match a previous run's badge in the sidebar. The locator is
    // dynamic — it resolves once aria-label transitions to a terminal status.
    const runHeader = runHeading.locator('..');
    const statusBadge = runHeader.getByLabel(/^(Complete|Failed)$/);
    await expect(statusBadge).toBeVisible({ timeout: actionTimeout });

    if (expectedStatus) {
      const actualStatus = await statusBadge.getAttribute('aria-label');
      if (actualStatus !== expectedStatus) {
        if (expectedStatus === 'Complete') {
          // If we expect success but see failure, collect and throw the error message from the UI
          const errorMessage = await this.page.getByTestId('action-run-error-log').innerText({ timeout: 5000 });
          throw new Error(
            `Expected action run to have status "${expectedStatus}" but got "${actualStatus}". Error message: ${errorMessage}`,
          );
        } else {
          const results = await this.page.getByTestId('action-run-results').innerText({ timeout: 5000 });
          throw new Error(
            `Expected action run to have status "${expectedStatus}" but got "${actualStatus}". Run details: ${results}`,
          );
        }
      }
    }
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

  async testRequiredParamValidation(): Promise<void> {
    // Open the run modal
    await this.page.getByRole('button', { name: 'Run Action' }).click();
    const runModal = this.page.locator('#modal-container');
    await expect(runModal).toBeVisible();

    // The demo has a required parameter with a defaultValue; the default-fallback
    // logic should pre-fill its input so it doesn't gate Run on its own.
    const requiredWithDefaultInput = runModal.getByRole('textbox', { exact: true, name: 'required' });
    await expect(requiredWithDefaultInput).toHaveValue('This is required');

    // Run is still disabled because requiredNoDefault is empty
    const runButton = runModal.getByRole('button', { exact: true, name: 'Run' });
    await expect(runButton).toBeDisabled();

    // Filling requiredNoDefault clears the empty-required gate
    const requiredNoDefaultInput = runModal.getByRole('textbox', { name: 'requiredNoDefault' });
    await requiredNoDefaultInput.fill('test-no-default-value');
    await requiredNoDefaultInput.dispatchEvent('change');

    await expect(runButton).toBeEnabled();

    // Cancel without running
    await runModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(runModal).not.toBeVisible();
  }

  async testRequiredSettingValidation(): Promise<void> {
    // Navigate to Configure tab
    await this.page.getByRole('tab', { name: 'Configure' }).click();

    // The demo's requiredSetting has no default; on a freshly-created action
    // both the empty-required gate AND !isDirty disable Save.
    const saveButton = this.page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeDisabled();

    // Filling the required setting clears both the empty-required gate
    // and makes the form dirty, so Save should become enabled.
    const requiredSettingInput = this.page.locator(".parameter-base-string:has-text('requiredSetting') input");
    await requiredSettingInput.fill('test-setting-value');
    await requiredSettingInput.dispatchEvent('change');

    await expect(saveButton).toBeEnabled();
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

  async verifyReport(): Promise<void> {
    const report = this.page.getByTestId('action-run-report');
    await expect(report).toBeVisible();

    // Markdown renders: a heading, bold text, and a GFM table.
    await expect(report.getByRole('heading', { name: 'What you can use' })).toBeVisible();
    await expect(report.locator('strong', { hasText: 'Markdown' })).toBeVisible();
    await expect(report.getByRole('cell', { name: 'Power margin' })).toBeVisible();
    await expect(report.getByRole('cell', { name: 'Violated at 04:12Z' })).toBeVisible();

    // The link renders, is hardened, and is actually openable in a new tab.
    const link = report.getByRole('link', { name: 'Links' });
    await expect(link).toHaveAttribute('href', 'https://nasa-ammos.github.io/plandev-docs/');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // Stub the external host so opening the link doesn't depend on the network.
    await this.page
      .context()
      .route('https://nasa-ammos.github.io/**', route =>
        route.fulfill({ body: 'stub', contentType: 'text/html', status: 200 }),
      );
    const popupPromise = this.page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await popup.waitForURL(/nasa-ammos\.github\.io\/plandev-docs/, { timeout: 10000 });
    await popup.close();
    await this.page.context().unroute('https://nasa-ammos.github.io/**');

    // Inline color is allowed — colored text, colored GFM cells, and raw HTML
    // tables with full-cell background colors all render.
    await expect(report.getByText('CRITICAL')).toBeVisible();
    await expect(report.locator('td span[style*="color"]').first()).toBeVisible();
    await expect(report.locator('td[style*="background-color"]').first()).toBeVisible();

    // ...but scripts, images, and unsafe CSS properties are still stripped.
    await expect(report.locator('script')).toHaveCount(0);
    await expect(report.locator('img')).toHaveCount(0);
    await expect(report.locator('[style*="position"]')).toHaveCount(0);
    await expect(report).not.toContainText('alert(');
  }

  async waitForToast(message: string) {
    await this.page.waitForSelector(`.toastify:has-text("${message}")`, { timeout: 10000 });
  }
}
