import type { Page } from '@playwright/test';

/**
 * True if any canvas matched by `selector` has a pixel with non-zero alpha.
 * Stronger than checking the canvas exists — a transparent canvas would
 * pass that. Pair with `expect.poll` for post-async-update checks.
 */
export function anyCanvasHasContent(page: Page, selector: string = 'canvas'): Promise<boolean> {
  return page.evaluate(sel => {
    const canvases = document.querySelectorAll<HTMLCanvasElement>(sel);
    for (const canvas of Array.from(canvases)) {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        continue;
      }
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          return true;
        }
      }
    }
    return false;
  }, selector);
}
