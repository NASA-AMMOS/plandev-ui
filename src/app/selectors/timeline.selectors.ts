import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TimelineState } from '../reducers/timeline.reducer';
import { TimeRange } from '../types';

export const getTimelineState = createFeatureSelector<TimelineState>(
  'timeline',
);

export const getViewTimeRange = createSelector(
  getTimelineState,
  (state: TimelineState): TimeRange => state.viewTimeRange,
);
