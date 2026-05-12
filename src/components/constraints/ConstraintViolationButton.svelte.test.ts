import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConstraintViolationButton from './ConstraintViolationButton.svelte';

vi.mock('../../stores/plan', async () => {
  const { writable } = await import('svelte/store');

  return {
    viewTimeRange: writable({ end: 0, start: 0 }),
  };
});

describe('ConstraintViolationButton component', () => {
  const window = {
    end: Date.UTC(2026, 4, 6, 10, 41, 19, 175),
    start: Date.UTC(2026, 4, 6, 0, 0, 0, 0),
  };

  afterEach(() => {
    cleanup();
  });

  it('renders the violation time range', () => {
    const { getByRole } = render(ConstraintViolationButton, { window });

    expect(getByRole('button').textContent).toContain('2026-126');
    expect(getByRole('button').textContent).toContain('10:41:19.175');
  });

  it('renders a violation message when provided', () => {
    const message = 'Fruit count is outside of boundaries: [5, 10]';
    const button = render(ConstraintViolationButton, { message, window });

    expect(button.getByText(message)).toBeTruthy();
  });

  it('does not render a blank violation message', () => {
    const { container } = render(ConstraintViolationButton, { message: '   ', window });

    expect(container.querySelector('.violation-message')).toBeNull();
  });
});
