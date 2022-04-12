import { Locator, Page } from '@playwright/test';

export class AppNav {
  readonly page: Page;

  readonly aboutModal: Locator;
  readonly aboutModalCloseButton: Locator;
  readonly appMenuButton: Locator;
  readonly appMenu: Locator;
  readonly appMenuItemAbout: Locator;
  readonly appMenuItemGateway: Locator;
  readonly appMenuItemLogout: Locator;
  readonly appMenuItemModels: Locator;
  readonly appMenuItemPlans: Locator;
  readonly appMenuItemPlayground: Locator;

  constructor(page: Page) {
    this.page = page;

    this.aboutModal = page.locator(`.modal:has-text("About")`);
    this.aboutModalCloseButton = page.locator(`.modal:has-text("About") >> button:has-text("Close")`);
    this.appMenu = page.locator('.app-menu > .menu');
    this.appMenuItemAbout = page.locator(`.app-menu > .menu > .menu-item:has-text("About")`);
    this.appMenuItemGateway = page.locator(`.app-menu > .menu > .menu-item:has-text("Gateway")`);
    this.appMenuItemLogout = page.locator(`.app-menu > .menu > .menu-item:has-text("Logout")`);
    this.appMenuItemModels = page.locator(`.app-menu > .menu > .menu-item:has-text("Models")`);
    this.appMenuItemPlans = page.locator(`.app-menu > .menu > .menu-item:has-text("Plans")`);
    this.appMenuItemPlayground = page.locator(`.app-menu > .menu > .menu-item:has-text("GraphQL Playground")`);
    this.appMenuButton = page.locator('.app-menu');
  }
}
