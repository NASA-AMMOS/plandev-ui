import { PlansTableComponent } from './plans-table.component';

describe('PlansTableComponent', () => {
  let comp: PlansTableComponent;

  beforeEach(() => {
    comp = new PlansTableComponent();
  });

  it('plans should initially be empty', () => {
    expect(comp.plans).toEqual([]);
  });
});
