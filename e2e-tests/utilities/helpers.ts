import { expect, type Cookie, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export function getUserCookieValue(cookies: Cookie[]): string | undefined {
  if (process.env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
    return cookies.find(cookie => cookie.name === 'accessToken')?.value;
  }
  for (const cookie of cookies) {
    if (cookie.name === 'user') {
      return JSON.parse(atob(cookie.value)).token;
    }
  }

  return undefined;
}

/** Generate a random name for test artifacts */
export function generateRandomName(): string {
  return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
}

/**
 * Hover over a row and wait for a specific action button to appear.
 * AG Grid requires real mouse movement to trigger hover states for action buttons.
 * This method retries the hover if the button doesn't appear, which handles
 * timing issues in headless mode.
 */
export async function hoverRowAndWaitForButton(page: Page, row: Locator, buttonLocator: Locator): Promise<void> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const box = await row.boundingBox();
    if (!box) {
      throw new Error('Could not get row bounding box for hover');
    }
    // Move mouse to center of row
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for button to become visible
    try {
      await buttonLocator.waitFor({ state: 'visible', timeout: 2000 });
      return; // Success - button is visible
    } catch {
      if (attempt === maxAttempts) {
        throw new Error(`Action button not visible after ${maxAttempts} hover attempts`);
      }
      // Move mouse away and try again
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
    }
  }
}

export async function setFileInputByBuffer(
  page: Page,
  fileInput: Locator,
  buffer: Buffer,
  mimeType: string,
  name: string,
  uploadButton?: Locator,
) {
  // Retry mechanism for file upload - sometimes Svelte's reactivity doesn't trigger on first attempt
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.focus();
    await fileInput.setInputFiles({
      buffer,
      mimeType,
      name,
    });
    await fileInput.evaluate(e => e.blur());

    // Verify the file was set by checking if the button becomes enabled
    // For sequence adaptations, also need to wait for the name field
    if (uploadButton) {
      const isEnabled = await uploadButton.isEnabled().catch(() => false);
      if (isEnabled) {
        return;
      }
      // Wait a bit before retry
      if (attempt < maxAttempts) {
        await page.waitForTimeout(1000);
      }
    } else {
      return;
    }
  }
}

export async function setFileInputByFilepath(page: Page, fileInput: Locator, filePath: string, uploadButton?: Locator) {
  // Retry mechanism for file upload - sometimes Svelte's reactivity doesn't trigger on first attempt
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.focus();
    await fileInput.setInputFiles(filePath);
    await fileInput.evaluate(e => e.blur());

    // Verify the file was set by checking if the button becomes enabled
    // For sequence adaptations, also need to wait for the name field
    if (uploadButton) {
      const isEnabled = await uploadButton.isEnabled().catch(() => false);
      if (isEnabled) {
        return;
      }
      // Wait a bit before retry
      if (attempt < maxAttempts) {
        await page.waitForTimeout(1000);
      }
    } else {
      return;
    }
  }
}

/**
 * Filter an AG Grid table by a value in a specific column.
 * Opens the column filter popup, enters the filter value, waits for the row to appear,
 * then closes the popup by clicking outside it.
 *
 * @param page - The Playwright page object
 * @param table - The AG Grid table locator
 * @param filterValue - The value to filter by
 * @param options - Optional configuration
 * @param options.columnName - The column header name to filter on (default: 'Name')
 * @param options.exactColumnMatch - Whether to use exact matching for column header (default: false)
 */
export async function filterAgGridTable(
  page: Page,
  table: Locator,
  filterValue: string,
  options: { columnName?: string; exactColumnMatch?: boolean } = {},
): Promise<void> {
  const { columnName = 'Name', exactColumnMatch = false } = options;

  await table.waitFor({ state: 'attached' });
  await table.waitFor({ state: 'visible' });

  const columnHeader = table.getByRole('columnheader', { exact: exactColumnMatch, name: columnName });
  await columnHeader.hover();

  const filterIcon = columnHeader.locator('.ag-icon-filter');
  await expect(filterIcon).toBeVisible();
  await filterIcon.click();

  // Wait for the filter input to be visible in the popup
  const filterInput = page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first();
  await filterInput.waitFor({ state: 'visible', timeout: 10000 });
  await filterInput.fill(filterValue);
  await expect(table.getByRole('row', { name: filterValue })).toBeVisible({ timeout: 10000 });

  // Close the filter popup by clicking outside of it
  await table.click({ position: { x: 5, y: 5 } });
  await page.locator('.ag-popup').waitFor({ state: 'hidden', timeout: 5000 });
}
