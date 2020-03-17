import { TimelineActions } from '../actions';
import { initialState, reducer, TimelineState } from './timeline.reducer';

describe('timeline reducer', () => {
  describe('updateViewTimeRange', () => {
    it('it should update the view time range', () => {
      const viewTimeRange = { start: 217, end: 314 };
      const state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateViewTimeRange({
          viewTimeRange,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        viewTimeRange,
      });
    });
  });
});
