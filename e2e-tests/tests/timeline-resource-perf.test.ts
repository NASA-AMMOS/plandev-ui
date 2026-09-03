import test, { expect, type Page } from '@playwright/test';
import fs from 'fs';
import { OVERSIZED_PROFILE_SEGMENT_COUNT } from '../../src/stores/timelineResourceStatus.js';
import { AerieApi, setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

/**
 * Browser-level performance harness for timeline resource rendering.
 *
 * Opt-in, because it uploads a model, runs simulations that can take minutes, and loads millions of
 * points into a real page:
 *
 *   PERF=1 npm run test:e2e timeline-resource-perf
 *   PERF=1 PERF_SEGMENT_COUNTS=100000,500000 npm run test:e2e timeline-resource-perf
 *
 * This complements `src/utilities/timelinePerf.test.ts`, which measures the same pipeline in Node.
 * That harness cannot see canvas rasterization, style recalculation, or real browser GC, so its
 * frame-time figures are a floor rather than an actual frame time. This one drives the real app.
 *
 * Requires a model containing the StressResources activity (plandev
 * examples/banananation), which produces a chosen number of profile segments on demand. Point
 * PERF_JAR_PATH at a built jar; the test skips with a clear message if the activity is absent.
 */

const PERF_ENABLED = !!process.env.PERF;
const JAR_PATH = process.env.PERF_JAR_PATH ?? '../plandev/examples/banananation/build/libs/banananation.jar';
const SEGMENT_COUNTS = (process.env.PERF_SEGMENT_COUNTS ?? '100000,500000,2000000')
  .split(',')
  .map(s => Number(s.trim()))
  .filter(n => Number.isFinite(n) && n > 0);

const RESOURCE_NAME = '/stress/real/0';
// How many resources carry the full segment count. 1c and 1d run per Row, so their benefit is
// expected to scale with the number of *heavy* rows -- one heavy row does not exercise that at all,
// which is exactly the claim this knob exists to test. Capped at the model's pool size of 4.
const REAL_RESOURCE_COUNT = Math.min(Number(process.env.PERF_REAL_RESOURCES ?? 1), 4);
const PLAN_START = '2026-001T00:00:00';
const PLAN_DURATION = '48:00:00';
// The activity spans half the plan, so the profile has data alongside empty time on either side --
// closer to a real plan than a profile that fills the whole horizon.
const ACTIVITY_DURATION_MICROS = 24 * 3600 * 1_000_000;

type FrameStats = { frames: number; max: number; p50: number; p95: number };
type Measurement = {
  firstPaintMs: number;
  heapMb: number | null;
  hover: FrameStats;
  pan: FrameStats;
  segmentCount: number;
  zoomIn: FrameStats;
  zoomedOut: FrameStats;
};

/**
 * Samples requestAnimationFrame deltas in the page while `action` runs. Frame delta is the honest
 * metric here: it includes canvas work and layout, which is exactly what the Node harness misses.
 */
async function measureFrames(page: Page, action: () => Promise<void>): Promise<FrameStats> {
  await page.evaluate(() => {
    const w = window as unknown as { __perfFrames: number[]; __perfStop?: () => void };
    w.__perfFrames = [];
    let last = performance.now();
    let running = true;
    const tick = () => {
      if (!running) {
        return;
      }
      const now = performance.now();
      w.__perfFrames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    w.__perfStop = () => {
      running = false;
    };
  });

  await action();

  return page.evaluate(() => {
    const w = window as unknown as { __perfFrames: number[]; __perfStop?: () => void };
    w.__perfStop?.();
    // Drop the first sample: it measures the gap before the interaction started, not a frame.
    const frames = w.__perfFrames.slice(1).sort((a, b) => a - b);
    if (frames.length === 0) {
      return { frames: 0, max: 0, p50: 0, p95: 0 };
    }
    return {
      frames: frames.length,
      max: frames[frames.length - 1],
      p50: frames[Math.floor(frames.length * 0.5)],
      p95: frames[Math.floor(frames.length * 0.95)],
    };
  });
}

/**
 * Cheap checksum of what a row has actually drawn.
 *
 * Guards the measurement itself: if the synthetic wheel or drag events never reach the timeline's
 * zoom handler, frame sampling still returns a healthy-looking display refresh cadence and the
 * harness would report "fast" for every size. Comparing signatures before and after an interaction
 * turns that silent no-op into a failure.
 */
async function canvasSignature(canvases: ReturnType<Page['locator']>): Promise<string> {
  return canvases.evaluateAll((els: HTMLCanvasElement[]) =>
    els
      .map(el => {
        const ctx = el.getContext('2d');
        if (!ctx || el.width === 0 || el.height === 0) {
          return '0';
        }
        const { data } = ctx.getImageData(0, 0, el.width, el.height);
        let sum = 0;
        // Every pixel's alpha, not a sample. Hover draws a marker only a few dozen pixels across, so
        // a sparse stride missed it and reported the interaction as a no-op even though it had
        // happened. Zoom and pan redraw the whole canvas and would survive any stride; hover would
        // not, so the guard has to be exact.
        for (let i = 3; i < data.length; i += 4) {
          sum = (sum + data[i] * ((i % 251) + 1)) % 2147483647;
        }
        return String(sum);
      })
      .join(':'),
  );
}

/**
 * Sweeps the pointer across the row, which drives the hover readout.
 *
 * Measured separately from zoom and pan because it is the interaction that fires most often and the
 * one whose cost scales with the *whole* profile rather than what is visible: the neighbour lookup
 * walks from the first point, and the exact-x lookup used to scan every point. Not gated by Navigate
 * interaction mode — only d3-zoom's filter is.
 */
async function hoverAcrossRow(page: Page, box: { height: number; width: number; x: number; y: number }) {
  const y = box.y + box.height / 2;
  for (let i = 0; i < 12; i++) {
    // Sweep left-to-right: cost grew with distance from the left edge, so the right half is where the
    // old forward scan was most expensive.
    await page.mouse.move(box.x + box.width * (0.08 + i * 0.075), y);
    await page.waitForTimeout(30);
  }
}

/**
 * Timeline view shortcuts, handled globally by TimelineViewControls: '=' zoom in, '-' zoom out,
 * '[' / ']' shift the window, '0' reset.
 *
 * Driving the view this way rather than with synthetic wheel and drag events is deliberate. Wheel
 * zoom goes through d3-zoom, whose filter in Row.svelte discards every event unless the row is in
 * Navigate interaction mode (held meta/control) — so wheel-based input is silently dropped in the
 * default mode, which produced frame samples of an idle page rather than of rendering work. The
 * shortcuts hit the same `viewTimeRange` update the toolbar buttons do, with no mode, pointer
 * position, or icon-button selector to get wrong.
 */
async function pressShortcut(page: Page, key: string, times: number) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    // Zoom is throttled to ~16ms; pace the input so frames are actually produced between steps.
    await page.waitForTimeout(30);
  }
}

