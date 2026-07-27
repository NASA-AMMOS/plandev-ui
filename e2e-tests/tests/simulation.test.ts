import test, { expect } from '@playwright/test';
import { Status } from '../../src/enums/status.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';
import { anyCanvasHasContent } from '../utilities/canvas.js';

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

  // Smoke test for the windowed-pull pipeline: indicator settles cleanly and
  // canvases render non-transparent content (catches the "blank plot" bug an
  // indicator-only check would miss).
  test(`Streaming pipeline: indicator settles + canvases render across two re-sims`, async () => {
    const timelineErrorIndicator = setup.plan.page.getByRole('status', { name: 'Timeline data error' });
    const timelineLoadingIndicator = setup.plan.page.getByRole('status', { name: 'Timeline loading' });
    const timelineCanvasContent = () => anyCanvasHasContent(setup.page, '[data-component-name="TimelinePanel"] canvas');

    await setup.plan.reRunSimulation();
    await expect(timelineErrorIndicator).not.toBeVisible();
    await expect(timelineLoadingIndicator).not.toBeVisible();
    await expect.poll(timelineCanvasContent, { timeout: 10000 }).toBe(true);

    await setup.plan.reRunSimulation();
    await expect(timelineErrorIndicator).not.toBeVisible();
    await expect(timelineLoadingIndicator).not.toBeVisible();
    await expect.poll(timelineCanvasContent, { timeout: 10000 }).toBe(true);
  });

  test(`Plans with an invalid activity should fail simulation`, async () => {
    const timelineLoadingIndicator = setup.plan.page.getByRole('status', { name: 'Timeline loading' });
    await setup.plan.addActivityByDragAndDrop('BakeBananaBread');
    await setup.plan.runSimulation(Status.Failed);
    // Regression: indicator must settle for terminal-null sims too.
    await expect(timelineLoadingIndicator).not.toBeVisible();
  });

  test(`Modified plans should indicate that simulation is out of date`, async () => {
    await setup.plan.addActivityByDragAndDrop();
    await setup.plan.waitForSimulationStatus(Status.Modified);
  });
});
