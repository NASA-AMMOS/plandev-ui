import { HttpClientModule } from '@angular/common/http';
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
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ToastrModule } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { AppActions, AuthActions } from './actions';
import { AppRoutingModule, RouterSerializer } from './app-routing.module';
import { metaReducers, RootState, ROOT_REDUCERS } from './app-store';
import { TooltipModule } from './components';
import { ContainersModule } from './containers';
import {
  AppEffects,
  AuthEffects,
  NavEffects,
  PlanningEffects,
  SimulationEffects,
  ToastEffects,
} from './effects';
import { MaterialModule } from './material';
import { getLoading, getPath } from './selectors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  styleUrls: [`./app.component.css`],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnDestroy {
  aerieApolloServerUrl = environment.aerieApolloServerUrl;
  isLoginPage = true;
  loading = false;
  vsCodeServerUrl = environment.vsCodeServerUrl;

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

@NgModule({
  bootstrap: [AppComponent],
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AngularSplitModule.forRoot(),
    ApolloModule,
    HttpLinkModule,
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
      SimulationEffects,
      ToastEffects,
    ]),
    MaterialModule,
    ContainersModule,
    TooltipModule,
  ],
  providers: [
    {
      deps: [HttpLink],
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink) => ({
        cache: new InMemoryCache(),
        link: httpLink.create({
          uri: environment.aerieApolloServerUrl,
        }),
      }),
    },
  ],
})
export class AppModule {}
