import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { ActivityType } from '../../types/activity';
import ArgumentsCellRenderer from './ArgumentsCellRenderer.svelte';

const activityTypes: ActivityType[] = [
  {
    computed_attributes_value_schema: { items: {}, type: 'struct' },
    name: 'PeelBanana',
    parameters: {
      peelDirection: {
        order: 1,
        schema: {
          type: 'variant',
          variants: [
            { key: 'fromStem', label: 'fromStem' },
            { key: 'fromTip', label: 'fromTip' },
          ],
        },
      },
      quantity: { order: 0, schema: { type: 'int' } },
    },
    required_parameters: ['quantity'],
  },
];

describe('Arguments Cell Renderer component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the explicitly set arguments', () => {
    const { container, getByText } = render(ArgumentsCellRenderer, {
      activityTypeName: 'PeelBanana',
      activityTypes,
      args: { peelDirection: 'fromTip', quantity: 3 },
    });

    expect(container.getElementsByClassName('argument-line')).toHaveLength(2);
    expect(container.getElementsByClassName('argument-line--default')).toHaveLength(0);
    expect(getByText('quantity:').parentElement?.textContent).toContain('3');
    expect(getByText('peelDirection:').parentElement?.textContent).toContain('fromTip');
  });

  it('Should render mission model defaults for arguments that are not explicitly set', () => {
    const { container, getByText } = render(ArgumentsCellRenderer, {
      activityTypeName: 'PeelBanana',
      activityTypes,
      args: { quantity: 3 },
      defaultArgs: { peelDirection: 'fromStem' },
    });

    const defaultLines = container.getElementsByClassName('argument-line--default');

    expect(container.getElementsByClassName('argument-line')).toHaveLength(2);
    expect(defaultLines).toHaveLength(1);
    expect(defaultLines[0].textContent).toContain('peelDirection:');
    expect(getByText('peelDirection:').parentElement?.textContent).toContain('fromStem');
  });

  it('Should prefer an explicitly set argument over the mission model default', () => {
    const { container, getByText } = render(ArgumentsCellRenderer, {
      activityTypeName: 'PeelBanana',
      activityTypes,
      args: { peelDirection: 'fromTip', quantity: 3 },
      defaultArgs: { peelDirection: 'fromStem' },
    });

    expect(container.getElementsByClassName('argument-line--default')).toHaveLength(0);
    expect(getByText('peelDirection:').parentElement?.textContent).toContain('fromTip');
  });
});
