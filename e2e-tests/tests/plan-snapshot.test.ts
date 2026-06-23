import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

/**
 * End-to-end tests for plan snapshots. Each behavior gets its own describe block with scoped setup
 * so additional snapshot coverage (restore, create, etc.) can be added here rather than in new files.
 */

/**
 * Previewing a plan snapshot taken at different bounds shows the SNAPSHOT's bounds in the Plan
 * Metadata panel (read-only), and reverts to the live plan's bounds when the preview is closed.
 * Activity repositioning and the timeline viewport snap are canvas behaviors covered manually / by
 * unit tests.
 */
test.describe.serial('Snapshot Preview Bounds', () => {
  let setup: FullSetupResult;
  let snapshotId: number;

  const PLAN_START = '2022-005T00:00:00';
  const PLAN_END = '2022-020T00:00:00'; // bounds captured by the snapshot
  const NEW_PLAN_END = '2022-025T00:00:00'; // live plan end after the change

  test.beforeAll(async ({ browser }) => {
    // Plan is created, so this resolves to a FullSetupResult at runtime.
    setup = (await setupTest(browser, { planEndTime: PLAN_END, planStartTime: PLAN_START })) as FullSetupResult;
    await setup.plan.goto();
  });

  test.afterAll(async () => {
    await teardownTest(setup);
  });

  test('Snapshot captures the plan bounds; changing the plan end moves the live bounds', async () => {
    const snapshot = await setup.api.createPlanSnapshot(setup.planId, 'Bounds Snapshot');
    snapshotId = snapshot.snapshot_id;

    await setup.plan.setPlanEndTime(NEW_PLAN_END);

    const liveBounds = await setup.plan.getPlanMetadataBounds();
    expect(liveBounds.start).toContain('2022-005');
    expect(liveBounds.end).toContain('2022-025');
  });

  test('Previewing the snapshot shows the snapshot bounds, not the live plan bounds', async () => {
    await setup.plan.gotoSnapshotPreview(snapshotId);

    // The override is applied once the snapshot subscription resolves, so poll for it.
    await expect.poll(async () => (await setup.plan.getPlanMetadataBounds()).end).toContain('2022-020');

    const previewBounds = await setup.plan.getPlanMetadataBounds();
    expect(previewBounds.start).toContain('2022-005');
    expect(previewBounds.end).not.toContain('2022-025'); // not the live plan end
  });

  test('Closing the preview reverts to the live plan bounds', async () => {
    await setup.plan.closeSnapshotPreview();

    await expect.poll(async () => (await setup.plan.getPlanMetadataBounds()).end).toContain('2022-025');
  });
});
