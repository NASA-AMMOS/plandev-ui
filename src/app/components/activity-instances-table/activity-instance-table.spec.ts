import { ngOnChanges } from 'src/app/functions';
import { cActivityInstance } from 'src/app/mocks';
import { CActivityInstance } from 'src/app/types';
import { ActivityInstancesTableComponent } from './activity-instances-table.component';

describe('ActivityInstancesTableComponent', () => {
  let comp;

  beforeEach(() => {
    comp = new ActivityInstancesTableComponent();
  });

  it('initial component state', () => {
    expect(comp.activityInstances).toEqual([]);
    expect(comp.selectedActivityInstance).toBe(null);
    const isSelected = comp.selection.isSelected(comp.selectedActivityInstance);
    expect(isSelected).toBe(false);
  });

  it('setting a selected activity instance via component Input', () => {
    ngOnChanges(comp, 'selectedActivityInstance', { ...cActivityInstance });
    expect(comp.selectedActivityInstance).toEqual(cActivityInstance);
    const isSelected = comp.selection.isSelected(comp.selectedActivityInstance);
    expect(isSelected).toBe(true);
  });

  it('selecting an activity instance via callback', () => {
    const selectedActivityInstance = { ...cActivityInstance };
    comp.selectActivityInstance.subscribe(
      (activityInstance: CActivityInstance) =>
        expect(activityInstance).toEqual(selectedActivityInstance),
    );
    comp.onSelectActivityInstance(selectedActivityInstance);
    const isSelected = comp.selection.isSelected(selectedActivityInstance);
    expect(isSelected).toBe(true);
  });
});
