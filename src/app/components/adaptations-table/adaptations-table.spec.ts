import { AdaptationsTableComponent } from './adaptations-table.component';

describe('AdaptationsTableComponent', () => {
  let comp: AdaptationsTableComponent;

  beforeEach(() => {
    comp = new AdaptationsTableComponent();
  });

  it('adaptations should initially be empty', () => {
    expect(comp.adaptations).toEqual([]);
  });
});
