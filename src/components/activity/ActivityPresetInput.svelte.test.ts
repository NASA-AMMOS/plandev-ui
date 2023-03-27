import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { ActivityDirective, ActivityPreset } from '../../types/activity';
import ActivityPresetInput from './ActivityPresetInput.svelte';

vi.mock('$env/dynamic/public', () => import.meta***REMOVED***); // https://github.com/sveltejs/kit/issues/8180

describe('Activity Preset Input component', () => {
  afterEach(() => {
    cleanup();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('Should render "None" when no preset is associated to the directive', () => {
    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'ParameterTest',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'ParameterTest',
    };

    const { getByText } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    expect(getByText('None')).toBeDefined();
  });

  it('Should render the activity preset name that is associated to the directive', () => {
    const growBananaPreset1: ActivityPreset = {
      arguments: {
        growingDuration: 3600000000,
        quantity: 5,
      },
      associated_activity_type: 'GrowBanana',
      id: 1,
      model_id: 1,
      name: 'GrowBanana Preset 1',
    };

    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: {
        activity_id: 46,
        plan_id: 2,
        preset_id: growBananaPreset1.id,
        presets_applied: growBananaPreset1,
      },
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'GrowBanana',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'GrowBanana',
    };

    const { getByText, queryByText } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    expect(queryByText('None')).toBeNull();
    expect(getByText('GrowBanana Preset 1')).toBeDefined();
  });

  it('Should render the available presets for the activity type after clicking on the input', async () => {
    const growBananaPreset1: ActivityPreset = {
      arguments: {
        growingDuration: 3600000000,
        quantity: 5,
      },
      associated_activity_type: 'GrowBanana',
      id: 1,
      model_id: 1,
      name: 'GrowBanana Preset 1',
    };
    const growBananaPreset2: ActivityPreset = {
      arguments: {
        growingDuration: 360000000,
        quantity: 50,
      },
      associated_activity_type: 'GrowBanana',
      id: 2,
      model_id: 1,
      name: 'GrowBanana Preset 2',
    };

    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: {
        activity_id: 46,
        plan_id: 2,
        preset_id: growBananaPreset1.id,
        presets_applied: growBananaPreset1,
      },
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'GrowBanana',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'GrowBanana',
    };

    const { getByText, getAllByRole, component } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    component.activityPresets.updateValue(() => [growBananaPreset1, growBananaPreset2]);

    await fireEvent.click(getByText('GrowBanana Preset 1'));

    expect(getAllByRole('menuitem')).toHaveLength(3);
  });

  it('Should render the filtered presets after searching in the preset search field', async () => {
    const growBananaPreset1: ActivityPreset = {
      arguments: {
        growingDuration: 3600000000,
        quantity: 5,
      },
      associated_activity_type: 'GrowBanana',
      id: 1,
      model_id: 1,
      name: 'GrowBanana Preset 1',
    };
    const growBananaPreset2: ActivityPreset = {
      arguments: {
        growingDuration: 360000000,
        quantity: 50,
      },
      associated_activity_type: 'GrowBanana',
      id: 2,
      model_id: 1,
      name: 'GrowBanana Preset 2',
    };

    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: {
        activity_id: 46,
        plan_id: 2,
        preset_id: growBananaPreset1.id,
        presets_applied: growBananaPreset1,
      },
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'GrowBanana',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'GrowBanana',
    };

    const { getByText, getAllByRole, getByPlaceholderText, component } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    component.activityPresets.updateValue(() => [growBananaPreset1, growBananaPreset2]);

    await fireEvent.click(getByText('GrowBanana Preset 1'));
    await fireEvent.click(getByPlaceholderText('Search presets'));
    await fireEvent.input(getByPlaceholderText('Search presets'), { target: { value: '2' } });

    expect(getAllByRole('menuitem')).toHaveLength(2);
  });

  it('Save new preset button should be disabled when no name is provided', async () => {
    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'GrowBanana',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'GrowBanana',
    };

    const { getByText, getByRole } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    await fireEvent.click(getByText('None'));
    expect(getByRole('button', { name: 'Enter a unique name for the new preset' }).className).toContain('disabled');
  });

  it('Save new preset button should be clickable ', async () => {
    const activityDirective: ActivityDirective = {
      anchor_id: null,
      anchored_to_start: true,
      applied_preset: null,
      arguments: {},
      created_at: '2023-03-17T17:54:32.776874+00:00',
      id: 46,
      last_modified_arguments_at: '2023-03-17T17:54:32.776874+00:00',
      last_modified_at: '2023-03-17T17:54:32.776874+00:00',
      metadata: {},
      name: 'GrowBanana',
      plan_id: 2,
      source_scheduling_goal_id: null,
      start_offset: '00:00:00',
      tags: [],
      type: 'GrowBanana',
    };

    const { getByText, getByRole, getByPlaceholderText } = render(ActivityPresetInput, {
      activityDirective,
      modelId: 1,
    });

    await fireEvent.click(getByText('None'));
    await fireEvent.input(getByPlaceholderText('Enter preset name'), { target: { value: 'Preset Test 1' } });
    expect(getByRole('button', { name: 'Enter a unique name for the new preset' }).className).not.toContain('disabled');
  });
});
