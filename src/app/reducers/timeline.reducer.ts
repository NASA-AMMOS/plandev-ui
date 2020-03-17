import { createReducer, on } from '@ngrx/store';
import { TimelineActions } from '../actions';
import { TimeRange } from '../types';

export interface TimelineState {
  viewTimeRange: TimeRange;
}

export const initialState: TimelineState = {
  viewTimeRange: { start: 0, end: 0 },
};

export const reducer = createReducer(
  initialState,
  on(TimelineActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
);
