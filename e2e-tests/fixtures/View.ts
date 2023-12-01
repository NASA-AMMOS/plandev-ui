import { expect, type Locator, type Page } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class View {
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  invalidViewFilePath: string = 'e2e-tests/data/invalid-view.json';
  navButtonView: Locator;
  navButtonViewMenu: Locator;
  navButtonViewMenuTitle: Locator;
  navButtonViewRenameViewMenuButton: Locator;
  navButtonViewSaveAsMenuButton: Locator;
  navButtonViewSavedViewsMenuButton: Locator;
  navButtonViewUploadViewMenuButton: Locator;
  renameViewMenuSaveViewButton: Locator;
  saveAsMenuSaveAsButton: Locator;
  tableRowDeleteButtonSelector: (viewName: string) => Locator;
  tableRowSelector: (viewName: string) => Locator;
  validViewFilePath: string = 'e2e-tests/data/valid-view.json';

  constructor(public page: Page) {
    this.updatePage(page);
  }

  async createView(viewName: string = this.createViewName()) {
    await this.openSaveAs();
    await this.fillViewInputName(viewName);
    await this.saveAsMenuSaveAsButton.click();
  }

  createViewName() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  }

  async deleteView(viewName: string) {
    await this.openSavedViews();
    await expect(this.tableRowSelector(viewName)).toBeVisible();
    await expect(this.tableRowDeleteButtonSelector(viewName)).not.toBeVisible();

    await this.tableRowSelector(viewName).hover();
    await this.tableRowDeleteButtonSelector(viewName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButtonSelector(viewName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButtonSelector(viewName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButtonSelector(viewName).click();
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRowSelector(viewName).waitFor({ state: 'detached' });
    await this.tableRowSelector(viewName).waitFor({ state: 'hidden' });
    await expect(this.tableRowSelector(viewName)).not.toBeVisible();
  }

  async fillViewInputFile(planFilePath: string = this.validViewFilePath) {
    const viewFileInput = this.page.locator('.modal-content input[name="file"]');
    await viewFileInput.focus();
    await viewFileInput.setInputFiles(planFilePath);
    await viewFileInput.evaluate(e => e.blur());
  }

  async fillViewInputName(viewName: string = this.createViewName()) {
    const viewNameInput = this.page.locator('.modal-content input[name="name"]');
    await viewNameInput.focus();
    await viewNameInput.fill(viewName);
    await viewNameInput.evaluate(e => e.blur());
  }

  async openRenameView() {
    await expect(this.navButtonViewRenameViewMenuButton).not.toBeVisible();
    await this.openViewMenu();
    await expect(this.navButtonViewRenameViewMenuButton).toBeVisible();
    await this.navButtonViewRenameViewMenuButton.click();
  }

  async openSaveAs() {
    await this.openViewMenu();
    await expect(this.navButtonViewSaveAsMenuButton).toBeVisible();
    await this.navButtonViewSaveAsMenuButton.click();
  }

  async openSavedViews() {
    await this.openViewMenu();
    await expect(this.navButtonViewSavedViewsMenuButton).toBeVisible();
    await this.navButtonViewSavedViewsMenuButton.click();
    await expect(this.page.locator('.modal .modal-header:has-text("Saved Views")')).toBeVisible();
  }

  async openViewMenu() {
    this.navButtonView.hover();
    await expect(this.navButtonViewMenu).toBeVisible();
  }

  async renameView(viewName: string) {
    await this.openRenameView();
    await this.fillViewInputName(viewName);
    await this.renameViewMenuSaveViewButton.click();
  }

  updatePage(page: Page): void {
    this.confirmModal = page.locator(`.modal:has-text("Delete View")`);
    this.confirmModalDeleteButton = page.locator(`.modal:has-text("Delete View") >> button:has-text("Delete")`);
    this.navButtonView = page.locator('.view-menu-button');
    this.navButtonViewMenu = page.locator(`.view-menu`);
    this.navButtonViewMenuTitle = page.locator(`.view-menu-button .nav-button-title`);
    this.navButtonViewSaveAsMenuButton = page.locator(`.view-menu .menu-item:has-text("Save as")`);
    this.navButtonViewUploadViewMenuButton = page.locator(`.view-menu .menu-item:has-text("Upload view file")`);
    this.navButtonViewSavedViewsMenuButton = page.locator(`.view-menu .menu-item:has-text("Browse saved views")`);
    this.navButtonViewRenameViewMenuButton = page.locator(`.view-menu .menu-item:has-text("Rename view")`);
    this.renameViewMenuSaveViewButton = page.locator('.modal .st-button:has-text("Save View")');
    this.saveAsMenuSaveAsButton = page.locator('.modal .st-button:has-text("Save View")');
    this.tableRowSelector = (viewName: string) => page.locator(`.ag-row:has-text("${viewName}")`);
    this.tableRowDeleteButtonSelector = (viewName: string) =>
      page.locator(`.ag-row:has-text("${viewName}") >> button[aria-label="Delete View"]`);
  }
}
