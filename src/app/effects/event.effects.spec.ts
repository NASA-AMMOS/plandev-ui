import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { EventActions } from '../actions';
import { EventEffects } from './event.effects';

describe('event effects', () => {
  let actions: Observable<Action>;
  let effects: EventEffects;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventEffects, provideMockActions(() => actions)],
    });
    actions = TestBed.inject(Actions);
    effects = TestBed.inject(EventEffects);
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('resize', () => {
    it('should not dispatch an action when calling resize, and the resize callback should be called', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        function callback(isCalled) {
          expect(isCalled).toEqual(true);
        }
        window.addEventListener('resize', () => callback(true));
        const action = EventActions.resize();
        actions = hot('-a', { a: action });
        expectObservable(effects.resize).toBe('-');
      });
    });
  });
});
