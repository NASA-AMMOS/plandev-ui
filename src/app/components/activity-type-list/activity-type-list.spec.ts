import { ngOnChanges } from 'src/app/functions';
import { cActivityType } from 'src/app/mocks';
import { CActivityType } from 'src/app/types';
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
    ngOnChanges(comp, 'activityTypes', [cActivityType]);
    expect(filterActivityTypesSpy).toHaveBeenCalledTimes(1);
  });

  it('filtering activity types should work correctly', () => {
    comp.activityTypes = [cActivityType];

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
    const selectedActivityType = { ...cActivityType };
    comp.selectActivityType.subscribe((activityType: CActivityType) =>
      expect(activityType).toEqual(selectedActivityType),
    );
    comp.onActivityTypeSelect(selectedActivityType);
  });
});
