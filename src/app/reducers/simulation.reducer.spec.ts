import { SimulationActions } from '../actions';
import { initialState, reducer, SimulationState } from './simulation.reducer';

describe('simulation reducer', () => {
  it('run', () => {
    const state: SimulationState = reducer(
      { ...initialState },
      SimulationActions.run({ planId: '42' }),
    );
    expect(state).toEqual({
      ...initialState,
      running: true,
    });
  });

  it('runFailure', () => {
    const state: SimulationState = reducer(
      { ...initialState },
      SimulationActions.runFailure({ errorMsg: 'Simulation failed' }),
    );
    expect(state).toEqual({
      ...initialState,
      running: false,
      stateBands: null,
    });
  });

  it('runSuccess', () => {
    const state: SimulationState = reducer(
      { ...initialState },
      SimulationActions.runSuccess({ results: [] }),
    );
    expect(state).toEqual({
      ...initialState,
      running: false,
      stateBands: {},
    });
  });
});
