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
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, tap } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { MaterialModule } from '../../material';
import { ActivityInstanceFormService } from '../../services';
import {
  ActivityInstance,
  ActivityType,
  UpdateActivityInstance,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-update-activity-instance-form',
  styles: [''],
  templateUrl: './update-activity-instance-form.component.html',
})
export class UpdateActivityInstanceFormComponent
  implements OnChanges, OnDestroy {
  @Input()
  activityInstance: ActivityInstance;

  @Input()
  activityTypes: ActivityType[] = [];

  @Output()
  delete: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  update: EventEmitter<UpdateActivityInstance> = new EventEmitter<
    UpdateActivityInstance
  >();

  form: FormGroup;
  inputListener: Subject<AbstractControl> = new Subject<AbstractControl>();

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    public formService: ActivityInstanceFormService,
  ) {
    this.subs.add(
      this.inputListener
        .pipe(
          // Assume form has error before validation so it does not flicker
          // from valid/invalid during the async validation request.
          tap(control => control.get('value').setErrors({ invalid: '' })),
          debounceTime(250),
        )
        .subscribe(this.validateParameterValue.bind(this)),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.activityInstance) {
      this.form = this.fb.group({
        parameters: this.fb.array([]),
        startTimestamp: [
          this.activityInstance.startTimestamp,
          Validators.required,
        ],
        type: [
          { value: this.activityInstance.type, disabled: true },
          Validators.required,
        ],
      });

      const { type } = this.activityInstance;
      const activityType = this.activityTypes.find(({ name }) => name === type);

      if (activityType) {
        const { parameters = [] } = activityType;
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
    const { parameters = [] } = activityInstance;
    const parameter = parameters.find(({ name }) => name === parameterName);
    return parameter ? parameter.value : '';
  }

  onDelete() {
    this.delete.emit(this.activityInstance.id);
  }

  onSubmit() {
    if (this.form && this.form.valid) {
      const activityInstance: UpdateActivityInstance = {
        ...this.form.value,
        id: this.activityInstance.id,
        parameters: this.formService.reduceParameters(
          this.form.value.parameters,
        ),
      };
      this.update.emit(activityInstance);
    }
  }

  async validateParameterValue(control: AbstractControl) {
    const { type } = this.activityInstance;
    const activityType = this.activityTypes.find(({ name }) => name === type);
    const { errors, success } = await this.formService.validateParameterValue(
      activityType,
      control.value,
    );
    if (success) {
      control.get('value').setErrors(null);
    } else {
      control.get('value').setErrors({ invalid: errors[0] });
    }
    this.cdRef.markForCheck();
  }
}

@NgModule({
  declarations: [UpdateActivityInstanceFormComponent],
  exports: [UpdateActivityInstanceFormComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class UpdateActivityInstanceFormModule {}
