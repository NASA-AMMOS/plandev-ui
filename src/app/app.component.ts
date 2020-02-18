import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { AppActions, AuthActions } from './actions';
import { RootState } from './app-store';
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
  vsCodeServerUrl = environment.vsCodeServerUrl;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private store: Store<RootState>,
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
    this.store.dispatch(AppActions.openAboutDialog());
  }

  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
