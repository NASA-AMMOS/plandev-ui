import { Page } from '@playwright/test';

export type SelectOption = { text: string; value: string };

export async function getAllSelectOptions(page: Page, selectSelector: string): Promise<SelectOption[]> {
  return await page.$eval(selectSelector, (el: HTMLSelectElement) => {
    const options: SelectOption[] = [];

    if (el?.children) {
      for (const child of el.children) {
        if (child.nodeName === 'OPTION') {
          const option = child as HTMLOptionElement;
          options.push({ text: option.text, value: option.value });
        }
      }
    }

    return options;
  });
}

export async function getOptionValueFromText(page: Page, selectSelector: string, text: string): Promise<string> {
  const options = await getAllSelectOptions(page, selectSelector);

  for (const option of options) {
    if (option.text === text) {
      return option.value;
    }
  }

  return '';
}

export async function getSelectedOption(page: Page, selectSelector: string): Promise<SelectOption> {
  const value = await page.$eval(selectSelector, (el: HTMLSelectElement) => el.value);
  const optionSelector = `${selectSelector} > option[value="${value}"]`;
  const text = await page.$eval(optionSelector, (el: HTMLOptionElement) => el.text);
  return { text, value };
}
