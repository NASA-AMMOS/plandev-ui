import { ngOnChanges } from 'src/app/functions';
import { activityInstance } from '../../mocks';
import { DataTableComponent } from './data-table.component';

describe('DataTableComponent', () => {
  let comp;

  beforeEach(() => {
    comp = new DataTableComponent();
  });

  it('initial component state', () => {
    expect(comp.data).toEqual([]);
    expect(comp.selectedElement).toBe(null);
    const isSelected = comp.selection.isSelected(comp.selectElement);
    expect(isSelected).toBe(false);
  });

  it('setting a selected element via component Input', () => {
    ngOnChanges(comp, 'selectedElement', { ...activityInstance });
    expect(comp.selectedElement).toEqual(activityInstance);
    const isSelected = comp.selection.isSelected(comp.selectedElement);
    expect(isSelected).toBe(true);
  });

  it('selecting an element via callback', () => {
    const selectedElement = { ...activityInstance };
    comp.selectElement.subscribe((element: any) =>
      expect(element).toEqual(selectedElement),
    );
    comp.onSelectElement(selectedElement);
    const isSelected = comp.selection.isSelected(selectedElement);
    expect(isSelected).toBe(true);
  });

  it('calling ngOnChanges for an unknown component property should not do anything', () => {
    ngOnChanges(comp, 'foo', {});
    expect(comp).toBeDefined();
  });
});
