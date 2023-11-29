import type { Locator, Page } from '@playwright/test';

export class AppNav {
  aboutModal: Locator;
  aboutModalCloseButton: Locator;
  appMenu: Locator;
  appMenuButton: Locator;
  appMenuItemAbout: Locator;
  appMenuItemDictionaries: Locator;
  appMenuItemDocumentation: Locator;
  appMenuItemExpansion: Locator;
  appMenuItemGateway: Locator;
  appMenuItemGraphQLPlayground: Locator;
  appMenuItemLogout: Locator;
  appMenuItemModels: Locator;
  appMenuItemPlans: Locator;
  appMenuItemScheduling: Locator;
  pageLoadedLocatorNoData: Locator;
  pageLoadedLocatorWithData: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async goto() {
    await this.page.goto('/plans');
    await Promise.race([
      this.pageLoadedLocatorWithData.waitFor({ state: 'visible' }),
      this.pageLoadedLocatorNoData.waitFor({ state: 'visible' }),
    ]);
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.aboutModal = page.locator(`.modal:has-text("About")`);
    this.aboutModalCloseButton = page.locator(`.modal:has-text("About") >> button:has-text("Close")`);
    this.appMenu = page.locator('.app-menu > .menu > .menu-slot');
    this.appMenuButton = page.locator('.app-menu');
    this.appMenuItemAbout = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("About")`);
    this.appMenuItemDictionaries = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Dictionaries")`);
    this.appMenuItemDocumentation = page.locator(
      `.app-menu > .menu > .menu-slot > .menu-item:has-text("Documentation")`,
    );
    this.appMenuItemExpansion = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Expansion")`);
    this.appMenuItemGateway = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Gateway")`);
    this.appMenuItemGraphQLPlayground = page.locator(
      `.app-menu > .menu > .menu-slot > .menu-item:has-text("GraphQL Playground")`,
    );
    this.appMenuItemLogout = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Logout")`);
    this.appMenuItemModels = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Models")`);
    this.appMenuItemPlans = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Plans")`);
    this.appMenuItemScheduling = page.locator(`.app-menu > .menu > .menu-slot > .menu-item:has-text("Scheduling")`);
    this.page = page;
    this.pageLoadedLocatorWithData = page.locator(`.ag-root`);
    this.pageLoadedLocatorNoData = page.locator(`.body:has-text("No Plans Found")`);
  }
}
