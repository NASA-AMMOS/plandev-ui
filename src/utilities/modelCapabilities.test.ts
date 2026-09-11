import { describe, expect, test } from 'vitest';
import type { Model } from '../types/model';
import {
  PLANDEV_SCHEDULING,
  SIMULATION,
  capabilityUnavailableReason,
  isCapabilitySupported,
} from './modelCapabilities';

type Holder = Pick<Model, 'external_capabilities' | 'model_type'>;

function model(model_type: string | null, external_capabilities?: Record<string, unknown> | null): Holder {
  return { external_capabilities, model_type } as Holder;
}

describe('capabilityUnavailableReason', () => {
  test('a JAR model supports everything, because its capabilities are not in question', () => {
    // PlanDev compiled it: there is nothing to declare and nobody to ask.
    expect(capabilityUnavailableReason(SIMULATION, model('jar'))).toBeNull();
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, model('jar'))).toBeNull();
  });

  test('a missing plan or model is treated as a JAR model rather than as unavailable', () => {
    // The plan store is null while a plan loads. Reporting "unavailable" during that window would
    // flash a disabled control and an explanation for a model nobody has looked at yet.
    expect(capabilityUnavailableReason(SIMULATION, null)).toBeNull();
    expect(capabilityUnavailableReason(SIMULATION, undefined)).toBeNull();
    // A model queried before this field existed, or by a query that does not select it.
    expect(capabilityUnavailableReason(SIMULATION, model(null))).toBeNull();
  });

  test('a declared model that reports the capability supported is available', () => {
    const m = model('declared', { [SIMULATION]: { supported: true } });
    expect(capabilityUnavailableReason(SIMULATION, m)).toBeNull();
    expect(isCapabilitySupported(SIMULATION, m)).toBe(true);
  });

  test("an unsupported capability reports the DECLARATION'S OWN sentence, verbatim", () => {
    // The whole reason capabilities are a document rather than a column per feature: the UI must
    // never contain a branch naming where a model came from, so the explanation travels with the
    // refusal. A new kind of model must not mean editing the UI.
    const reason = 'This model was declared by a run transfer, so PlanDev has no simulator to run it.';
    expect(
      capabilityUnavailableReason(SIMULATION, model('declared', { [SIMULATION]: { reason, supported: false } })),
    ).toBe(reason);
  });

  test('an unsupported capability with no reason still says something', () => {
    // A reason is required of a declaration, so this is a producer's bug -- but a disabled control
    // with an empty tooltip reads as broken, which is worse than a generic sentence.
    for (const entry of [
      { supported: false },
      { reason: '   ', supported: false },
      { reason: null, supported: false },
    ]) {
      const message = capabilityUnavailableReason(SIMULATION, model('declared', { [SIMULATION]: entry }));
      expect(message).toBeTruthy();
      expect(message).toContain('does not apply');
    }
  });

  test('an undeclared capability is unavailable, and says only that', () => {
    // Treated as unsupported -- the safe direction -- without claiming to know why or prescribing a
    // remedy. There is no re-introspection to offer for a model that was declared by a file.
    const message = capabilityUnavailableReason(SIMULATION, model('declared', {}));
    expect(message).toBeTruthy();
    expect(message).toContain('does not say');
    expect(isCapabilitySupported(SIMULATION, model('declared', {}))).toBe(false);
  });

  test('a declared model with no capabilities at all supports nothing', () => {
    expect(isCapabilitySupported(SIMULATION, model('declared', null))).toBe(false);
    expect(isCapabilitySupported(SIMULATION, model('declared', undefined))).toBe(false);
  });

  test('capabilities are independent of each other', () => {
    const m = model('declared', {
      [PLANDEV_SCHEDULING]: { supported: true },
      [SIMULATION]: { reason: 'no simulator', supported: false },
    });
    expect(capabilityUnavailableReason(SIMULATION, m)).toBe('no simulator');
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, m)).toBeNull();
  });

  test('a model kind nobody has added yet is read, not assumed to be a JAR', () => {
    // The failure that matters runs one way: treating an unknown kind as a JAR offers every feature
    // for a model that may support none of them.
    expect(isCapabilitySupported(SIMULATION, model('something-later'))).toBe(false);
  });
});
