import { AuthActions } from '../actions';
import { User } from '../types';
import { AuthState, initialState, reducer } from './auth.reducer';

describe('auth reducer', () => {
  it('login', () => {
    const state: AuthState = reducer(
      { ...initialState },
      AuthActions.login({ password: '123456', username: 'testuser' }),
    );
    expect(state).toEqual({
      ...initialState,
    });
  });

  it('loginError', () => {
    const loginErrorMsg = 'Oops! There was a login error.';
    const state: AuthState = reducer(
      { ...initialState },
      AuthActions.loginError({ errorMsg: loginErrorMsg }),
    );
    expect(state).toEqual({
      ...initialState,
      loginErrorMsg,
    });
  });

  it('loginSuccess', () => {
    const user: User = { name: 'testuser ', ssoCookieValue: '42' };
    const state: AuthState = reducer(
      { ...initialState },
      AuthActions.loginSuccess({ redirectTo: '/', user }),
    );
    expect(state).toEqual({
      ...initialState,
      user,
    });
  });

  it('logoutSuccess', () => {
    const state: AuthState = reducer(
      { ...initialState },
      AuthActions.logoutSuccess(),
    );
    expect(state).toEqual({
      ...initialState,
    });
  });
});
