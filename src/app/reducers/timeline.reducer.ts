import { createReducer, on } from '@ngrx/store';
import { TimelineActions } from '../actions';
import { changeZoom } from '../functions';
import { TimeRange } from '../types';

export interface TimelineState {
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  viewTimeRange: TimeRange;
}

export const initialState: TimelineState = {
  marginBottom: 10,
  marginLeft: 70,
  marginRight: 70,
  marginTop: 10,
  viewTimeRange: { start: 0, end: 0 },
};

export const reducer = createReducer(
  initialState,
  on(TimelineActions.updateMarginBottom, (state, { marginBottom }) => ({
    ...state,
    marginBottom,
  })),
  on(TimelineActions.updateMarginLeft, (state, { marginLeft }) => ({
    ...state,
    marginLeft,
  })),
  on(TimelineActions.updateMarginRight, (state, { marginRight }) => ({
    ...state,
    marginRight,
  })),
  on(TimelineActions.updateMarginTop, (state, { marginTop }) => ({
    ...state,
    marginTop,
  })),
  on(TimelineActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
  on(TimelineActions.zoomInViewTimeRange, state => ({
    ...state,
    viewTimeRange: changeZoom(state.viewTimeRange, 10),
  })),
);
