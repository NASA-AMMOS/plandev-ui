import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgModule,
  OnDestroy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { AuthActions } from '../../actions';
import { RootState } from '../../app-store';
import { MaterialModule } from '../../material';
import { getLoginErrorMsg } from '../../selectors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  styleUrls: ['./login.component.css'],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnDestroy {
  hide = true;
  loginErrorMsg: string | null;
  loginForm: FormGroup;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    private store: Store<RootState>,
  ) {
    this.loginForm = this.fb.group({
      password: ['', Validators.required],
      username: ['', Validators.required],
    });

    this.subs.add(
      this.store.pipe(select(getLoginErrorMsg)).subscribe(loginErrorMsg => {
        this.loginErrorMsg = loginErrorMsg;
        this.cdRef.markForCheck();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  login() {
    if (this.loginForm.valid) {
      const { username, password } = this.loginForm.value;
      this.store.dispatch(AuthActions.login({ password, username }));
    }
  }
}

@NgModule({
  declarations: [LoginComponent],
  exports: [LoginComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class LoginModule {}
