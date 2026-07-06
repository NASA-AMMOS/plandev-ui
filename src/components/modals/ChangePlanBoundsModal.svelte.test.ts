import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Plan } from '../../types/plan';
import effects from '../../utilities/effects';
import ChangePlanBoundsModal from './ChangePlanBoundsModal.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env); // https://github.com/sveltejs/kit/issues/8180
vi.mock('../../utilities/effects', () => ({
  default: { updatePlanTimeBounds: vi.fn() },
}));

const plan = {
  duration: '216:00:00',
  end_time_doy: '2024-010T00:00:00',
  id: 1,
  start_time: '2024-01-01T00:00:00+00:00',
} as Plan;

// Commit a new value into a DatePicker input: set the bound value (input event) then trigger the
// component's on:change handler.
async function setDateInput(input: HTMLInputElement, value: string) {
  await fireEvent.input(input, { target: { value } });
  await fireEvent.change(input, { target: { value } });
}

describe('ChangePlanBoundsModal component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the warning and seeds the fields, with Update disabled until something changes', () => {
    const { container, getByRole, getByText } = render(ChangePlanBoundsModal, { props: { plan, user: null } });

    expect(getByText(/remain fixed in absolute time/i)).toBeTruthy();

    const startInput = container.querySelector('input[name="boundsStartTime"]') as HTMLInputElement;
    expect(startInput.value).toContain('2024-001');

    const updateButton = getByRole('button', { name: 'Update Time Range' }) as HTMLButtonElement;
    expect(updateButton.disabled).toBe(true);
  });

  it('dispatches close when Cancel is clicked', async () => {
    const { component, getByRole } = render(ChangePlanBoundsModal, { props: { plan, user: null } });
    const onClose = vi.fn();
    component.$on('close', onClose);

    await fireEvent.click(getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('dispatches confirm and calls the effect when the update succeeds', async () => {
    vi.mocked(effects.updatePlanTimeBounds).mockResolvedValue(true);
    const { component, container, getByRole } = render(ChangePlanBoundsModal, { props: { plan, user: null } });
    const onConfirm = vi.fn();
    component.$on('confirm', onConfirm);

    const startInput = container.querySelector('input[name="boundsStartTime"]') as HTMLInputElement;
    await setDateInput(startInput, '2023-300T00:00:00');

    const updateButton = getByRole('button', { name: 'Update Time Range' }) as HTMLButtonElement;
    await waitFor(() => expect(updateButton.disabled).toBe(false));
    await fireEvent.click(updateButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(effects.updatePlanTimeBounds).toHaveBeenCalled();
  });

  it('shows an error and stays open when the update fails', async () => {
    vi.mocked(effects.updatePlanTimeBounds).mockResolvedValue(false);
    const { component, container, findByText, getByRole } = render(ChangePlanBoundsModal, {
      props: { plan, user: null },
    });
    const onConfirm = vi.fn();
    component.$on('confirm', onConfirm);

    const startInput = container.querySelector('input[name="boundsStartTime"]') as HTMLInputElement;
    await setDateInput(startInput, '2023-300T00:00:00');

    const updateButton = getByRole('button', { name: 'Update Time Range' }) as HTMLButtonElement;
    await waitFor(() => expect(updateButton.disabled).toBe(false));
    await fireEvent.click(updateButton);

    expect(await findByText(/Failed to update/i)).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
