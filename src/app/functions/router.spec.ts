import { isRoute } from './router';

describe('router', () => {
  it('calling isRoute with a non-ROUTER_NAVIGATED action should return false', () => {
    const route = isRoute('/');
    const res = route({ type: 'SOME_ACTION' });
    expect(res).toBe(false);
  });
});
