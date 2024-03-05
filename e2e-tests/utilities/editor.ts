import { Locator } from '@playwright/test';
import os from 'node:os';

export async function fillEditorText(editor: Locator, text: string) {
  await editor.focus();
  // Need to emulate actual clearing of editor instead of manipulating the
  // underlying textbox, see: https://github.com/microsoft/playwright/issues/14126#issuecomment-1728327258
  const isMac = os.platform() === 'darwin';
  const modifier = isMac ? 'Meta' : 'Control';
  await editor.press(`${modifier}+A`);
  await editor.press(`Backspace`);
  await editor.fill(text);
  await editor.evaluate(e => e.blur());
}
