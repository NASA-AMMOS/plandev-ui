import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Page Object for the cross-plan activity search page (`/search`).
 */
export class Search {
  activityNameInput: Locator;
  argumentValueInput: Locator;
  clearFiltersButton: Locator;
  formReady: Locator;
  modifiedAfterInput: Locator;
  modifiedBeforeInput: Locator;
  noResultsOverlay: Locator;
  pageInfo: Locator;
  paginationFirstButton: Locator;
  paginationLastButton: Locator;
  paginationNextButton: Locator;
  paginationPreviousButton: Locator;
  panelHeader: Locator;
  planNameInput: Locator;
  resultsCountLabel: Locator;
  resultsGrid: Locator;
  resultsPanel: Locator;
  resultsRows: Locator;
  schedulerOnlyCheckbox: Locator;
  searchButton: Locator;
  searchingIndicator: Locator;
  startOffsetMaxInput: Locator;
  startOffsetMinInput: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  /** Reset all filters and clear results via the "Clear Filters" button. */
  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  /**
   * Click the per-row "Open in plan" icon button on the row whose Activity Name
   * cell matches `name`. The button is rendered in the pinned-left container,
   * not the center container, so we use the grid's row-index attribute to
   * cross-reference the right row across containers.
   */
  async clickOpenInPlanForRow(name: string): Promise<void> {
    const centerRow = this.resultsRows.filter({ hasText: name }).first();
    const rowIndex = await centerRow.getAttribute('row-index');
    if (rowIndex === null) {
      throw new Error(`Could not resolve row-index for row containing "${name}"`);
    }
    const pinnedRow = this.resultsGrid.locator(`.ag-pinned-left-cols-container .ag-row[row-index="${rowIndex}"]`);
    await pinnedRow.getByRole('button', { name: 'Open in plan' }).click();
  }

  /** Click the row whose Activity Name cell matches `name`. */
  async clickRow(name: string): Promise<void> {
    await this.resultsRows.filter({ hasText: name }).first().click();
  }

  /** AG Grid column header by visible header name. Use to assert presence or to sort. */
  columnHeader(headerName: string): Locator {
    return this.resultsGrid.locator('.ag-header-cell', { hasText: headerName }).first();
  }

  /** Returns the count of currently rendered result rows. */
  async getResultRowCount(): Promise<number> {
    return this.resultsRows.count();
  }

  async goto(): Promise<void> {
    await this.page.goto('/search', { waitUntil: 'load' });
    await this.waitForFormReady();
  }

  /** Navigate to /search with the given query string (deep-link). */
  async gotoWithParams(params: Record<string, string>): Promise<void> {
    const qs = new URLSearchParams(params).toString();
    await this.page.goto(`/search?${qs}`, { waitUntil: 'load' });
    await this.waitForFormReady();
  }

  /**
   * Submit the form and wait for the next search to complete.
   *
   * Uses the `data-search-run-id` attribute on the results panel — every
   * completed search bumps it. We snapshot the value before clicking, then
   * wait for it to change. This avoids relying on the `Searching…` indicator,
   * which has a deliberate 500ms reveal delay (to prevent flashing on fast
   * responses) and isn't observable for sub-500ms searches.
   */
  async submitAndWait(): Promise<void> {
    const before = (await this.resultsPanel.getAttribute('data-search-run-id')) ?? '0';
    await this.searchButton.click();
    await expect(this.resultsPanel).not.toHaveAttribute('data-search-run-id', before);
  }

  updatePage(page: Page): void {
    this.page = page;

    // Hydration signal: form's `data-search-form-ready` flips to "true" once
    // SearchPanel finishes its first reactive run (post-mount), which is when
    // `on:submit` and the bind:value handlers are wired up.
    this.formReady = page.locator('form[data-search-form-ready="true"]');

    // Form inputs — locate by role + accessible name (matching the visible label)
    // so tests interact with the form the way a user sees it.
    this.activityNameInput = page.getByRole('textbox', { name: 'Activity Name' });
    this.argumentValueInput = page.getByRole('textbox', { name: 'Argument Value' });
    this.modifiedAfterInput = page.getByRole('textbox', { name: 'Last Modified After' });
    this.modifiedBeforeInput = page.getByRole('textbox', { name: 'Last Modified Before' });
    this.startOffsetMinInput = page.getByRole('textbox', { name: 'Start Offset (min)' });
    this.startOffsetMaxInput = page.getByRole('textbox', { name: 'Start Offset (max)' });
    this.planNameInput = page.getByRole('textbox', { name: 'Plan Name' });
    this.schedulerOnlyCheckbox = page.getByRole('checkbox', { name: 'Scheduler-created only' });

    // Buttons
    this.searchButton = page.getByRole('button', { exact: true, name: 'Search' });
    this.clearFiltersButton = page.getByRole('button', { name: 'Clear Filters' });

    // Results panel
    this.panelHeader = page.getByText('Search Results', { exact: true });
    this.resultsPanel = page.locator('[data-search-run-id]');
    this.resultsCountLabel = page.locator('span.text-xs.text-muted-foreground').filter({ hasText: ' of ' });
    this.searchingIndicator = page.locator('span.text-xs').filter({ hasText: 'Searching…' });

    // Grid
    this.resultsGrid = page.locator('.ag-root-wrapper').last();
    this.resultsRows = this.resultsGrid.locator('.ag-center-cols-container .ag-row');
    this.noResultsOverlay = this.resultsGrid.locator('.ag-overlay-no-rows-wrapper');

    // Pagination
    this.paginationFirstButton = page.getByRole('button', { name: 'First page' });
    this.paginationPreviousButton = page.getByRole('button', { name: 'Previous page' });
    this.paginationNextButton = page.getByRole('button', { name: 'Next page' });
    this.paginationLastButton = page.getByRole('button', { name: 'Last page' });
    this.pageInfo = page.locator('span').filter({ hasText: /^Page \d+ of/ });
  }

  /**
   * Wait until SearchPanel has finished its first reactive run, signaled by
   * `data-search-form-ready="true"` on the form. Without this, headless
   * Playwright can click Search before Svelte's `on:submit` listener attaches,
   * which makes the browser perform a default form GET to `/search?` and
   * `onSearch` is never called.
   */
  async waitForFormReady(): Promise<void> {
    await expect(this.formReady).toBeVisible();
  }
}
