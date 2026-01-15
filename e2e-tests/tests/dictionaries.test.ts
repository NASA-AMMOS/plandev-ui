import test from '@playwright/test';
import { Dictionaries } from '../fixtures/Dictionaries.js';
import { setupTest, teardownTest, type BrowserSetupResult } from '../utilities/api.js';

let setup: BrowserSetupResult;
let dictionaries: Dictionaries;

test.beforeAll(async ({ browser }) => {
  // Increase global timeout to prevent early test termination
  test.setTimeout(90000); // 90 seconds

  setup = await setupTest(browser, { model: false });
  dictionaries = new Dictionaries(setup.page);
  await dictionaries.goto();
});

test.afterAll(async () => {
  await teardownTest(setup);
});

test.describe('Dictionaries', () => {
  test.describe.serial('Channel Dictionary', () => {
    test('Create channel dictionary', async () => {
      await dictionaries.createChannelDictionary();
    });

    test('Delete channel dictionary', async () => {
      await dictionaries.deleteChannelDictionary();
    });
  });

  test.describe.serial('Command Dictionary', () => {
    test('Create command dictionary', async () => {
      await dictionaries.createCommandDictionary();
    });

    test('Delete command dictionary', async () => {
      await dictionaries.deleteCommandDictionary();
    });
  });

  test.describe.serial('Parameter Dictionary', () => {
    test('Create parameter dictionary', async () => {
      await dictionaries.createParameterDictionary();
    });

    test('Delete parameter dictionary', async () => {
      await dictionaries.deleteParameterDictionary();
    });
  });

  test.describe('Sequence Adaptation', () => {
    test('Create sequence adaptation', async () => {
      await dictionaries.createSequenceAdaptation();
    });

    test('Delete sequence adaptation', async () => {
      await dictionaries.deleteSequenceAdaptation();
    });
  });
});
