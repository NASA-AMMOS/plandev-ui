import test, { expect } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

let setup: FullSetupResult;

test.beforeAll(async ({ browser }) => {
  setup = await setupTest(browser);
  await setup.plan.goto();
  await setup.plan.showPanel(PanelNames.SIMULATION, true);
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe.serial('Simulation', async () => {
  test(`Plans with no simulation runs should display a relevant message and simulation should be enabled`, async () => {
    await expect(setup.plan.navButtonSimulationMenuStatus).not.toBeVisible();
    await setup.plan.navButtonSimulation.hover();
    await expect(setup.plan.navButtonSimulationMenu).toBeVisible();
    await expect(setup.plan.navButtonSimulationMenu).toContainText('Simulation not run');
    await expect(setup.plan.navButtonSimulationMenu.getByRole('button', { name: 'Simulate' })).toBeEnabled();
    await expect(setup.plan.simulateButton).toBeEnabled();
    await expect(setup.plan.reSimulateButton).not.toBeVisible();

    // Expect no simulation runs to be visible
    const simHistoryLength = await setup.plan.getSimulationHistoryListLength();
    await expect(simHistoryLength).toBe(0);
  });

  test(`Plans with no activities should simulate`, async () => {
    const simHistoryLength = await setup.plan.getSimulationHistoryListLength();
    await setup.plan.runSimulation();

    // Expect a new dataset to be added to simulation history
    await expect.poll(() => setup.plan.getSimulationHistoryListLength()).toEqual(simHistoryLength + 1);

    // Expect re-simulate button to be enabled and simulation button disabled
    await expect(setup.plan.reSimulateButton).toBeEnabled();
    await expect(setup.plan.simulateButton).toBeDisabled();
  });

  test(`Re-simulating should re-run simulation`, async () => {
    const simHistoryLength = await setup.plan.getSimulationHistoryListLength();
    await setup.plan.reRunSimulation();
    await expect.poll(() => setup.plan.getSimulationHistoryListLength()).toEqual(simHistoryLength + 1);
  });

  test(`Plans with activities should simulate and result in simulated activities`, async () => {
    await setup.plan.showPanel(PanelNames.SIMULATED_ACTIVITIES_TABLE, true);
    await expect(
      setup.plan.panelSimulatedActivitiesTable.getByRole('gridcell', { name: 'GrowBanana' }),
    ).not.toBeVisible();
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.addActivityByDragAndDrop('GrowBanana');
    await setup.plan.runSimulation();
    await setup.plan.showPanel(PanelNames.SIMULATED_ACTIVITIES_TABLE, true);
    await expect(setup.plan.panelSimulatedActivitiesTable.getByRole('gridcell', { name: 'GrowBanana' })).toBeVisible();
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
  });

  test(`Plans with an invalid activity should fail simulation`, async () => {
    await setup.plan.addActivityByDragAndDrop('BakeBananaBread');
    await setup.plan.runSimulation(Status.Failed);
  });

  test(`Modified plans should indicate that simulation is out of date`, async () => {
    await setup.plan.addActivityByDragAndDrop();
    await setup.plan.waitForSimulationStatus(Status.Modified);
  });

  // Catches gross regressions in the streaming-profile pipeline that the unit
  // tests can't see: actually exercises real Hasura cursors / interval ordering
  // / WS reconnects via graphql-ws across a real sim → resimulate cycle, then
  // asserts the global timeline status indicator never enters its error state
  // and the timeline panel stays mounted. The "blank plot after resimulate"
  // bug specifically isn't directly assertable here without canvas-pixel
  // inspection or test hooks (deliberately avoided) — that's covered by the
  // resimulate-fast unit test in src/stores/profile.test.ts. This e2e is a
  // smoke test that the pipeline doesn't broadly fall over on real backend.
  test(`Streaming pipeline survives a sim → resimulate cycle without timeline errors`, async () => {
    const timelineErrorIndicator = setup.plan.page.getByRole('status', { name: 'Timeline data error' });

    await setup.plan.runSimulation();
    await expect(timelineErrorIndicator).not.toBeVisible();

    await setup.plan.reRunSimulation();
    await expect(timelineErrorIndicator).not.toBeVisible();
    await expect(setup.plan.panelTimeline).toBeVisible();
  });
});
