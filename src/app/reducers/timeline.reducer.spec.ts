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
});
