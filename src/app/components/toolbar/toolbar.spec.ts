import { ToolbarComponent } from './toolbar.component';

describe('ToolbarComponent', () => {
  let comp: ToolbarComponent;

  beforeEach(() => {
    comp = new ToolbarComponent();
  });

  it('component should be defined', () => {
    expect(comp).toBeDefined();
  });
});
