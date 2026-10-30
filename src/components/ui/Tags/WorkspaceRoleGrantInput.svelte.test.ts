import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ROLE } from '../../../utilities/roles';
import WorkspaceRoleGrantInput from './WorkspaceRoleGrantInput.svelte';

Object.defineProperty(window, 'matchMedia', {
  enumerable: true,
  value: vi.fn().mockImplementation(query => ({
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
  })),
  writable: true,
});

describe('WorkspaceRoleGrantInput component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should show granted roles by display name and only offer ungranted, non-admin roles', async () => {
    const { getByRole, getByText, queryByText } = render(WorkspaceRoleGrantInput, {
      name: 'role-grants',
      roles: [ADMIN_ROLE, 'mission_ops', 'science_team', 'viewer'],
      selectedRoles: ['science_team'],
    });

    expect(getByText('science_team')).to.exist;

    await fireEvent.focus(getByRole('textbox'));
    const optionNames = within(getByRole('listbox'))
      .getAllByRole('option')
      .map(option => option.textContent?.trim());
    expect(optionNames).to.include('mission_ops');
    expect(optionNames).to.include('viewer');
    expect(optionNames).to.not.include('science_team');
    expect(queryByText('admin')).to.be.null;
    expect(queryByText(ADMIN_ROLE)).to.be.null;
  });

  it('Should dispatch the raw role when a granted role with an alias is removed', async () => {
    const onDelete = vi.fn();
    const { component, getAllByRole } = render(WorkspaceRoleGrantInput, {
      roles: [ADMIN_ROLE, 'user'],
      selectedRoles: [ADMIN_ROLE],
    });
    component.$on('delete', onDelete);

    await fireEvent.click(getAllByRole('option')[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].detail).toEqual(ADMIN_ROLE);
  });

  it('Should tell apart roles whose display names collide', async () => {
    const onDelete = vi.fn();
    const { component, getByText } = render(WorkspaceRoleGrantInput, {
      roles: [ADMIN_ROLE, 'admin'],
      selectedRoles: [ADMIN_ROLE, 'admin'],
    });
    component.$on('delete', onDelete);

    await fireEvent.click(getByText('admin', { selector: '.chip-label' }));
    expect(onDelete.mock.calls[0][0].detail).toEqual('admin');
    expect(getByText(ADMIN_ROLE)).to.exist;
  });
});
