import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { Tag } from '../../../types/tags';
import TagsInput from './TagsInput.svelte';

describe('TagsInput component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the TagsInput component', async () => {
    const makeTag = (name: string): Tag => ({ color: '#FFFFFF', created_at: '', id: -1, name, owner: '' });
    const selected: Tag[] = ['Orange', 'Yellow'].map(makeTag);
    const options: Tag[] = ['Red', 'Green', 'Blue'].map(makeTag);
    const { getByRole, queryByText, getByText, getAllByRole, queryByRole } = render(TagsInput, {
      createTagObject: makeTag,
      name: 'Test Name',
      options,
      selected,
    });

    // Input name should match name prop
    expect((getByRole('textbox') as HTMLInputElement).name).to.equal('Test Name');

    // Input name should match name prop
    selected.forEach(tag => {
      expect(getByText(tag.name)).to.exist;
    });

    // Test opening autosuggest
    await fireEvent.focus(getByRole('textbox'));
    expect(getByRole('listbox')).to.exist;

    // Test closing autosuggest
    await fireEvent.keyDown(getByRole('textbox'), { key: 'Escape' });
    expect(queryByRole('listbox')).to.not.exist;

    // Test tag removal
    expect(getAllByRole('option').length).to.equal(selected.length);
    await fireEvent.click(getAllByRole('option')[0]);
    expect(queryByText(selected[0].name)).to.be.null;
  });
});
