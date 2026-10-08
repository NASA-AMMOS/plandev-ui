import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writable } from 'svelte/store';
import ManagePlanSchedulingGoalsModal from './ManagePlanSchedulingGoalsModal.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180
vi.mock('$app/paths', () => ({ base: '' }));

vi.mock('../../utilities/effects', () => ({
  default: {
    updateSchedulingGoalPlanSpecifications: vi.fn(),
  },
}));

vi.mock('../../utilities/permissionHandler', () => ({
  permissionHandler: () => ({ destroy: () => undefined, update: () => undefined }),
}));

vi.mock('../../utilities/permissions', () => ({
  featurePermissions: {
    schedulingGoals: { canCreate: () => true },
    schedulingGoalsPlanSpec: { canUpdate: () => true },
  },
  isAdminRole: () => true,
}));

vi.mock('../../stores/plan', () => ({
  plan: writable({ id: 1, model: { id: 1 }, model_id: 1, name: 'test-plan' }),
  planReadOnly: writable(false),
}));

vi.mock('../../stores/scheduling', () => ({
  allowedSchedulingGoalSpecs: writable([]),
  schedulingGoals: writable([]),
  schedulingGoalsLoading: writable(false),
  schedulingPlanSpecification: writable({ id: 1 }),
}));

vi.stubGlobal(
  'ResizeObserver',
  vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  })),
);

describe('ManagePlanSchedulingGoalsModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('Should send a single update request when "Update" is clicked once', async () => {
    const effects = (await import('../../utilities/effects')).default;
    vi.mocked(effects.updateSchedulingGoalPlanSpecifications).mockResolvedValue(undefined);

    const { getByRole } = render(ManagePlanSchedulingGoalsModal, { user: null });
    const updateButton = getByRole('button', { name: 'Update' });

    await fireEvent.click(updateButton);

    await waitFor(() => expect(effects.updateSchedulingGoalPlanSpecifications).toHaveBeenCalledTimes(1));
  });

  it('Should not send a second update request when "Update" is clicked again while a request is in flight', async () => {
    const effects = (await import('../../utilities/effects')).default;
    // Hold the first request open so the second click happens while it is still in flight,
    // which is the race that produced duplicate goal invocations (#1974). The guard under
    // test is the in-flight check itself, so the request payload is irrelevant here.
    let resolveUpdate: (value?: PromiseLike<void> | void) => void = () => undefined;
    vi.mocked(effects.updateSchedulingGoalPlanSpecifications).mockImplementation(
      () => new Promise<void>(resolve => (resolveUpdate = resolve)),
    );

    const { getByRole } = render(ManagePlanSchedulingGoalsModal, { user: null });
    const updateButton = getByRole('button', { name: 'Update' }) as HTMLButtonElement;

    await fireEvent.click(updateButton);
    await fireEvent.click(updateButton);

    // On unpatched code this reports 2 calls — the duplicate request that produces duplicate invocations.
    expect(effects.updateSchedulingGoalPlanSpecifications).toHaveBeenCalledTimes(1);
    expect(updateButton.disabled).toBe(true);

    resolveUpdate();

    await waitFor(() => expect(effects.updateSchedulingGoalPlanSpecifications).toHaveBeenCalledTimes(1));
  });
});
