import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { getWorkspacesUrl } from '../../src/utilities/routes';
import { Parcels } from './Parcels';

export class Workspaces {
  alertError: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  inputButtonParcel: Locator;
  inputLocation: Locator;
  inputName: Locator;
  pageLoadingLocator: Locator;
  table: Locator;
  tableRow: (workspaceName: string) => Locator;
  tableRowDeleteButton: (workspaceName: string) => Locator;
  tableRowWorkspaceId: (workspaceName: string) => Locator;
  workspaceId: string;
  workspaceLocation: string;
  workspaceName: string;

  constructor(
    public page: Page,
    public parcels: Parcels,
    public baseURL: string = '',
  ) {
    this.workspaceName = this.createWorkspaceName();
    this.workspaceLocation = this.createWorkspaceLocation();
    this.updatePage(page);
  }

  async createWorkspace(
    workspaceName = this.workspaceName,
    parcelName = this.parcels.parcelName,
    workspaceLocation = this.workspaceLocation,
  ) {
    await expect(this.tableRow(workspaceName)).not.toBeVisible();
    await this.selectInputParcel(parcelName);
    await this.fillInputLocation(workspaceLocation);
    await this.fillInputName(workspaceName);
    await this.createButton.waitFor({ state: 'attached' });
    await this.createButton.waitFor({ state: 'visible' });
    await this.createButton.isEnabled({ timeout: 500 });
    await this.createButton.click();
    await this.filterTable(workspaceName);
    await this.tableRow(workspaceName).waitFor({ state: 'attached' });
    await this.tableRow(workspaceName).waitFor({ state: 'visible' });
    const workspaceId = await this.getWorkspaceId(workspaceName);
    this.workspaceId = workspaceId;
    return workspaceId;
  }

  createWorkspaceLocation() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  }

  createWorkspaceName() {
    return uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
  }

  async deleteWorkspace(workspaceName: string = this.workspaceName) {
    await this.filterTable(workspaceName);
    await expect(this.tableRow(workspaceName)).toBeVisible();

    await this.tableRow(workspaceName).hover();
    await expect(this.tableRow(workspaceName).locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton(workspaceName).waitFor({ state: 'attached' });
    await this.tableRowDeleteButton(workspaceName).waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton(workspaceName)).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton(workspaceName).click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow(workspaceName).waitFor({ state: 'detached' });
    await this.tableRow(workspaceName).waitFor({ state: 'hidden' });
    await expect(this.tableRow(workspaceName)).not.toBeVisible();
  }

  async fillInputLocation(workspaceLocation = this.workspaceLocation) {
    await this.inputLocation.focus();
    await this.inputLocation.fill(workspaceLocation);
    await this.inputLocation.blur();
  }

  async fillInputName(workspaceName = this.workspaceName) {
    await this.inputName.focus();
    await this.inputName.fill(workspaceName);
    await this.inputName.blur();
  }

  async filterTable(workspaceName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { exact: true, name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-filter');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(workspaceName);
    await expect(this.table.getByRole('row', { name: workspaceName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async getWorkspaceId(workspaceName = this.workspaceName) {
    await this.filterTable(workspaceName);
    await expect(this.tableRow(workspaceName)).toBeVisible();
    await expect(this.tableRowWorkspaceId(workspaceName)).toBeVisible();
    const el = await this.tableRowWorkspaceId(workspaceName).elementHandle();
    if (el) {
      return (await el.textContent()) as string;
    }
    return '';
  }

  async goto() {
    await this.page.goto(getWorkspacesUrl(this.baseURL), { waitUntil: 'load' });
    await this.pageLoadingLocator.waitFor({ state: 'detached' });
  }

  async selectInputParcel(parcelName = this.parcels.parcelName) {
    await this.inputButtonParcel.click();
    await this.inputButtonParcel.selectOption(parcelName);
  }

  async selectedWorkspace() {
    return await this.page.getByLabel('Select Workspace', { exact: true }).innerText();
  }

  updatePage(page: Page): void {
    this.alertError = page.locator('.alert-error');
    this.confirmModal = page.locator(`.modal:has-text("Delete Workspace")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.inputButtonParcel = page.getByRole('combobox', { name: 'Parcel' });
    this.inputName = page.getByRole('textbox', { name: 'Workspace Name' });
    this.inputLocation = page.getByRole('textbox', { name: 'Workspace Folder Name' });
    this.page = page;
    this.pageLoadingLocator = page.locator(`.loading`);
    this.table = page.locator('div[role="tabpanel"]:has-text("Sequence Workspaces")').getByRole('treegrid');
    this.tableRow = (workspaceName: string) => this.table.getByRole('row', { name: workspaceName });
    this.tableRowDeleteButton = (workspaceName: string) =>
      this.tableRow(workspaceName).getByRole('gridcell').getByRole('button', { name: 'Delete Workspace' });
    this.tableRowWorkspaceId = (workspaceName: string) => this.tableRow(workspaceName).getByRole('gridcell').first();
  }
}
