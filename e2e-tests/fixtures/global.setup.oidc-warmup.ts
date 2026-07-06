import { expect, test as setup } from '@playwright/test';

/**
 * Warm up the Vite dev server before the OIDC suite runs.
 *
 * The OIDC job serves the UI via `npm run dev` (not the prebuilt preview) because preview mode
 * hardcodes `dev=false`, which makes the server set `secure` cookies that the browser drops over
 * http://localhost. The tradeoff: Vite dev lazy-compiles routes on first request. Without warming,
 * the first real test's `goto('/plans')` eats a multi-second cold compile AND races the OIDC
 * redirect chain (`/plans` -> `/login`), which aborts the in-flight navigation (net::ERR_ABORTED)
 * and blows the 30s test timeout — flaking the first login every run while everything after it,
 * hitting warm modules, passes fast.
 *
 * Priming the entry routes here means the suite starts against an already-compiled dev server.
 */
setup('warm up dev server', async ({ page }) => {
  // Generous budget: this is the one place we intentionally absorb the cold-compile hit.
  setup.setTimeout(120000);

  // Compile the login page directly (no redirect to race), and confirm it actually rendered.
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Login Using OIDC')).toBeVisible({ timeout: 90000 });

  // Also prime the app entry route (triggers the layout server hook + OIDC redirect). We only
  // care that the modules compile, not the outcome, so swallow the expected redirect/abort.
  await page.goto('/plans', { waitUntil: 'domcontentloaded' }).catch(() => {});
});
