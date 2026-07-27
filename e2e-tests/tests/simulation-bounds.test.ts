import test, { expect } from '@playwright/test';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

/**
 * Covers how the simulation bounds relate to the plan bounds:
 *  - On creation the simulation bounds equal the plan bounds.
 *  - Changing the plan bounds while the simulation bounds are untouched moves them with the plan
 *    (the backend "follow" path — only fires when the sim bounds still equal the old plan bounds).
 *  - Changing the plan bounds while the user has set a custom (in-range) simulation window leaves
 *    that window alone.
 *  - The "Plan Start" / "Plan End" buttons reset the corresponding bound to the plan's bound AND
 *    persist it (previously they updated the field display but never saved).
 *
 * All persistence is asserted against the backend via the API, not the UI.
 */

let setup: FullSetupResult;

const PLAN_START = '2022-005T00:00:00';
const PLAN_END = '2022-020T00:00:00';

const toMs = (time: string | null): number | null => (time ? new Date(time).getTime() : null);

// Convert a `YYYY-DDDThh:mm:ss` day-of-year string (UTC) to epoch ms, avoiding a dependency on the
// app's time utilities from within the e2e suite.
function doyToMs(doy: string): number {
  const match = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})/.exec(doy);
  if (!match) {
    throw new Error(`Invalid DOY string: ${doy}`);
  }
  const [, year, dayOfYear, hours, minutes, seconds] = match.map(Number);
  return Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000 + hours * 3_600_000 + minutes * 60_000 + seconds * 1_000;
}

const simStartMs = async (): Promise<number | null> =>
  toMs((await setup.api.getSimulation(setup.planId)).simulation_start_time);
const simEndMs = async (): Promise<number | null> =>
  toMs((await setup.api.getSimulation(setup.planId)).simulation_end_time);

test.beforeAll(async ({ browser }) => {
  // Plan is created, so this resolves to a FullSetupResult at runtime.
  setup = (await setupTest(browser, { planEndTime: PLAN_END, planStartTime: PLAN_START })) as FullSetupResult;
  await setup.plan.goto();
  await setup.plan.showPanel(PanelNames.SIMULATION, true);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Simulation Bounds', () => {
  // Track the current plan bounds as the serial tests mutate them.
  const planStartDoy = PLAN_START; // start is never changed in these tests
  let planEndDoy = PLAN_END;

  test('Simulation bounds are initialized to the plan bounds', async () => {
    expect(await simStartMs()).toBe(doyToMs(planStartDoy));
    expect(await simEndMs()).toBe(doyToMs(planEndDoy));
  });

  // Must run before any sim-bound edit: the backend only "follows" when the sim bounds still equal
  // the old plan bounds (true straight from creation).
  test('Changing plan bounds moves untouched simulation bounds with the plan', async () => {
    planEndDoy = '2022-025T00:00:00';
    await setup.plan.setPlanEndTime(planEndDoy);

    await expect.poll(simEndMs).toBe(doyToMs(planEndDoy));
    expect(await simStartMs()).toBe(doyToMs(planStartDoy)); // start did not move
  });

  test('Changing plan bounds leaves a custom (in-range) simulation window alone', async () => {
    const customStart = '2022-008T00:00:00';
    const customEnd = '2022-012T00:00:00';
    await setup.plan.setSimulationBound('start', customStart);
    await setup.plan.setSimulationBound('end', customEnd);
    await expect.poll(simStartMs).toBe(doyToMs(customStart));
    await expect.poll(simEndMs).toBe(doyToMs(customEnd));

    // Widen the plan; the custom window stays within range, so the backend must not touch it.
    planEndDoy = '2022-030T00:00:00';
    await setup.plan.setPlanEndTime(planEndDoy);

    await expect.poll(simStartMs).toBe(doyToMs(customStart));
    await expect.poll(simEndMs).toBe(doyToMs(customEnd));
  });

  test('"Plan Start" button resets the simulation start to the plan start and persists it', async () => {
    await setup.plan.setSimulationBound('start', '2022-009T00:00:00');
    await expect.poll(simStartMs).not.toBe(doyToMs(planStartDoy));

    await setup.plan.clickSimulationPlanBoundButton('start');
    await expect.poll(simStartMs).toBe(doyToMs(planStartDoy));
  });

  test('"Plan End" button resets the simulation end to the plan end and persists it', async () => {
    await setup.plan.setSimulationBound('end', '2022-028T00:00:00');
    await expect.poll(simEndMs).not.toBe(doyToMs(planEndDoy));

    await setup.plan.clickSimulationPlanBoundButton('end');
    await expect.poll(simEndMs).toBe(doyToMs(planEndDoy));
  });
});
