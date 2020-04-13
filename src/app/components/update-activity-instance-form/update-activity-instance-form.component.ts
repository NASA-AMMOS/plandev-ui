import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MaterialModule } from '../../material';
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
export class UpdateActivityInstanceFormComponent implements OnChanges {
  @Input()
  activityInstance: ActivityInstance;

  @Input()
  activityTypes: ActivityType[] = [];

  @Input()
  updateActivityInstanceError: string | null = null;

  @Output()
  delete: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  update: EventEmitter<UpdateActivityInstance> = new EventEmitter<
    UpdateActivityInstance
  >();

  form: FormGroup;

  constructor(private fb: FormBuilder) {}

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
        parameters.forEach(({ name }) => {
          const value = this.getParameterValue(this.activityInstance, name);
          this.formParameters.push(
            this.fb.group({
              name,
              value,
            }),
          );
        });
      }
    }
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
        parameters: this.form.value.parameters.filter(p => p.value !== ''),
      };
      this.update.emit(activityInstance);
    }
  }
}

@NgModule({
  declarations: [UpdateActivityInstanceFormComponent],
  exports: [UpdateActivityInstanceFormComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class UpdateActivityInstanceFormModule {}
