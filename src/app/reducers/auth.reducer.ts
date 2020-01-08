import { createReducer, on } from '@ngrx/store';
import { AuthActions } from '../actions';
import { User } from '../types';

export interface AuthState {
  loginErrorMsg: string | null;
  user: User | null;
}

export const initialState: AuthState = {
  loginErrorMsg: null,
  user: null,
};

export const reducer = createReducer(
  initialState,
  on(AuthActions.login, state => ({
    ...state,
    loginErrorMsg: null,
    user: null,
  })),
  on(AuthActions.loginError, (state, action) => ({
    ...state,
    loginErrorMsg: action.errorMsg,
    user: null,
  })),
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    loginErrorMsg: null,
    user,
  })),
  on(AuthActions.logoutSuccess, state => ({
    ...state,
    user: null,
  })),
);
