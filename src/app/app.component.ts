import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { AuthActions, MerlinActions } from './actions';
import { AppState } from './app-store';
import { getLoading, getPath } from './selectors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  styleUrls: [`./app.component.css`],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  isLoginPage = true;
  loading = false;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private store: Store<AppState>,
  ) {
    this.subs.add(
      this.store.pipe(select(getLoading)).subscribe(loading => {
        this.loading = loading;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getPath)).subscribe(path => {
        this.isLoginPage = path === 'login';
        this.cdRef.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onAbout(): void {
    this.store.dispatch(MerlinActions.openAboutDialog());
  }

  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
