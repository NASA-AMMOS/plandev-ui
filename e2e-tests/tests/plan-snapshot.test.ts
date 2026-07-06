import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

/**
 * End-to-end coverage for plan snapshots, run as a single linear flow over one plan to keep
 * wall-clock setup cost low. It verifies two things together:
 *  1. Previewing a snapshot taken at different bounds shows the SNAPSHOT's bounds in the Plan
 *     Metadata panel (read-only) and reverts to the live plan's bounds when the preview is closed.
 *  2. Activity directive times are fixed in ABSOLUTE time. Moving the plan bounds rewrites anchored
 *     offsets to keep activities fixed, and that must not shift the absolute times shown when the
 *     snapshot is PREVIEWED, nor after the snapshot is RESTORED.
 *
 * Activity repositioning and the timeline viewport snap are canvas behaviors covered manually / by
 * unit tests.
 */
test.describe.serial('Plan Snapshot Preview and Restore', () => {
  let setup: FullSetupResult;
  let snapshotId: number;

  let beforeStart: string;
  let beforeEnd: string;

  const PLAN_START = '2022-005T00:00:00';
  const PLAN_END = '2022-020T00:00:00'; // bounds captured by the snapshot
  const NEW_PLAN_END = '2022-025T00:00:00'; // live plan end after the change

  const NAMES = {
    end: 'PlanEndAnchored', // anchored to plan end, -2 days -> 2022-018T00:00:00
    start: 'PlanStartAnchored', // anchored to plan start, +2 days -> 2022-007T00:00:00
  };

  test.beforeAll(async ({ browser }) => {
    // Plan is created, so this resolves to a FullSetupResult at runtime.
    setup = (await setupTest(browser, { planEndTime: PLAN_END, planStartTime: PLAN_START })) as FullSetupResult;

    await setup.api.createActivityDirective({
      anchor_id: null,
      anchored_to_start: true,
      arguments: { quantity: 1 },
      metadata: {},
      name: NAMES.start,
      plan_id: setup.planId,
      start_offset: '48:00:00',
      type: 'GrowBanana',
    });

    await setup.api.createActivityDirective({
      anchor_id: null,
      anchored_to_start: false,
      arguments: { quantity: 1 },
      metadata: {},
      name: NAMES.end,
      plan_id: setup.planId,
      start_offset: '-48:00:00',
      type: 'GrowBanana',
    });

    await setup.plan.goto();
  });

  test.afterAll(async () => {
    await teardownTest(setup);
  });

  test('Snapshot captures the bounds and directive times; changing the plan end moves the live bounds but keeps directives fixed', async () => {
    // Record the original absolute directive times, then snapshot them.
    beforeStart = await setup.plan.getActivityStartTime(NAMES.start);
    beforeEnd = await setup.plan.getActivityStartTime(NAMES.end);
    expect(beforeStart).toContain('2022-007');
    expect(beforeEnd).toContain('2022-018');

    const snapshot = await setup.api.createPlanSnapshot(setup.planId, 'Bounds Snapshot');
    snapshotId = snapshot.snapshot_id;

    // Move the plan end later. The backend rewrites the plan-end-anchored offset so the live
    // activity stays fixed in absolute time; this must not leak into the snapshot.
    await setup.plan.setPlanEndTime(NEW_PLAN_END);

    const liveBounds = await setup.plan.getPlanMetadataBounds();
    expect(liveBounds.start).toContain('2022-005');
    expect(liveBounds.end).toContain('2022-025');
    await expect.poll(() => setup.plan.getActivityStartTime(NAMES.end)).toBe(beforeEnd);
  });

  test('Previewing the snapshot shows the snapshot bounds and the original absolute directive times', async () => {
    await setup.plan.gotoSnapshotPreview(snapshotId);

    // The override is applied once the snapshot subscription resolves, so poll for it.
    await expect.poll(async () => (await setup.plan.getPlanMetadataBounds()).end).toContain('2022-020');

    const previewBounds = await setup.plan.getPlanMetadataBounds();
    expect(previewBounds.start).toContain('2022-005');
    expect(previewBounds.end).not.toContain('2022-025'); // not the live plan end

    expect(await setup.plan.getActivityStartTime(NAMES.start)).toBe(beforeStart);
    expect(await setup.plan.getActivityStartTime(NAMES.end)).toBe(beforeEnd);
  });

  test('Closing the preview reverts to the live plan bounds', async () => {
    await setup.plan.closeSnapshotPreview();

    await expect.poll(async () => (await setup.plan.getPlanMetadataBounds()).end).toContain('2022-025');
  });

  test('Restoring the snapshot keeps the original absolute directive times and reverts the bounds', async () => {
    await setup.api.restorePlanSnapshot(setup.planId, snapshotId);
    await setup.plan.goto();

    await expect.poll(() => setup.plan.getActivityStartTime(NAMES.start)).toBe(beforeStart);
    expect(await setup.plan.getActivityStartTime(NAMES.end)).toBe(beforeEnd);

    // Restoring the snapshot also restores its bounds, so the live plan end reverts.
    await expect.poll(async () => (await setup.plan.getPlanMetadataBounds()).end).toContain('2022-020');
  });
});
