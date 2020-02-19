import { createReducer, on } from '@ngrx/store';
import { TimelineActions } from '../actions';
import { changeZoom } from '../functions';
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
  on(TimelineActions.zoomInViewTimeRange, state => ({
    ...state,
    viewTimeRange: changeZoom(state.viewTimeRange, 10),
  })),
);
