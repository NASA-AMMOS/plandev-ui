import { expect, test } from '@playwright/test';

test.describe(
  'Private routes should not be accessible when unauthenticated',
  () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('/ redirects to /login', async ({ baseURL, page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(`${baseURL}/login`);
    });

    test('/models redirects to /login', async ({ baseURL, page }) => {
      await page.goto('/models');
      await expect(page).toHaveURL(`${baseURL}/login`);
    });

    test('/plans redirects to /login', async ({ baseURL, page }) => {
      await page.goto('/plans');
      await expect(page).toHaveURL(`${baseURL}/login`);
    });

    test('/plans/0 redirects to /login', async ({ baseURL, page }) => {
      await page.goto('/plans/0');
      await expect(page).toHaveURL(`${baseURL}/login`);
    });
  },
);
