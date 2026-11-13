import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchedulingDefinitionType } from '../../../enums/scheduling';
import type { ArgumentsMap } from '../../../types/parameter';
import type {
  SchedulingGoalMetadata,
  SchedulingGoalPlanSpecification,
  SchedulingGoalPlanSpecificationUpdate,
} from '../../../types/scheduling';
import SchedulingGoal from './SchedulingGoal.svelte';

vi.mock('$env/dynamic/public', () => ({ env: {} }));

function renderGoal(argumentsMap: ArgumentsMap = {}, defaultArguments: ArgumentsMap = {}) {
  const goal: SchedulingGoalMetadata = {
    analyses: [],
    created_at: '',
    id: 1,
    models_using: [],
    name: 'External events goal',
    owner: 'test',
    plans_using: [],
    public: true,
    tags: [],
    updated_at: '',
    updated_by: 'test',
    versions: [],
  };
  goal.versions = [
    {
      author: 'test',
      created_at: '',
      definition: null,
      goal_id: goal.id,
      metadata: goal,
      models_using: [],
      parameter_schema: {
        items: {
          derivationGroups: { items: { type: 'string' }, type: 'series' },
          eventTypes: { items: { type: 'string' }, type: 'series' },
        },
        type: 'struct',
      },
      plans_using: [],
      revision: 0,
      tags: [],
      type: SchedulingDefinitionType.JAR,
      uploaded_jar_id: 1,
    },
  ];
  const goalPlanSpec: SchedulingGoalPlanSpecification = {
    arguments: argumentsMap,
    enabled: true,
    goal_id: goal.id,
    goal_invocation_id: 1,
    goal_metadata: null,
    goal_revision: null,
    priority: 0,
    simulate_after: false,
    specification_id: 1,
  };
  const result = render(SchedulingGoal, { defaultArguments, goal, goalPlanSpec, hasEditPermission: true, modelId: 1 });
  const onUpdate = vi.fn();
  result.component.$on('updateGoalPlanSpec', (event: CustomEvent<SchedulingGoalPlanSpecificationUpdate>) => {
    onUpdate(event.detail);
    result.component.$set({ goalPlanSpec: event.detail });
  });
  return { ...result, onUpdate };
}

describe('Scheduling goal list parameters', () => {
  afterEach(cleanup);

  it.each([{}, { eventTypes: null }])(
    'initializes an unset list and supports editing, adding, and removing: %j',
    async argumentsMap => {
      const { container, getByRole, onUpdate } = renderGoal({ ...argumentsMap, derivationGroups: ['weather'] });
      await fireEvent.click(getByRole('button', { name: /External events goal/ }));
      await waitFor(() => expect(container.querySelectorAll('.parameter-rec-series')).toHaveLength(2));
      const series = within(container.querySelectorAll<HTMLElement>('.parameter-rec-series')[1]);
      const add = series.getByRole('button', { name: 'Add Value' });
      const remove = series.getByRole('button', { name: 'Remove Value' });
      expect((remove as HTMLButtonElement).disabled).toBe(true);

      await fireEvent.click(add);
      expect(onUpdate.mock.lastCall?.[0].arguments).toEqual({ derivationGroups: ['weather'], eventTypes: [''] });
      await fireEvent.input(series.getByRole('textbox'), { target: { value: 'rain' } });
      await fireEvent.change(series.getByRole('textbox'));
      expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual(['rain']);

      await fireEvent.click(add);
      expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual(['rain', '']);
      await fireEvent.click(remove);
      expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual(['rain']);
      await fireEvent.click(remove);
      expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual([]);
      expect((remove as HTMLButtonElement).disabled).toBe(true);
      await fireEvent.click(add);
      expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual(['']);
    },
  );

  it.each([
    [{}, { eventTypes: ['default'] }, ['default', '']],
    [{ eventTypes: ['saved'] }, { eventTypes: ['default'] }, ['saved', '']],
    [{ eventTypes: [] }, { eventTypes: ['default'] }, ['']],
  ])('preserves saved and default list values: %j', async (argumentsMap, defaultArguments, expected) => {
    const { container, getByRole, onUpdate } = renderGoal(argumentsMap, defaultArguments);
    await fireEvent.click(getByRole('button', { name: /External events goal/ }));
    await waitFor(() => expect(container.querySelectorAll('.parameter-rec-series')).toHaveLength(2));
    const series = within(container.querySelectorAll<HTMLElement>('.parameter-rec-series')[1]);
    await fireEvent.click(series.getByRole('button', { name: 'Add Value' }));
    expect(onUpdate.mock.lastCall?.[0].arguments.eventTypes).toEqual(expected);
  });
});
