import { expect, test } from '../fixtures/PlaywrightTest.js';

test('/ redirects to /plans', async ({ baseURL, page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(`${baseURL}/plans`);
});
