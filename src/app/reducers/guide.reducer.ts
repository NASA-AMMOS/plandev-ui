import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { GuideActions } from '../actions';
import { Guide } from '../types';

export const guideAdapter = createEntityAdapter<Guide>();
export interface GuideState extends EntityState<Guide> {}
const initialState: GuideState = guideAdapter.getInitialState();

export const reducer = createReducer(
  initialState,
  on(GuideActions.addOne, (state, { guide }) =>
    guideAdapter.addOne(guide, state),
  ),
  on(GuideActions.removeOne, (state, { id }) =>
    guideAdapter.removeOne(id, state),
  ),
  on(GuideActions.updateOne, (state, action) =>
    guideAdapter.updateOne({ id: action.id, changes: action.changes }, state),
  ),
);
