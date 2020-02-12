import { AppActions } from '../actions';
import { AppState, initialState, reducer } from './app.reducer';

describe('app reducer', () => {
  describe('setLoading', () => {
    it('should set loading', () => {
      const loading = true;
      const state: AppState = reducer(
        { ...initialState },
        AppActions.setLoading({ loading }),
      );
      expect(state).toEqual({
        ...initialState,
        loading,
      });
    });
  });
});
