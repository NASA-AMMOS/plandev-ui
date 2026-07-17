import test, { expect } from '@playwright/test';
import { adjectives, animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { ExpansionRules } from '../fixtures/ExpansionRules.js';
import { ExpansionSets } from '../fixtures/ExpansionSets.js';
import { Parcels } from '../fixtures/Parcels.js';
import { PanelNames } from '../fixtures/Plan.js';
import { setupTest, teardownTest, type FullSetupResult } from '../utilities/api.js';

const sequenceFilterName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });
const expansionSequenceName: string = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] });

let setup: FullSetupResult;
let dictionaryName: string;
let dictionaries: Dictionaries;
let parcels: Parcels;
let expansionRules: ExpansionRules;
let expansionSets: ExpansionSets;

test.beforeAll(async ({ baseURL, browser }) => {
  setup = await setupTest(browser);
  dictionaries = new Dictionaries(setup.page);
  parcels = new Parcels(setup.page);
  expansionRules = new ExpansionRules(setup.page, parcels, setup.models);
  expansionSets = new ExpansionSets(setup.page, parcels, setup.models, expansionRules);

  await dictionaries.goto();
  await dictionaries.createCommandDictionary();
  dictionaryName = dictionaries.commandDictionaryName;
  await parcels.goto();
  await parcels.createParcel(dictionaryName, baseURL);
});

test.afterAll(async () => {
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
    await expansionRules.goto();
    await expansionRules.createExpansionRule(baseURL);
    await expansionSets.goto();
    await expansionSets.createExpansionSet(baseURL);
    const expansionSetId = await expansionSets.page
      .getByRole('tabpanel')
      .filter({ hasText: 'Expansion Sets' })
      .getByRole('treegrid')
      .getByRole('row', { name: expansionSets.expansionSetName })
      .getByRole('gridcell')
      .first()
      .textContent();

    await setup.plan.goto();

    setup.plan.constraints.constraintDefinition =
      "export default function peelFailing(): Constraint { return Real.Resource('/peel').lessThan(-1000); }";
    await setup.plan.showConstraintsLayout();
    await setup.plan.createConstraint(baseURL);

    // running a simulation on the plan is required before being able to check constraints
    await setup.plan.showPanel(PanelNames.SIMULATION, true);
    // run the simulation if it already hasn't been
    if (await setup.plan.simulateButton.isEnabled()) {
      await setup.plan.runSimulation();
    }

    // evaluate constraints
    await setup.plan.navButtonConstraints.click();
    await setup.plan.navButtonConstraintsMenu.getByText('Check Constraints', { exact: true }).click();

    // expand
    await setup.plan.showPanel(PanelNames.EXPANSION);

    await setup.page
      .locator('select[name="expansionSetId"]')
      .selectOption({ label: `${expansionSets.expansionSetName} (${expansionSetId})` });

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
