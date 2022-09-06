import ActivityIcon from '@nasa-jpl/stellar/icons/plan.svg?component';
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';

describe('SVG Components', () => {
  afterEach(() => {
    cleanup();
  });

  it('Should render an imported SVG', () => {
    const { container } = render(ActivityIcon);

    expect(container.getElementsByTagName('svg').length).to.equal(1);
    expect(container.getElementsByClassName('st-icon').length).to.equal(1);
  });
});
