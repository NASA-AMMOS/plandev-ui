import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RootState } from '../app-store';
import { AuthState } from '../reducers/auth.reducer';

export const getAuthState = createFeatureSelector<RootState, AuthState>('auth');

export const getLoginErrorMsg = createSelector(
  getAuthState,
  (state: AuthState) => state.loginErrorMsg,
);

export const getUser = createSelector(
  getAuthState,
  (state: AuthState) => state.user,
);
