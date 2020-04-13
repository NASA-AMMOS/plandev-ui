import { ngOnChanges } from 'src/app/functions';
import { activityInstance } from '../../mocks';
import { ActivityInstance } from '../../types';
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
    ngOnChanges(comp, 'selectedActivityInstance', { ...activityInstance });
    expect(comp.selectedActivityInstance).toEqual(activityInstance);
    const isSelected = comp.selection.isSelected(comp.selectedActivityInstance);
    expect(isSelected).toBe(true);
  });

  it('selecting an activity instance via callback', () => {
    const selectedActivityInstance = { ...activityInstance };
    comp.selectActivityInstance.subscribe((instance: ActivityInstance) =>
      expect(instance).toEqual(selectedActivityInstance),
    );
    comp.onSelectActivityInstance(selectedActivityInstance);
    const isSelected = comp.selection.isSelected(selectedActivityInstance);
    expect(isSelected).toBe(true);
  });

  it('calling ngOnChanges for an unknown component property should not do anything', () => {
    ngOnChanges(comp, 'foo', {});
    expect(comp).toBeDefined();
  });
});
