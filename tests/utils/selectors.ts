import { Page } from '@playwright/test';

export async function getSelect(page: Page, selectSelector: string): Promise<{ text: string; value: string }> {
  const value = await page.$eval(selectSelector, (el: HTMLSelectElement) => el.value);
  const optionSelector = `${selectSelector} > option[value="${value}"]`;
  const text = await page.$eval(optionSelector, (el: HTMLOptionElement) => el.text);
  return { text, value };
}
