import { Cookie, Locator, Page } from '@playwright/test';
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
