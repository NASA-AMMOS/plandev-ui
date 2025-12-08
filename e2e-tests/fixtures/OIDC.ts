import { expect, Locator, Page } from '@playwright/test';
import { decode, JwtPayload } from 'jsonwebtoken';
import { AppNav } from './AppNav';

type HasuraToken = JwtPayload & {
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': string[];
    'x-hasura-default-role': string;
    'x-hasura-user-id': string;
  };
};

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
    while (!buttonClicked) {
      // this button has required variable numbers of tries
      try {
        await this.page.waitForURL('**/realms/aerie-dev/**', { timeout: 2000 });
        buttonClicked = true;
      } catch {
        // means it timed out, no new page
        await loginButton.click();
      }
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
    this.signInButton = page.getByText('Sign In').last();
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
      // otherwise it is considered potentailly undefined despite the above expect
      const decoded = decode(accessToken); // TODO: extract this into its own method ?

      const allowedRoles = (decoded as HasuraToken)['https://hasura.io/jwt/claims']['x-hasura-allowed-roles'];
      for (const expectedRole of this.expectedRoles) {
        expect(allowedRoles.includes(expectedRole));
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

    // wait for timeout (set to 600 seconds by default in our Keycloak deployment)
    //      NOTE: since the timer is set in the UI, the token needn't actually expire
    //          to prompt a refresh. we just need to skip that time HERE and it'll know to refresh.
    //          It pre-emptively refreshes 10 seconds before refresh time, so we will
    //          skip to 1 second before that, i.e. we will timeskip 589 seconds.
    // await this.page.clock.fastForward(1 * 1000);
    // TURNS OUT MESSING WITH PAGE TIMER SERIOUSLY THROWS OFF DELAYS AND RESULTS IN A REFRESH LOOP!

    // now it'll refresh, so we want this test itself to wait for 5 seconds
    await this.page.waitForTimeout(11000);

    // get new cookies
    const {
      accessToken: newAccessToken,
      idToken: newIdToken,
      refreshToken: newRefreshToken,
    } = await this.extractTokens();

    console.log('OLD ACCESS TOKEN, NEW ACCESS TOKEN', oldAccessToken, newAccessToken);
    console.log('OLD ID TOKEN, NEW ID TOKEN', oldIdToken, newIdToken);
    console.log('OLD REFRESH TOKEN, NEW REFRESH TOKEN', oldRefreshToken, newRefreshToken);

    expect(oldAccessToken).not.toEqual(newAccessToken);
    expect(oldIdToken).not.toEqual(newIdToken);
    expect(oldRefreshToken).not.toEqual(newRefreshToken);

    await this.checkCookieRoles(); // should still be right!
  }
}
