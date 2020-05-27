import { createFeatureSelector, createSelector } from '@ngrx/store';
import { guideAdapter, GuideState } from '../reducers/guide.reducer';
import { Guide } from '../types';

export const getGuideState = createFeatureSelector<GuideState>('guide');

const { selectAll } = guideAdapter.getSelectors();

export const getGuides = createSelector(getGuideState, (state: GuideState) =>
  selectAll(state),
);

export const getVerticalGuides = createSelector(getGuides, (guides: Guide[]) =>
  guides.filter(guide => guide.type === 'vertical'),
);
