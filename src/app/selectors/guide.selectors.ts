import { createFeatureSelector, createSelector } from '@ngrx/store';
import { guideAdapter, GuideState } from '../reducers/guide.reducer';

export const getGuideState = createFeatureSelector<GuideState>('guide');

const { selectAll } = guideAdapter.getSelectors();

export const getGuides = createSelector(getGuideState, (state: GuideState) =>
  selectAll(state),
);
