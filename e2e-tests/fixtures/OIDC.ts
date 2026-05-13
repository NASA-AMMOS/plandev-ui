import { expect, Locator, Page } from '@playwright/test';
import { decode } from 'jsonwebtoken';
import type { HasuraToken } from '../../src/lib/types/oidc';
import { AppNav } from './AppNav';

const MAX_LOGIN_RETRIES = 5;

// OIDC spans several pages.
// As such, we will define a class for each of the pages,
//      and then incorporate them as members into an overall
//      OIDC class.
class AerieLogin {
  loginButton: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async login() {
    await this.page.goto('/plans', { waitUntil: 'load' });
    const loginButton = this.page.getByText('Login Using OIDC');

    await loginButton.waitFor();

    let buttonClicked: boolean = false;
    await loginButton.click();
    for (let attempt = 0; attempt < MAX_LOGIN_RETRIES && !buttonClicked; attempt++) {
      // this button has required variable numbers of tries
      try {
        await this.page.waitForURL('**/realms/aerie-dev/**', { timeout: 2000 });
        buttonClicked = true;
      } catch {
        // means it timed out, no new page
        await loginButton.click();
      }
    }
    if (!buttonClicked) {
      throw new Error(`OIDC login button did not trigger IdP redirect after ${MAX_LOGIN_RETRIES} attempts`);
    }
  }

  updatePage(page: Page) {
    this.loginButton = page.getByText('Login Using OIDC');
  }
}

class IdPLogin {
  passwordSlot: Locator;
  signInButton: Locator;
  usernameSlot: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async login(username: string, password: string) {
    await this.usernameSlot.waitFor();
    await this.passwordSlot.waitFor();
    await this.signInButton.waitFor();

    await this.usernameSlot.fill(username);
    await this.passwordSlot.fill(password);

    await this.signInButton.click();

    await this.page.waitForURL('**/plans');
  }

  updatePage(page: Page) {
    this.usernameSlot = page.locator('#username');
    this.passwordSlot = page.locator('#password');
    this.signInButton = page.getByRole('button', { name: 'Sign In' });
  }
}

export class OIDC {
  expectedDefaultRole: string;
  expectedRoles: string[];

  constructor(
    public page: Page,
    public username: string,
    public password: string,
  ) {
    switch (username) {
      case 'AerieAdmin':
        this.expectedRoles = ['1-aerie_admin', '2-user', '3-viewer'];
        break;
      case 'AerieUser':
        this.expectedRoles = ['2-user', '3-viewer'];
        break;
      default: // AerieViewer
        this.expectedRoles = ['3-viewer'];
    }
    this.expectedDefaultRole = this.expectedRoles[0];
  }

  async checkCookieRoles() {
    const { accessToken } = await this.extractTokens();

    if (accessToken) {
      // otherwise it is considered potentially undefined despite the above expect
      const decoded = decode(accessToken); // TODO: extract this into its own method ?

      const allowedRoles = (decoded as HasuraToken)['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];
      for (const expectedRole of this.expectedRoles) {
        expect(allowedRoles).toContain(expectedRole);
      }
    }
  }

  async checkCurrentRole() {
    // while this element shows up in Plan.ts, it is too cumbersome to define that object here.
    // if it would make things more consistent and clean, a local class for the plans page for
    //      just elements like this (and cookies too?) can be created.
    const currentRole = this.page.getByRole('combobox').filter({ hasText: '-' });
    await expect(currentRole).toBeVisible();
    await expect(currentRole).toHaveText(this.expectedDefaultRole);
  }

  async expectNoCookies() {
    const cookies = await this.page.context().cookies();

    console.log(cookies.map(c => c.name));

    const cookieNames = cookies.map(c => c.name);
    expect(cookieNames.includes('accessToken')).toBeFalsy();
    expect(cookieNames.includes('idToken')).toBeFalsy();
    expect(cookieNames.includes('refreshToken')).toBeFalsy();
  }

  async extractTokens() {
    const cookies = await this.page.context().cookies();

    // check presence of accessToken, idToken, and refreshToken
    const cookieNames = cookies.map(c => c.name);
    expect(cookieNames.includes('accessToken')).toBeTruthy();
    expect(cookieNames.includes('idToken')).toBeTruthy();
    expect(cookieNames.includes('refreshToken')).toBeTruthy();

    // then pull them out
    const accessToken = cookies.find(c => c.name === 'accessToken')?.value;
    const idToken = cookies.find(c => c.name === 'idToken')?.value;
    const refreshToken = cookies.find(c => c.name === 'refreshToken')?.value;

    return {
      accessToken,
      idToken,
      refreshToken,
    };
  }

  async login() {
    // log in on AERIE end of things
    const aerieLogin = new AerieLogin(this.page);
    await aerieLogin.login();

    // then, IdP Login
    const idpLogin = new IdPLogin(this.page);
    await idpLogin.login(this.username, this.password);
  }

  async logout() {
    const appNav = new AppNav(this.page);

    await appNav.show();
    await appNav.appMenuItemLogout.click();

    await this.page.waitForURL('**/login');

    await this.expectNoCookies();
  }

  // should run this iff already logged in.
  async refresh() {
    // get old cookies
    const {
      accessToken: oldAccessToken,
      idToken: oldIdToken,
      refreshToken: oldRefreshToken,
    } = await this.extractTokens();

    // Wait for the UI's pre-expiry timer to fire /oidc/refresh and the new
    // accessToken cookie to land. Polling against the actual cookie change
    // avoids depending on a specific Keycloak access_token_lifespan value.
    await expect
      .poll(
        async () => {
          const cookies = await this.page.context().cookies();
          return cookies.find(c => c.name === 'accessToken')?.value;
        },
        { intervals: [500, 1000, 2000], timeout: 15000 },
      )
      .not.toBe(oldAccessToken);

    // get new cookies
    const {
      accessToken: newAccessToken,
      idToken: newIdToken,
      refreshToken: newRefreshToken,
    } = await this.extractTokens();

    expect(oldAccessToken).not.toEqual(newAccessToken);
    expect(oldIdToken).not.toEqual(newIdToken);
    expect(oldRefreshToken).not.toEqual(newRefreshToken);

    await this.checkCookieRoles(); // should still be right!
  }

  /**
   * Switch the active role via the Nav role dropdown and wait for the
   * activeRole cookie to reflect the change. Caller is responsible for
   * being on a page that renders the dropdown (e.g., /plans) and being
   * logged in as a user with multiple allowed roles.
   */
  async switchRole(newRole: string) {
    const roleCombobox = this.page.getByRole('combobox').filter({ hasText: '-' });
    await roleCombobox.click();
    await this.page.getByRole('option', { name: newRole }).click();

    await expect
      .poll(
        async () => {
          const cookies = await this.page.context().cookies();
          return cookies.find(c => c.name === 'activeRole')?.value;
        },
        { intervals: [200, 500, 1000], timeout: 5000 },
      )
      .toBe(newRole);
  }
}
