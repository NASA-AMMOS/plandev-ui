import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Subject } from 'rxjs';
import { debounceTime, first, tap } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { PanelHeaderModule } from '../../components';
import { doyTimestampValidator } from '../../functions';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import { ApiService } from '../../services';
import {
  ActivityInstance,
  ActivityInstanceFormParameter,
  ActivityInstanceParameter,
  ActivityType,
  CreateActivityInstance,
  StringTMap,
  UpdateActivityInstance,
} from '../../types';
import { DecompositionTreeModule } from '../decomposition-tree/decomposition-tree.component';

export class ActivityInstanceFormStateMatcher implements ErrorStateMatcher {
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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'activity-instance-form',
  styleUrls: ['./activity-instance-form.component.css'],
  templateUrl: './activity-instance-form.component.html',
})
export class ActivityInstanceFormComponent implements OnChanges, OnDestroy {
  @Input()
  activityInstance: ActivityInstance | undefined;

  @Input()
  activityInstancesMap: StringTMap<ActivityInstance> | null;

  @Input()
  activityTypes: ActivityType[] = [];

  @Input()
  adaptationId: string;

  @Input()
  parametersExpanded = false;

  @Input()
  selectedActivityType: ActivityType | null = null;

  @Input()
  type: 'create' | 'update' = 'create';

  @Output()
  cancel: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  create: EventEmitter<CreateActivityInstance> = new EventEmitter<CreateActivityInstance>();

  @Output()
  delete: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  update: EventEmitter<UpdateActivityInstance> = new EventEmitter<UpdateActivityInstance>();

  errorStateMatcher: ErrorStateMatcher = new ActivityInstanceFormStateMatcher();
  form: FormGroup;
  inputListener: Subject<AbstractControl> = new Subject<AbstractControl>();

  private subs = new SubSink();

  constructor(
    private apiService: ApiService,
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
    this.subs.add(
      this.inputListener
        .pipe(
          // Assume form has error before validation so it does not flicker
          // from valid/invalid during the async validation request.
          tap(control =>
            control.get('value').setErrors({ invalid: '', loading: true }),
          ),
          debounceTime(250),
        )
        .subscribe(this.validateParameterValue.bind(this)),
    );

    if (this.type === 'create') {
      this.form = this.fb.group({
        parameters: this.fb.array([]),
        startTimestamp: ['', [Validators.required, doyTimestampValidator]],
        type: ['', Validators.required],
      });

      this.subs.add(
        this.form.controls.type.valueChanges.subscribe(type => {
          const activityType = this.activityTypes.find(
            ({ name }) => name === type,
          );
          if (activityType) {
            const { parameters } = activityType;
            this.formParameters.clear();
            parameters.forEach(parameter => {
              this.formParameters.push(
                this.fb.group({
                  name: parameter.name,
                  type: parameter.schema.type,
                  value: parameter.default,
                }),
              );
            });
          }
        }),
      );
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.type === 'update' && changes.activityInstance) {
      this.form = this.fb.group({
        parameters: this.fb.array([]),
        startTimestamp: [
          {
            disabled: this.isNotParent,
            value: this.activityInstance.startTimestamp,
          },
          [Validators.required, doyTimestampValidator],
        ],
        type: [
          { disabled: true, value: this.activityInstance.type },
          Validators.required,
        ],
      });

      const { type } = this.activityInstance;
      const activityType = this.activityTypes.find(({ name }) => name === type);
      if (activityType) {
        const { parameters } = activityType;
        this.formParameters.clear();
        parameters.forEach(({ name, schema }) => {
          const value = this.getParameterValue(this.activityInstance, name);
          this.formParameters.push(
            this.fb.group({
              name,
              type: schema.type,
              value,
            }),
          );
        });
      }
    }

    if (changes.selectedActivityType && this.selectedActivityType !== null) {
      this.form.controls.type.setValue(this.selectedActivityType.name);
    }
  }

  get isNotParent() {
    if (this.type === 'update' && this.activityInstance) {
      return this.activityInstance.parent !== null;
    }
    return false;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get formParameters() {
    return this.form.get('parameters') as FormArray;
  }

  getParameterValue(
    activityInstance: ActivityInstance,
    parameterName: string,
  ): string {
    const { parameters } = activityInstance;
    const parameter = parameters.find(({ name }) => name === parameterName);
    return parameter ? parameter.value : '';
  }

  onSubmit() {
    if (this.form && this.form.valid) {
      if (this.type === 'create') {
        const activityInstance: CreateActivityInstance = {
          ...this.form.value,
          parameters: this.reduceParameters(this.form.value.parameters),
        };
        this.create.emit(activityInstance);
      } else if (this.type === 'update') {
        const activityInstance: UpdateActivityInstance = {
          ...this.form.value,
          id: this.activityInstance.id,
          parameters: this.reduceParameters(this.form.value.parameters),
        };
        this.update.emit(activityInstance);
      }
    }
  }

  reduceParameter(
    parameter: ActivityInstanceFormParameter,
  ): ActivityInstanceParameter {
    const { name, type, value } = parameter;
    if (type === 'real' || type === 'int') {
      const newValue = parseFloat(value) || value;
      return { name, value: newValue };
    } else if (type === 'boolean') {
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

  async validateParameterValue(control: AbstractControl) {
    const { value: type } = this.form.controls.type;
    const activityType = this.activityTypes.find(({ name }) => name === type);
    const { errors, success } = await this.apiService
      .validateParameters(
        activityType.name,
        this.adaptationId,
        this.reduceParameters([control.value]),
      )
      .pipe(first())
      .toPromise();
    if (success) {
      control.get('value').setErrors(null);
    } else {
      control.get('value').setErrors({ invalid: errors[0], loading: false });
    }
    this.cdRef.markForCheck();
  }
}

@NgModule({
  declarations: [ActivityInstanceFormComponent],
  exports: [ActivityInstanceFormComponent],
  imports: [
    CommonModule,
    MaterialModule,
    DecompositionTreeModule,
    PanelHeaderModule,
    PipesModule,
    ReactiveFormsModule,
  ],
})
export class ActivityInstanceFormModule {}
