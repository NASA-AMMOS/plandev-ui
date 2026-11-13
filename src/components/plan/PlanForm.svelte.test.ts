import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialPlan, planReadOnlySnapshot } from '../../stores/plan';
import { mockUser } from '../../tests/mocks/user/mockUser';
import type { Plan } from '../../types/plan';
import effects from '../../utilities/effects';
import PlanForm from './PlanForm.svelte';

vi.mock('$env/dynamic/public', () => import.meta.env);

const plan = {
  collaborators: [],
  created_at: '2024-01-01T00:00:00Z',
  description: 'First line\nSecond line <plain text>',
  duration: '24:00:00',
  end_time_doy: '2024-002T00:00:00',
  id: 1,
  model: null,
  name: 'Test plan',
  owner: mockUser.id,
  start_time: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as unknown as Plan;

function renderForm(value = plan, user: typeof mockUser | null = mockUser) {
  initialPlan.set(value);
  return render(PlanForm, { plan: value, planTags: [], user, usersLoading: true });
}

afterEach(() => {
  cleanup();
  initialPlan.set(null);
  planReadOnlySnapshot.set(false);
  vi.restoreAllMocks();
});

describe('Plan description', () => {
  it('renders multiline plain text and saves edits and clearing', async () => {
    const update = vi.spyOn(effects, 'updatePlan').mockResolvedValue(true);
    const { getByLabelText } = renderForm();
    const input = getByLabelText('Description') as HTMLTextAreaElement;
    expect(input.value).toBe(plan.description);
    await fireEvent.input(input, { target: { value: 'Updated\nDescription' } });
    await fireEvent.change(input);
    expect(update).toHaveBeenLastCalledWith(plan, { description: 'Updated\nDescription' }, mockUser);
    await fireEvent.input(input, { target: { value: '' } });
    await fireEvent.change(input);
    expect(update).toHaveBeenLastCalledWith(plan, { description: '' }, mockUser);
  });

  it('shows a missing description as empty and does not save an unchanged value', async () => {
    const update = vi.spyOn(effects, 'updatePlan').mockResolvedValue(true);
    const { getByLabelText } = renderForm({ ...plan, description: null });
    const input = getByLabelText('Description') as HTMLTextAreaElement;
    expect(input.value).toBe('');
    await fireEvent.change(input);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(['no permission', 'snapshot'])(
    'allows reading and selection while preventing description edits with %s',
    async reason => {
      const update = vi.spyOn(effects, 'updatePlan').mockResolvedValue(true);
      planReadOnlySnapshot.set(reason === 'snapshot');
      const { getByLabelText } = renderForm(plan, reason === 'snapshot' ? mockUser : null);
      const input = getByLabelText('Description') as HTMLTextAreaElement;
      expect(input.value).toBe(plan.description);
      expect(input.readOnly).toBe(true);
      expect(input.disabled).toBe(false);
      expect(input.classList.contains('opacity-50')).toBe(true);
      expect(await fireEvent.mouseDown(input)).toBe(true);
      input.focus();
      expect(document.activeElement).toBe(input);
      input.setSelectionRange(0, 10);
      expect(input.value.slice(input.selectionStart, input.selectionEnd)).toBe('First line');
      await fireEvent.change(input, { target: { value: 'Blocked' } });
      expect(update).not.toHaveBeenCalled();
    },
  );
});
