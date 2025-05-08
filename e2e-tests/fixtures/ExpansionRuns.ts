import { expect, type Locator, type Page } from '@playwright/test';
import { Plan } from './Plan.js';

export class ExpansionRuns {
  runsNavButton: Locator;
  runsTable: Locator;
  runsTableRow: Locator;
  sequencesTable: Locator;
  sequencesTableRow: Locator;

  constructor(
    public page: Page,
    public plan: Plan,
    public sequenceFilterName: string,
  ) {
    this.updatePage(page);
  }

  async goto() {
    await this.page.goto('/expansion/runs', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
    await expect(this.runsNavButton).toHaveClass(/selected/);
  }

  async selectSequence() {
    await this.runsTableRow.click();
    this.updatePage(this.page);
    this.waitForContents('No Sequence Selected');
    await this.sequencesTableRow.click();
    this.updatePage(this.page);
  }

  updatePage(page: Page): void {
    this.page = page;
    this.runsNavButton = page.locator(`.nav-button:has-text("Runs")`);
    this.runsTable = page.locator('div[role="tabpanel"]:has-text("Expansion Runs")').getByRole('treegrid');
    this.runsTableRow = this.runsTable.getByRole('row', { name: this.plan.planName });
    this.sequencesTable = page.locator('div[role="tabpanel"]:has-text("Expanded Sequences")').getByRole('treegrid');
    this.sequencesTableRow = this.sequencesTable.getByRole('row', { name: this.sequenceFilterName });
  }

  async waitForContents(contents: string): Promise<void> {
    await expect(this.page.locator('.cm-line').getByText(contents)).toBeVisible();
  }
}
