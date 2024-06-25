import { Locator, Page, expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';

export class Parcels {
  closeButton: Locator;
  confirmModal: Locator;
  confirmModalDeleteButton: Locator;
  createButton: Locator;
  nameField: Locator;
  newButton: Locator;
  parcelName: string;
  table: Locator;
  tableRow: Locator;
  tableRowDeleteButton: Locator;

  constructor(public page: Page) {
    this.parcelName = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

    this.updatePage(page);
  }

  async changeSelectedCommandDictionary(firstCommandDictionaryName: string, secondCommandDictionaryName: string) {
    const parcelTableRow = this.page.locator(`.ag-row:has-text("${this.parcelName}")`);
    const parcelTableRowEditButton = await this.page.locator(
      `.ag-row:has-text("${this.parcelName}") >> button[aria-label="Edit Parcel"]`,
    );

    parcelTableRow.hover();
    await parcelTableRowEditButton.waitFor({ state: 'attached' });
    await parcelTableRowEditButton.waitFor({ state: 'visible' });
    await expect(parcelTableRowEditButton).toBeVisible();
    parcelTableRowEditButton.click();

    this.updatePage(this.page);
    await expect(this.tableRow).toBeVisible();
    await expect(this.page.locator(`.ag-row:has-text("${firstCommandDictionaryName}") >> input`)).toBeChecked();

    await this.page.locator(`.ag-row:has-text("${secondCommandDictionaryName}") >> input`).click();
    await expect(this.page.locator(`.ag-row:has-text("${secondCommandDictionaryName}") >> input`)).toBeChecked();
  }

  async createParcel(dictionaryName: string, baseURL?: string) {
    await this.newButton.click();
    await this.page.getByText(dictionaryName).click();
    this.updatePage(this.page);
    await expect(this.tableRow).not.toBeVisible();
    await this.nameField.fill(this.parcelName);
    await this.createButton.click();

    const editParcelUrlRegex = new RegExp(`${baseURL}/parcels/edit/(?<parcelId>\\d+)`);
    await this.page.waitForURL(editParcelUrlRegex);

    await this.closeButton.click();

    const parcelsUrlRegex = new RegExp(`${baseURL}/parcels`);
    await this.page.waitForURL(parcelsUrlRegex);

    await this.tableRow.waitFor({ state: 'attached' });
    await this.tableRow.waitFor({ state: 'visible' });
    await this.filterTable(this.parcelName);
  }

  async deleteParcel() {
    await this.filterTable(this.parcelName);
    await expect(this.tableRow).toBeVisible();

    await this.tableRow.hover();
    await expect(this.tableRow.locator('.actions-cell')).toBeVisible();
    await this.tableRowDeleteButton.waitFor({ state: 'attached' });
    await this.tableRowDeleteButton.waitFor({ state: 'visible' });
    await expect(this.tableRowDeleteButton).toBeVisible();

    await expect(this.confirmModal).not.toBeVisible();
    await this.tableRowDeleteButton.click({ position: { x: 2, y: 2 } });
    await this.confirmModal.waitFor({ state: 'attached' });
    await this.confirmModal.waitFor({ state: 'visible' });
    await expect(this.confirmModal).toBeVisible();

    await expect(this.confirmModalDeleteButton).toBeVisible();
    await this.confirmModalDeleteButton.click();
    await this.tableRow.waitFor({ state: 'detached' });
    await this.tableRow.waitFor({ state: 'hidden' });
    await expect(this.tableRow).not.toBeVisible();
  }

  private async filterTable(parcelName: string) {
    await this.table.waitFor({ state: 'attached' });
    await this.table.waitFor({ state: 'visible' });

    const nameColumnHeader = await this.table.getByRole('columnheader', { name: 'Name' });
    await nameColumnHeader.hover();

    const filterIcon = await nameColumnHeader.locator('.ag-icon-menu');
    await expect(filterIcon).toBeVisible();
    await filterIcon.click();
    await this.page.locator('.ag-popup').getByRole('textbox', { name: 'Filter Value' }).first().fill(parcelName);
    await expect(this.table.getByRole('row', { name: parcelName })).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async goto() {
    await this.page.goto('/parcels', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(250);
  }

  updatePage(page: Page): void {
    this.page = page;

    this.closeButton = page.locator(`button:has-text("Close")`);
    this.confirmModal = page.locator(`.modal:has-text("Delete Parcel")`);
    this.confirmModalDeleteButton = this.confirmModal.getByRole('button', { name: 'Delete' });
    this.createButton = page.locator(`button:has-text("Save")`);
    this.nameField = page.locator(`input[name="parcelName"]`);
    this.newButton = page.locator(`button:has-text("New")`);
    this.table = page.locator('.panel:has-text("Parcels")').getByRole('treegrid');
    this.tableRow = this.table.getByRole('row', { name: this.parcelName });
    this.tableRowDeleteButton = this.tableRow.getByRole('gridcell').getByRole('button', { name: 'Delete Parcel' });
  }
}
