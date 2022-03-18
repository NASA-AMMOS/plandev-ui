import { expect, test } from '@playwright/test';

test('/ redirects to /plans', async ({ baseURL, page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(`${baseURL}/plans`);
});
