import { expect, type Page } from '@playwright/test';
import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator';
import { AppNav } from './AppNav.js';

export async function performLogin(page: Page, baseURL?: string, username: string = 'test') {
  await page.goto(`${baseURL ?? ''}/login`, { waitUntil: 'networkidle' });
  // Wait for the login form to be ready
  const usernameInput = page.locator('input[name="username"]');
  await usernameInput.waitFor({ state: 'visible' });
  await usernameInput.fill(username);
  await page.locator('input[name="password"]').fill('test');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(`${baseURL ?? ''}/plans`);
}

export class User {
  appNav: AppNav;

  constructor(
    public page: Page,
    public username: string,
  ) {
    this.appNav = new AppNav(page);
    this.username = username || this.createUsername();
  }

  createUsername() {
    return uniqueNamesGenerator({ dictionaries: [names, adjectives] });
  }

  /**
   * Navigate to a URL with retry logic for navigation errors.
   * Use this after switchRole() since role changes can cause navigation instability.
   * Handles ERR_ABORTED and "interrupted by another navigation" errors.
   */
  async gotoWithRetry(
    url: string,
    options?: { maxRetries?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' },
  ) {
    const maxRetries = options?.maxRetries ?? 3;
    const waitUntil = options?.waitUntil ?? 'networkidle';

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.goto(url, { waitUntil });
        return;
      } catch (e) {
        const isLastAttempt = i === maxRetries - 1;
        const isRetryableError =
          e instanceof Error && (e.message.includes('ERR_ABORTED') || e.message.includes('interrupted by another'));
        if (isLastAttempt || !isRetryableError) {
          throw e;
        }
      }
    }
  }

  async login(baseURL: string | undefined, username = this.username) {
    await performLogin(this.page, baseURL, username);
  }

  async logout(baseURL: string | undefined) {
    await this.appNav.appMenuButton.click();
    await this.appNav.appMenu.waitFor({ state: 'attached' });
    await this.appNav.appMenu.waitFor({ state: 'visible' });
    await this.appNav.appMenuItemLogout.click();
    await this.page.waitForURL(`${baseURL}/login`);
  }

  async switchRole(role: string = 'aerie_admin') {
    await this.page.getByRole('navigation').getByRole('combobox').click();
    await this.page.getByRole('listbox').getByRole('option', { name: role }).click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByRole('navigation').getByRole('combobox')).toHaveText(role);
  }
}
