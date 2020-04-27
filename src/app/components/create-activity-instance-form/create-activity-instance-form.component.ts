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
import { ActivityType, CreateActivityInstance } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-create-activity-instance-form',
  templateUrl: './create-activity-instance-form.component.html',
})
export class CreateActivityInstanceFormComponent
  implements OnChanges, OnDestroy {
  @Input()
  activityTypes: ActivityType[] = [];

  @Input()
  selectedActivityType: ActivityType | null = null;

  @Output()
  back: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  create: EventEmitter<CreateActivityInstance> = new EventEmitter<
    CreateActivityInstance
  >();

  form: FormGroup;
  inputListener: Subject<AbstractControl> = new Subject<AbstractControl>();

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    public formService: ActivityInstanceFormService,
  ) {
    this.form = this.fb.group({
      parameters: this.fb.array([]),
      startTimestamp: ['', Validators.required],
      type: ['', Validators.required],
    });

    this.subs.add(
      this.form.controls.type.valueChanges.subscribe(type => {
        const activityType = this.activityTypes.find(
          ({ name }) => name === type,
        );
        if (activityType) {
          const { parameters = [] } = activityType;
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
    if (changes.selectedActivityType && this.selectedActivityType !== null) {
      this.form.controls.type.setValue(this.selectedActivityType.name);
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  get formParameters() {
    return this.form.get('parameters') as FormArray;
  }

  onSubmit() {
    if (this.form.valid) {
      const activityInstance: CreateActivityInstance = {
        ...this.form.value,
        parameters: this.formService.reduceParameters(
          this.form.value.parameters,
        ),
      };
      this.create.emit(activityInstance);
    }
  }

  async validateParameterValue(control: AbstractControl) {
    const { value: type } = this.form.controls.type;
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
  declarations: [CreateActivityInstanceFormComponent],
  exports: [CreateActivityInstanceFormComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class CreateActivityInstanceFormModule {}
