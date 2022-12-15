import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Tags from './Tags.svelte';

describe('Tags component', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render the Tags component', async () => {
    const tags = ['Red', 'Green', 'Blue'];
    const { getByRole, queryByText, getAllByText, getByText, getByPlaceholderText } = render(Tags, {
      name: 'Test Name',
      placeholder: 'Enter stage left',
      tags: [...tags],
    });

    // Input placeholder should match placeholder prop
    expect(getByPlaceholderText('Enter stage left')).to.exist;

    // Input name should match name prop
    expect((getByRole('textbox') as HTMLInputElement).name).to.equal('Test Name');

    // Input name should match name prop
    tags.forEach(tag => {
      expect(getByText(tag)).to.exist;
    });

    // Input name should match name prop
    tags.forEach(tag => {
      expect(tag).to.exist;
    });

    // Test tag removal
    expect(getAllByText('×').length).to.equal(tags.length);
    await fireEvent.pointerDown(getAllByText('×')[0]);
    expect(queryByText(tags[0])).to.be.null;
  });
});
