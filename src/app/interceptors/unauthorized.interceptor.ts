import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthActions } from '../actions';
import { RootState } from '../app-store';

@Injectable()
export class UnauthorizedInterceptor implements HttpInterceptor {
  constructor(private store: Store<RootState>) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap(
        (_event: HttpEvent<any>) => {},
        (err: any) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401) {
              this.store.dispatch(AuthActions.logout());
            }
          }
        },
      ),
    );
  }
}
