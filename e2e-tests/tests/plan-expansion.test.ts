import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const expansionSequenceName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

let setup: FullSetupResult;
let dictionaryName: string;
let dictionaries: Dictionaries;
let parcels: Parcels;

test.beforeAll(async ({ baseURL, browser }) => {
  setup = await setupTest(browser);
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);
});

test.afterAll(async () => {
  await parcels.goto();
  await teardownTest(setup);
});

test.beforeEach(async () => {
  await setup.plan.goto(); // Refresh page to reset the view
});

test.describe.serial('Plan Expansion', () => {
  test('Expansion Sequence can be created', async () => {
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.runSimulation();
    await setup.plan.showPanel(PanelNames.EXPANSION);
    await setup.plan.sequenceExpansionNewButton.click();
    await setup.plan.sequenceExpansionNewSequenceButton.click();
    await setup.plan.sequenceExpansionNewSequenceName.fill(expansionSequenceName);
    await setup.plan.sequenceExpansionNewSequenceConfirmButton.click();
    await setup.plan.waitForToast('Expansion Sequence Created Successfully');
    await expect(setup.page.locator('.sne-items').getByText(expansionSequenceName, { exact: true })).toBeVisible();
  });
  test('Sequence Filter can be created', async () => {
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.showPanel(PanelNames.EXPANSION);
    await setup.plan.createSequenceFilter(sequenceFilterName);
  });
  test('Sequence Filter can be applied to a plan', async () => {
    await setup.plan.addActivityByDragAndDrop('PeelBanana');
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    await setup.plan.runSimulation();
    await setup.plan.showPanel(PanelNames.EXPANSION);
    await setup.plan.applySequenceFilter(sequenceFilterName, setup.plans.planId);
  });

  test('Planners warned if constraints have issues', async ({ baseURL }) => {
    setup.plan.constraints.constraintDefinition =
      "export default function peelFailing(): Constraint { return Real.Resource('/peel').lessThan(-1000); }";
    await setup.plan.showConstraintsLayout();
    await setup.plan.createConstraint(baseURL);

    // evaluate constraints
    await setup.page.getByRole('navigation').getByText('Constraints').click();
    await setup.page.getByText('Check Constraints', { exact: true }).click();

    // expand
    await setup.plan.showPanel(PanelNames.EXPANSION);
    await setup.page.locator('select[name="expansionSetId"]').selectOption('2');

    const sequenceName = `${sequenceFilterName} Sequence (Plan ${setup.planId})`;
    await setup.page.getByText(sequenceName, { exact: true }).hover();

    const expansionButton = setup.page.getByRole('button', { name: `Expand '${sequenceName}'` });
    await expansionButton.waitFor({ state: 'visible' });
    await expansionButton.click();

    // check warning
    await expect(setup.page.getByText('Violating Constraints')).toBeVisible();
    await expect(setup.page.getByText('This constraint is currently')).toBeVisible();
    await expect(setup.page.getByText('(1 violation)')).toBeVisible();

    await setup.page.getByRole('button', { name: 'Expand Anyways' }).click();
  });
});
