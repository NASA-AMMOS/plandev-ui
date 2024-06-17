import { expect, type Page } from '@playwright/test';
import { adjectives, names, uniqueNamesGenerator } from 'unique-names-generator';
import { AppNav } from './AppNav.js';

export async function performLogin(page, baseURL, username = 'test') {
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill('test');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(`${baseURL}/plans`);
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
    await this.page.locator('.nav').getByRole('combobox').selectOption(role);
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('.nav').getByRole('combobox')).toHaveValue(role);
  }
}
