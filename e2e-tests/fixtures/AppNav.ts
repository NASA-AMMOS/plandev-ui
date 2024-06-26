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
    await this.page.goto('/plans', { waitUntil: 'networkidle' });
    await this.page.waitForURL('/plans', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.aboutModal = page.locator(`.modal:has-text("About")`);
    this.aboutModalCloseButton = page.locator(`.modal:has-text("About") >> button:has-text("Close")`);
    this.appMenu = page.locator('.app-menu').getByRole('menu');
    this.appMenuButton = page.locator('.app-menu');
    this.appMenuItemAbout = this.appMenu.getByRole('menuitem', { name: 'About' });
    this.appMenuItemDictionaries = this.appMenu.getByRole('menuitem', { name: 'Dictionaries' });
    this.appMenuItemDocumentation = this.appMenu.getByRole('menuitem', { name: 'Documentation' });
    this.appMenuItemExpansion = this.appMenu.getByRole('menuitem', { name: 'Expansion' });
    this.appMenuItemGateway = this.appMenu.getByRole('menuitem', { name: 'Gateway' });
    this.appMenuItemGraphQLPlayground = this.appMenu.getByRole('menuitem', { name: 'GraphQL Playground' });
    this.appMenuItemLogout = this.appMenu.getByRole('menuitem', { name: 'Logout' });
    this.appMenuItemModels = this.appMenu.getByRole('menuitem', { name: 'Models' });
    this.appMenuItemPlans = this.appMenu.getByRole('menuitem', { name: 'Plans' });
    this.appMenuItemScheduling = this.appMenu.getByRole('menuitem', { name: 'Scheduling' });
    this.page = page;
    this.pageLoadedLocatorWithData = page.locator(`.ag-root`);
    this.pageLoadedLocatorNoData = page.locator(`.body:has-text("No Plans Found")`);
  }
}
