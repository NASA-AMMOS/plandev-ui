import type { Locator, Page } from '@playwright/test';

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

/**
 * Tallest run of non-transparent pixels in any single pixel column of `canvas` between `fromX` and `toX`
 * (CSS pixels, relative to the canvas's left edge). Lets a test ask "is something drawn at this x?"
 * for one specific canvas, rather than "is anything drawn anywhere?". Pair with `expect.poll`.
 */
export function maxOpaquePixelsInColumns(canvas: Locator, fromX: number, toX: number): Promise<number> {
  return canvas.evaluate(
    (el, [from, to]) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext('2d');
      if (!ctx) {
        return 0;
      }
      const scale = c.width / c.clientWidth;
      const x0 = Math.max(0, Math.floor(from * scale));
      const x1 = Math.min(c.width, Math.ceil(to * scale));
      let max = 0;
      for (let x = x0; x < x1; x++) {
        const column = ctx.getImageData(x, 0, 1, c.height).data;
        let count = 0;
        for (let i = 3; i < column.length; i += 4) {
          if (column[i] > 0) {
            count++;
          }
        }
        max = Math.max(max, count);
      }
      return max;
    },
    [fromX, toX],
  );
}
