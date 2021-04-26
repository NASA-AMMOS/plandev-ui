import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgModule,
  OnDestroy,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EffectsModule } from '@ngrx/effects';
import { StoreRouterConnectingModule } from '@ngrx/router-store';
import { select, Store, StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { AngularSplitModule } from 'angular-split';
import { ToastrModule } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { AppActions, AuthActions } from './actions';
import { AppRoutingModule, RouterSerializer } from './app-routing.module';
import { metaReducers, RootState, ROOT_REDUCERS } from './app-store';
import { AERIE_USER } from './constants';
import { ContainersModule } from './containers';
import {
  AppEffects,
  AuthEffects,
  NavEffects,
  PlanningEffects,
  ToastEffects,
} from './effects';
import { UnauthorizedInterceptor } from './interceptors';
import { MaterialModule } from './material';
import { getLoading, getPath } from './selectors';
import { User } from './types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  styleUrls: [`./app.component.css`],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  aerieApolloServerUrl = environment.aerieApolloServerUrl;
  aerieUiServerUrl = environment.aerieUiServerUrl;
  isLoginPage = true;
  loading = false;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry,
    private store: Store<RootState>,
  ) {
    this.addSvgIcons();
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

  addSvgIcons() {
    this.matIconRegistry.addSvgIcon(
      'activity_dictionary',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/icons/activity_dictionary.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      'graphql',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/icons/graphql.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      'integration_instructions',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'assets/icons/integration_instructions.svg',
      ),
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

  onOpenEditor(): void {
    const user: User = JSON.parse(localStorage.getItem(AERIE_USER));
    open(
      `${this.aerieUiServerUrl}/editor?ssoToken=${user.ssoToken}`,
      '_newtab',
    );
  }
}

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularSplitModule,
    ToastrModule.forRoot({
      countDuplicates: true,
      maxOpened: 4,
      preventDuplicates: true,
      resetTimeoutOnDuplicate: true,
    }),
    StoreModule.forRoot(ROOT_REDUCERS, {
      metaReducers,
      runtimeChecks: {
        strictActionImmutability: true,
        strictActionSerializability: false,
        strictStateImmutability: true,
        strictStateSerializability: true,
      },
    }),
    StoreRouterConnectingModule.forRoot({
      serializer: RouterSerializer,
    }),
    StoreDevtoolsModule.instrument({
      name: 'aerie-ui',
    }),
    EffectsModule.forRoot([
      AppEffects,
      AuthEffects,
      NavEffects,
      PlanningEffects,
      ToastEffects,
    ]),
    MaterialModule,
    ContainersModule,
  ],
  providers: [
    {
      multi: true,
      provide: HTTP_INTERCEPTORS,
      useClass: UnauthorizedInterceptor,
    },
  ],
})
export class AppModule {}
