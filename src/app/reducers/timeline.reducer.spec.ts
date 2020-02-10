import { TimelineActions } from '../actions';
import { initialState, reducer, TimelineState } from './timeline.reducer';

describe('timeline reducer', () => {
  describe('updateMarginBottom', () => {
    it('it should set marginBottom', () => {
      const marginBottom = 42;
      const state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateMarginBottom({
          marginBottom,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginBottom,
      });
    });
  });

  describe('updateMarginLeft', () => {
    it('it should set marginLeft', () => {
      const marginLeft = 42;
      const state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateMarginLeft({
          marginLeft,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginLeft,
      });
    });
  });

  describe('updateMarginRight', () => {
    it('it should set marginRight', () => {
      const marginRight = 42;
      const state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateMarginRight({
          marginRight,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginRight,
      });
    });
  });

  describe('updateMarginTop', () => {
    it('it should set marginTop', () => {
      const marginTop = 42;
      const state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateMarginTop({
          marginTop,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginTop,
      });
    });
  });

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

  describe('zoomInViewTimeRange', () => {
    it('should properly zoom in the viewTimeRange', () => {
      let state: TimelineState = reducer(
        { ...initialState },
        TimelineActions.updateViewTimeRange({
          viewTimeRange: { start: 10, end: 110 },
        }),
      );
      state = reducer(state, TimelineActions.zoomInViewTimeRange());
      expect(state).toEqual({
        ...initialState,
        viewTimeRange: {
          end: 100,
          start: 20,
        },
      });
    });
  });
});
