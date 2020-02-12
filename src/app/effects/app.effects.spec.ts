import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { AppActions } from '../actions';
import { AppEffects } from './app.effects';

describe('app effects', () => {
  let actions: Observable<Action>;
  let effects: AppEffects;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [AppEffects, provideMockActions(() => actions)],
    });
    actions = TestBed.inject(Actions);
    effects = TestBed.inject(AppEffects);
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('openAboutDialog', () => {
    it('opening the about dialog should not dispatch any actions', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = AppActions.openAboutDialog();
        actions = hot('-a', { a: action });
        expectObservable(effects.openAboutDialog).toBe('-');
      });
    });
  });

  describe('resize', () => {
    it('should not dispatch an action when calling resize, and the resize callback should be called', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        function callback(isCalled) {
          expect(isCalled).toEqual(true);
        }
        window.addEventListener('resize', () => callback(true));
        const action = AppActions.resize();
        actions = hot('-a', { a: action });
        expectObservable(effects.resize).toBe('-');
      });
    });
  });
});
