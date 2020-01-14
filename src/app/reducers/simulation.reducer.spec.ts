import { SimulationActions } from '../actions';
import { initialState, reducer, SimulationState } from './simulation.reducer';

describe('simulation reducer', () => {
  it('clear', () => {
    const state: SimulationState = reducer(
      { ...initialState },
      SimulationActions.clear(),
    );
    expect(state).toEqual({
      ...initialState,
    });
  });

  it('runSuccess', () => {
    const state: SimulationState = reducer(
      { ...initialState },
      SimulationActions.runSuccess({ stateBands: {} }),
    );
    expect(state).toEqual({
      ...initialState,
      stateBands: {},
    });
  });
});
