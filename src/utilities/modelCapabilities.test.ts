import { describe, expect, test } from 'vitest';
import type { Model } from '../types/model';
import {
  PLANDEV_SCHEDULING,
  PLAN_IMPORT,
  capabilityUnavailableReason,
  isCapabilitySupported,
  planImportFormats,
} from './modelCapabilities';

type Holder = Pick<Model, 'external_capabilities' | 'model_type'>;

function model(model_type: string | null, external_capabilities?: Record<string, unknown> | null): Holder {
  return { external_capabilities, model_type } as Holder;
}

describe('capabilityUnavailableReason', () => {
  test('a JAR model supports everything, because its capabilities are not in question', () => {
    // Compiled against PlanDev: there is no backend to ask and nothing to declare.
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, model('jar'))).toBeNull();
    expect(capabilityUnavailableReason(PLAN_IMPORT, model('jar'))).toBeNull();
  });

  test('a missing plan or model is treated as a JAR model rather than as unavailable', () => {
    // The plan store is null while a plan loads. Reporting "unavailable" during that window would
    // flash a disabled control and an explanation for a model nobody has looked at yet.
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, null)).toBeNull();
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, undefined)).toBeNull();
  });

  test('an external model that declares the capability supported is available', () => {
    const m = model('external', { [PLANDEV_SCHEDULING]: { supported: true } });
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, m)).toBeNull();
    expect(isCapabilitySupported(PLANDEV_SCHEDULING, m)).toBe(true);
  });

  test("an unsupported capability reports the BACKEND'S OWN sentence, verbatim", () => {
    // The whole reason capabilities are a document rather than a column per feature: the UI must
    // never contain a branch that names a framework, so the explanation has to travel with the
    // refusal. Adding a fifth backend must not mean editing the UI.
    const reason = 'This model schedules its own activities during simulation.';
    const m = model('external', { [PLANDEV_SCHEDULING]: { reason, supported: false } });
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, m)).toBe(reason);
  });

  test('an unsupported capability with no reason still says something usable', () => {
    const m = model('external', { [PLANDEV_SCHEDULING]: { supported: false } });
    expect(capabilityUnavailableReason(PLANDEV_SCHEDULING, m)).toMatch(/does not apply/);
  });

  test('an UNDECLARED capability is unavailable but reported differently, because it has a remedy', () => {
    // Three cases reach a user and they have three different remedies. Unsupported is permanent;
    // undeclared means the model predates capabilities or has not been re-introspected, which is
    // fixable -- so the message has to say so rather than collapsing into "unavailable".
    const declaredNothing = capabilityUnavailableReason(PLANDEV_SCHEDULING, model('external', {}));
    expect(declaredNothing).toMatch(/Re-introspect/);

    const nullCapabilities = capabilityUnavailableReason(PLANDEV_SCHEDULING, model('external', null));
    expect(nullCapabilities).toMatch(/Re-introspect/);
  });

  test('capabilities are independent of one another', () => {
    const m = model('external', {
      [PLANDEV_SCHEDULING]: { reason: 'it schedules itself', supported: false },
      [PLAN_IMPORT]: { formats: [{ key: 'x', label: 'X' }], supported: true },
    });
    expect(isCapabilitySupported(PLANDEV_SCHEDULING, m)).toBe(false);
    expect(isCapabilitySupported(PLAN_IMPORT, m)).toBe(true);
  });
});

describe('planImportFormats', () => {
  test('the declared formats come back when the capability is supported', () => {
    const formats = [{ extensions: ['.plan.json'], key: 'blackbird-plan-json', label: 'Blackbird plan' }];
    expect(planImportFormats(model('external', { [PLAN_IMPORT]: { formats, supported: true } }))).toEqual(formats);
  });

  test('nothing comes back when the capability is unsupported, even if formats are present', () => {
    // A file picker can be driven straight off this, so an unsupported capability has to yield an
    // empty list rather than a list the caller must remember to gate on separately.
    const formats = [{ key: 'x', label: 'X' }];
    expect(planImportFormats(model('external', { [PLAN_IMPORT]: { formats, supported: false } }))).toEqual([]);
  });

  test('a supported capability with no formats yields an empty list, not undefined', () => {
    expect(planImportFormats(model('external', { [PLAN_IMPORT]: { supported: true } }))).toEqual([]);
  });

  test('a JAR model offers no foreign plan formats', () => {
    // It supports every capability, but "import a plan written in another framework's format" is
    // not a thing a JAR model can do -- there is no backend to convert it.
    expect(planImportFormats(model('jar'))).toEqual([]);
  });
});