test.describe.serial('timeline resource rendering performance', () => {
  let setup: BrowserSetupResult;
  let api: AerieApi;
  let modelId: number;
  const measurements: Measurement[] = [];

  test.skip(!PERF_ENABLED, 'set PERF=1 to run the timeline performance harness');

  test.beforeAll(async ({ browser }) => {
    setup = (await setupTest(browser, { model: false })) as BrowserSetupResult;
    api = new AerieApi();
    await api.login('test', 'test');

    expect(fs.existsSync(JAR_PATH), `jar not found at ${JAR_PATH} — set PERF_JAR_PATH`).toBe(true);
    const jarId = await api.uploadFile(JAR_PATH);
    const model = await api.createModel({
      jar_id: jarId,
      mission: 'test',
      name: `perf-stress-${Date.now()}`,
      version: '1.0.0',
    });
    modelId = model.id;
  });

  test.afterAll(async () => {
    if (measurements.length > 0) {
      const pad = (s: string, n: number) => s.padEnd(n);
      const num = (v: number) => `${v.toFixed(1)} ms`.padStart(10);
      const lines = [
        '',
        '=== timeline resource rendering, real browser ===',
        `resource: ${RESOURCE_NAME}   (p95 / max frame time per interaction, ms)   heavy rows: ${REAL_RESOURCE_COUNT}`,
        // p50 is deliberately omitted: input is paced with a delay between steps, so most sampled
        // frames are idle ones and p50 pins to the display refresh interval at every size. p95 and
        // max are the figures that reflect redraw cost.
        '',
        pad('segments', 12) +
          pad('first paint', 14) +
          pad('hover', 22) +
          pad('zoom out', 22) +
          pad('zoom in', 22) +
          pad('pan', 22) +
          'heap',
        '-'.repeat(122),
      ];
      for (const m of measurements) {
        lines.push(
          pad(m.segmentCount.toLocaleString(), 12) +
            num(m.firstPaintMs) +
            '    ' +
            pad(`${m.hover.p95.toFixed(1)} / ${m.hover.max.toFixed(1)}`, 22) +
            pad(`${m.zoomedOut.p95.toFixed(1)} / ${m.zoomedOut.max.toFixed(1)}`, 22) +
            pad(`${m.zoomIn.p95.toFixed(1)} / ${m.zoomIn.max.toFixed(1)}`, 22) +
            pad(`${m.pan.p95.toFixed(1)} / ${m.pan.max.toFixed(1)}`, 22) +
            (m.heapMb === null ? 'n/a' : `${m.heapMb.toFixed(0)} MB`),
        );
      }
      lines.push('');
      // eslint-disable-next-line no-console
      console.log(lines.join('\n'));
    }
    await teardownTest(setup);
  });

  for (const segmentCount of SEGMENT_COUNTS) {
    test(`renders a ${segmentCount.toLocaleString()}-segment profile`, async () => {
      test.setTimeout(20 * 60 * 1000);
      const { page } = setup;

      const plan = await api.createPlan({
        duration: PLAN_DURATION,
        model_id: modelId,
        name: `perf-${segmentCount}-${Date.now()}`,
        start_time: PLAN_START,
      });

      // Activity types are extracted asynchronously after the jar upload, so the first insert can
      // land before StressResources exists. Retry, and if it never succeeds say plainly that the jar
      // may predate the activity rather than surfacing a raw GraphQL error.
      await expect
        .poll(
          async () => {
            try {
              await api.createActivityDirective({
                arguments: {
                  discreteResourceCount: 0,
                  duration: ACTIVITY_DURATION_MICROS,
                  realResourceCount: REAL_RESOURCE_COUNT,
                  segmentCount,
                },
                name: 'stress',
                plan_id: plan.id,
                start_offset: '00:00:00',
                type: 'StressResources',
              });
              return true;
            } catch {
              return false;
            }
          },
          {
            intervals: [1000],
            message: `could not create a StressResources directive on model ${modelId} — does ${JAR_PATH} contain the activity?`,
            timeout: 90_000,
          },
        )
        .toBe(true);

      const { simulationDatasetId } = await api.simulate(plan.id, true);
      await api.waitForSimulation(simulationDatasetId, 15 * 60 * 1000, 2000);

      // The default view generates one row per resource, so the stress resource is on the timeline
      // without any view editing.
      const firstPaintStart = Date.now();
      await page.goto(`/plans/${plan.id}`, { waitUntil: 'load' });

      const row = page.locator('.row-root').filter({ hasText: RESOURCE_NAME }).first();
      await row.scrollIntoViewIfNeeded();
      // A row stacks several canvases (gaps, line data, interaction overlay) at the same position, so
      // check all of them rather than picking one -- the gaps canvas is empty for a gapless profile
      // and would never register a paint.
      const canvases = row.locator('canvas');
      await canvases.first().waitFor({ state: 'visible', timeout: 5 * 60 * 1000 });

      // Wait for the row to actually have pixels drawn, not merely to exist: the profile streams in,
      // and an empty canvas would otherwise read as an instant paint.
      await expect
        .poll(
          async () =>
            canvases.evaluateAll((els: HTMLCanvasElement[]) =>
              els.some(el => {
                const ctx = el.getContext('2d');
                if (!ctx || el.width === 0 || el.height === 0) {
                  return false;
                }
                const { data } = ctx.getImageData(0, 0, el.width, el.height);
                // Sample the alpha channel sparsely; a drawn line covers far more than 1 in 64 pixels.
                for (let i = 3; i < data.length; i += 4 * 64) {
                  if (data[i] !== 0) {
                    return true;
                  }
                }
                return false;
              }),
            ),
          { intervals: [250], message: `${RESOURCE_NAME} row never drew any pixels`, timeout: 5 * 60 * 1000 },
        )
        .toBe(true);
      const firstPaintMs = Date.now() - firstPaintStart;

      // Proof that the whole profile is loaded, not just the first batch -- otherwise these frame
      // times could describe a fraction of the data. For a terminal simulation the windowed pull
      // returns every segment in one response, so a settled row holds all of it; the oversized-
      // profile warning counts client-side segments and only fires past its threshold, which makes
      // it a direct assertion that they all arrived.
      const oversizedWarning = page.getByLabel('Large profile warning');
      if (segmentCount >= OVERSIZED_PROFILE_SEGMENT_COUNT) {
        await expect(
          oversizedWarning,
          `expected the oversized-profile warning at ${segmentCount} segments, which would confirm the full profile reached the client`,
        ).toBeVisible({ timeout: 60_000 });
      } else {
        await expect(oversizedWarning).toBeHidden();
      }

      // Order matters. A plan opens already fully zoomed out, so zooming out first is a no-op that
      // would be recorded as a very fast interaction. Zoom in, pan there, then zoom back out — which
      // ends on the expensive case, where every point is in view and the work is proportional to
      // total segments no matter how the in-view window is computed.
      //
      // Each interaction is bracketed by a canvas signature. Frame sampling alone cannot distinguish
      // a slow interaction from one that never happened -- both look like a steady display refresh
      // cadence -- so an unchanged canvas fails rather than being reported as a fast result. That
      // guard is what caught the ordering bug above.
      const initial = await canvasSignature(canvases);

      // Only hover needs pointer coordinates; zoom and pan go through keyboard shortcuts.
      //
      // Scroll again here rather than reusing the earlier call: rows grow as their resources load, so
      // a box captured before the data settled can be stale by hundreds of pixels. Measured at 2M,
      // the row ended up at y=1412 in a 720px viewport, which put every synthetic mouse move outside
      // the window -- hover never fired, and only the canvas-signature guard revealed it.
      await row.scrollIntoViewIfNeeded();
      const box = await canvases.first().boundingBox();
      expect(box, 'row canvas has no bounding box').not.toBeNull();
      const rowBox = box as { height: number; width: number; x: number; y: number };

      // Pointer events go nowhere if the target is off-screen, and that reads as a fast interaction
      // rather than a failure, so require the row to actually be within the viewport.
      const viewport = page.viewportSize();
      expect(viewport, 'no viewport size').not.toBeNull();
      const { height: viewportHeight } = viewport as { height: number; width: number };
      expect(
        rowBox.y >= 0 && rowBox.y + rowBox.height <= viewportHeight,
        `row is outside the viewport (y=${rowBox.y}, height=${rowBox.height}, viewport=${viewportHeight}) so pointer events would not reach it`,
      ).toBe(true);

      // Hover first, while the row is still fully zoomed out and every point is loaded -- the worst
      // case for lookups that scale with total point count rather than with the visible window.
      const hover = await measureFrames(page, () => hoverAcrossRow(page, rowBox));
      const afterHover = await canvasSignature(canvases);
      expect(afterHover, 'hover did not change what the row drew').not.toEqual(initial);

      const zoomIn = await measureFrames(page, () => pressShortcut(page, '=', 12));
      const afterZoomIn = await canvasSignature(canvases);
      expect(afterZoomIn, 'zoom-in did not change what the row drew').not.toEqual(afterHover);

      const pan = await measureFrames(page, () => pressShortcut(page, ']', 12));
      const afterPan = await canvasSignature(canvases);
      expect(afterPan, 'pan did not change what the row drew').not.toEqual(afterZoomIn);

      const zoomedOut = await measureFrames(page, () => pressShortcut(page, '-', 12));
      const afterZoomOut = await canvasSignature(canvases);
      expect(afterZoomOut, 'zoom-out did not change what the row drew').not.toEqual(afterPan);

      // performance.memory is quantized and reported the same figure across a 20x data range, so it
      // cannot distinguish these cases. CDP reports the real used heap. Collect garbage first so the
      // number reflects retained data rather than whatever transient allocations survived.
      let heapMb: number | null = null;
      try {
        const cdp = await setup.context.newCDPSession(page);
        await cdp.send('HeapProfiler.enable');
        await cdp.send('HeapProfiler.collectGarbage');
        const usage = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number };
        heapMb = usage.usedSize / 1e6;
        await cdp.detach();
      } catch {
        heapMb = null;
      }

      measurements.push({ firstPaintMs, heapMb, hover, pan, segmentCount, zoomIn, zoomedOut });

      // The harness reports numbers rather than enforcing thresholds -- machines differ too much for
      // a wall-clock assertion to mean anything in CI. What is asserted is that frames were actually
      // sampled, so a silent no-op cannot masquerade as a good result.
      expect(zoomedOut.frames, 'no frames sampled while zooming out').toBeGreaterThan(0);
      expect(zoomIn.frames, 'no frames sampled while zooming in').toBeGreaterThan(0);
      expect(pan.frames, 'no frames sampled while panning').toBeGreaterThan(0);
      expect(hover.frames, 'no frames sampled while hovering').toBeGreaterThan(0);
    });
  }
});
