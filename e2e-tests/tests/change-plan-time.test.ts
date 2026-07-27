import test, { expect } from '@playwright/test';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

/**
 * Verifies that activity directive times remain FIXED IN ABSOLUTE TIME when a plan's start/end
 * bounds change — including activities anchored to plan start, anchored to another activity, and
 * anchored to plan end.
 *
 */

let setup: FullSetupResult;

const NAMES = {
  child: 'ChildAnchored', // anchored to the plan-start activity
  end: 'PlanEndAnchored', // anchored to plan end
  start: 'PlanStartAnchored', // anchored to plan start
};

const PLAN_START = '2022-005T00:00:00';
const PLAN_END = '2022-020T00:00:00';

test.beforeAll(async ({ browser }) => {
  // Plan is created (not disabled), so this resolves to a FullSetupResult at runtime; the options
  // overload widens the return type, so narrow it back here.
  setup = (await setupTest(browser, { planEndTime: PLAN_END, planStartTime: PLAN_START })) as FullSetupResult;

  // Anchored to plan start, +2 days -> 2022-007T00:00:00
  const startAnchored = await setup.api.createActivityDirective({
    anchor_id: null,
    anchored_to_start: true,
    arguments: { quantity: 1 },
    metadata: {},
    name: NAMES.start,
    plan_id: setup.planId,
    start_offset: '48:00:00',
    type: 'GrowBanana',
  });

  // Anchored to the plan-start activity, +12 hours -> 2022-007T12:00:00
  await setup.api.createActivityDirective({
    anchor_id: startAnchored.id,
    anchored_to_start: true,
    arguments: { quantity: 1 },
    metadata: {},
    name: NAMES.child,
    plan_id: setup.planId,
    start_offset: '12:00:00',
    type: 'GrowBanana',
  });

  // Anchored to plan end, -2 days -> 2022-018T00:00:00
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

test.describe.serial('Change Plan Time Bounds', () => {
  let beforeStart: string;
  let beforeChild: string;
  let beforeEnd: string;

  test('Records initial absolute activity start times', async () => {
    beforeStart = await setup.plan.getActivityStartTime(NAMES.start);
    beforeChild = await setup.plan.getActivityStartTime(NAMES.child);
    beforeEnd = await setup.plan.getActivityStartTime(NAMES.end);

    // Sanity check that the setup produced the expected absolute times.
    expect(beforeStart).toContain('2022-007');
    expect(beforeChild).toContain('2022-007');
    expect(beforeEnd).toContain('2022-018');
  });

  // Done before any start change so the plan-end-anchored activity is checked from a clean state.
  test('Moving the plan end later keeps activities fixed in absolute time', async () => {
    await setup.plan.setPlanEndTime('2022-025T00:00:00');

    // Plan-end-anchored activity must keep its absolute time (offset adjusted by the backend).
    await expect.poll(() => setup.plan.getActivityStartTime(NAMES.end), { timeout: 15000 }).toBe(beforeEnd);
    // Start-anchored + chained activities are unaffected since the start did not move.
    expect(await setup.plan.getActivityStartTime(NAMES.start)).toBe(beforeStart);
    expect(await setup.plan.getActivityStartTime(NAMES.child)).toBe(beforeChild);
  });

  test('Moving the plan start earlier keeps start-anchored and chained activities fixed', async () => {
    await setup.plan.setPlanStartTime('2022-001T00:00:00');

    // Plan-start-anchored activity must keep its absolute time (offset adjusted by the backend).
    await expect.poll(() => setup.plan.getActivityStartTime(NAMES.start), { timeout: 15000 }).toBe(beforeStart);
    // Activity anchored to another activity follows its anchor, so it is unaffected.
    expect(await setup.plan.getActivityStartTime(NAMES.child)).toBe(beforeChild);
  });

  // Regression for the backend plan-bounds trigger: moving only the plan start (end fixed) must keep
  // a plan-end-anchored activity fixed in absolute time — its start_offset is adjusted by the
  // plan-end delta (zero here), not the start delta.
  test('Moving the plan start keeps plan-end-anchored activities fixed in absolute time', async () => {
    await setup.plan.setPlanStartTime('2022-001T00:00:00');
    await expect.poll(() => setup.plan.getActivityStartTime(NAMES.end), { timeout: 15000 }).toBe(beforeEnd);
  });
});
