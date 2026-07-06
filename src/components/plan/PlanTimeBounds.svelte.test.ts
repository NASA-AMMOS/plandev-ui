import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Plan } from '../../types/plan';
import { showChangePlanBoundsModal } from '../../utilities/modal';
import PlanTimeBounds from './PlanTimeBounds.svelte';

vi.mock('../../utilities/modal', () => ({
  showChangePlanBoundsModal: vi.fn(),
}));

const plan = {
  duration: '216:00:00',
  end_time_doy: '2024-010T00:00:00',
  id: 1,
  start_time: '2024-01-01T00:00:00+00:00',
} as Plan;

describe('PlanTimeBounds component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the start and end times as read-only (copyable) inputs', () => {
    const { container } = render(PlanTimeBounds, { props: { hasUpdatePermission: true, plan, user: null } });

    const startInput = container.querySelector('input[name="planStartTime"]') as HTMLInputElement;
    const endInput = container.querySelector('input[name="planEndTime"]') as HTMLInputElement;
    const durationInput = container.querySelector('input[name="planDuration"]') as HTMLInputElement;

    // Read-only (so text stays selectable/copyable) rather than disabled.
    expect(startInput.hasAttribute('readonly')).toBe(true);
    expect(startInput.hasAttribute('disabled')).toBe(false);
    expect(endInput.hasAttribute('readonly')).toBe(true);

    expect(startInput.value).toContain('2024-001');
    expect(endInput.value).toContain('2024-010');
    expect(durationInput.value).not.toBe('');
  });

  it('opens the change-plan-bounds modal when the edit button is clicked', async () => {
    const { getByRole } = render(PlanTimeBounds, { props: { hasUpdatePermission: true, plan, user: null } });

    await fireEvent.click(getByRole('button', { name: 'Change plan time range' }));

    expect(showChangePlanBoundsModal).toHaveBeenCalledWith(plan, null);
  });
});
