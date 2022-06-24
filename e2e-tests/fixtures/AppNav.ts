import type { Locator, Page } from '@playwright/test';

export class AppNav {
  readonly aboutModal: Locator;
  readonly aboutModalCloseButton: Locator;
  readonly appMenu: Locator;
  readonly appMenuButton: Locator;
  readonly appMenuItemAbout: Locator;
  readonly appMenuItemDictionaries: Locator;
  readonly appMenuItemExpansion: Locator;
  readonly appMenuItemGateway: Locator;
  readonly appMenuItemLogout: Locator;
  readonly appMenuItemModels: Locator;
  readonly appMenuItemPlans: Locator;
  readonly appMenuItemPlayground: Locator;
  readonly page: Page;

  constructor(page: Page) {
    this.aboutModal = page.locator(`.modal:has-text("About")`);
    this.aboutModalCloseButton = page.locator(`.modal:has-text("About") >> button:has-text("Close")`);
    this.appMenu = page.locator('.app-menu > .menu > .menu-slot');
    this.appMenuButton = page.locator('.app-menu');
    this.appMenuItemAbout = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("About")`);
    this.appMenuItemDictionaries = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Dictionaries")`);
    this.appMenuItemExpansion = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Expansion")`);
    this.appMenuItemGateway = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Gateway")`);
    this.appMenuItemLogout = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Logout")`);
    this.appMenuItemModels = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Models")`);
    this.appMenuItemPlans = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Plans")`);
    this.appMenuItemPlayground = page.locator(
      `.app-menu > .menu > .menu-slot > .menu-item:has-text("GraphQL Playground")`,
    );
    this.page = page;
  }
}
