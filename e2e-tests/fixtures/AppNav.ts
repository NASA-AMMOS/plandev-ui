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
  appMenuItemSequenceTemplates: Locator;
  appMenuItemSequenceWorkspace: Locator;
  pageLoadedLocatorNoData: Locator;
  pageLoadingLocator: Locator;

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async goto() {
    await this.page.goto('/plans', { waitUntil: 'load' });
    await this.pageLoadingLocator.waitFor({ state: 'detached' });
  }

  updatePage(page: Page): void {
    this.aboutModal = page.locator(`.modal:has-text("About")`);
    this.aboutModalCloseButton = page.locator(`.modal:has-text("About") >> button:has-text("Close")`);
    this.appMenu = page.getByLabel('Main Menu', { exact: true });
    this.appMenuButton = page.getByLabel('Open Main Menu');
    this.appMenuItemAbout = this.appMenu.getByRole('menuitem', { name: 'About' });
    this.appMenuItemDictionaries = this.appMenu.getByRole('menuitem', { name: 'Dictionaries' });
    this.appMenuItemDocumentation = this.appMenu.getByRole('menuitem', { name: 'Documentation' });
    this.appMenuItemExpansion = this.appMenu.getByRole('menuitem', { name: 'Expansion' });
    this.appMenuItemGateway = this.appMenu.getByRole('menuitem', { name: 'Gateway' });
    this.appMenuItemGraphQLPlayground = this.appMenu.getByRole('menuitem', { name: 'GraphQL Playground' });
    this.appMenuItemLogout = this.appMenu.getByRole('button', { name: 'Logout' });
    this.appMenuItemModels = this.appMenu.getByRole('menuitem', { name: 'Models' });
    this.appMenuItemPlans = this.appMenu.getByRole('menuitem', { name: 'Plans' });
    this.appMenuItemScheduling = this.appMenu.getByRole('menuitem', { name: 'Scheduling' });
    this.appMenuItemSequenceTemplates = this.appMenu.getByRole('menuitem', { name: 'Sequence Templates' });
    this.appMenuItemSequenceWorkspace = this.appMenu.getByRole('menuitem', { name: 'Sequence Editor' });
    this.page = page;
    this.pageLoadingLocator = page.locator(`.loading`);
    this.pageLoadedLocatorNoData = page.locator(`.body:has-text("No Plans Found")`);
  }
}
