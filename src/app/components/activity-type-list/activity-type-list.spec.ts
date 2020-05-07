import { ngOnChanges } from '../../functions';
import { activityType, activityTypes } from '../../mocks';
import { ActivityType } from '../../types';
import { ActivityTypeListComponent } from './activity-type-list.component';

describe('ActivityTypeListComponent', () => {
  let comp;

  beforeEach(() => {
    comp = new ActivityTypeListComponent();
  });

  it('initial component state', () => {
    expect(comp.activityTypes).toEqual([]);
    expect(comp.filteredActivityTypes).toEqual([]);
    expect(comp.searchText).toBe('');
  });

  it('setting a activity types via component Input', () => {
    const filterActivityTypesSpy = spyOn(comp, 'filterActivityTypes');
    ngOnChanges(comp, 'activityTypes', activityTypes);
    expect(filterActivityTypesSpy).toHaveBeenCalledTimes(1);
  });

  it('filtering activity types should work correctly', () => {
    comp.activityTypes = activityTypes;

    let searchText = 'peel';
    comp.filterActivityTypes(searchText);
    expect(comp.filteredActivityTypes).toEqual(comp.activityTypes);
    expect(comp.searchText).toEqual(searchText);

    searchText = 'z';
    comp.filterActivityTypes(searchText);
    expect(comp.filteredActivityTypes).toEqual([]);
    expect(comp.searchText).toEqual(searchText);
  });

  it('selecting an activity type via callback', () => {
    const selectedActivityType = { ...activityType };
    comp.selectActivityType.subscribe((activity: ActivityType) =>
      expect(activity).toEqual(selectedActivityType),
    );
    comp.onActivityTypeSelect(selectedActivityType);
  });

  it('calling onDragStart should properly set the drag data activityType', () => {
    const event = {
      dataTransfer: {
        setDragImage() {},
        setData(_type: string, _data: string) {},
      },
    };
    const setDataSpy = spyOn(event.dataTransfer, 'setData');
    comp.onDragStart(event, activityType);
    expect(setDataSpy).toHaveBeenCalledTimes(1);
  });

  it('calling ngOnChanges for an unknown component property should not do anything', () => {
    ngOnChanges(comp, 'foo', {});
    expect(comp).toBeDefined();
  });
});
