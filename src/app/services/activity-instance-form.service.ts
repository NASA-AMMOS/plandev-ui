import { Injectable } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Store } from '@ngrx/store';
import { first } from 'rxjs/operators';
import { RootState } from '../app-store';
import {
  ActivityInstanceFormParameter,
  ActivityInstanceParameter,
  ActivityType,
} from '../types';
import { ApiService } from './api.service';

class ActivityInstanceFormStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || isSubmitted)
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ActivityInstanceFormService {
  matcher: ErrorStateMatcher;

  constructor(private apiService: ApiService, private store: Store<RootState>) {
    this.matcher = new ActivityInstanceFormStateMatcher();
  }

  getInvalidParameterValueError(formGroup: FormGroup) {
    const error = formGroup.controls.value.getError('invalid');
    return error;
  }

  reduceParameter(
    parameter: ActivityInstanceFormParameter,
  ): ActivityInstanceParameter {
    const { name, type, value } = parameter;

    if (type === 'double' || type === 'int') {
      const newValue = parseFloat(value) || value;
      return { name, value: newValue };
    } else if (type === 'bool') {
      const newValue =
        value === 'true' ? true : value === 'false' ? false : value;
      return { name, value: newValue };
    } else {
      return { name, value };
    }
  }

  reduceParameters(
    parameters: ActivityInstanceFormParameter[],
  ): ActivityInstanceParameter[] {
    return parameters
      .filter(p => p.value !== '')
      .map(p => this.reduceParameter(p));
  }

  async validateParameterValue(
    activityType: ActivityType,
    parameter: ActivityInstanceFormParameter,
  ) {
    const { planning } = await this.store.pipe(first()).toPromise();
    return await this.apiService
      .validateParameters(
        activityType.name,
        planning.selectedPlan.adaptationId,
        this.reduceParameters([parameter]),
      )
      .pipe(first())
      .toPromise();
  }
}
