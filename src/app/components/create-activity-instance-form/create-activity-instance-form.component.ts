import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SubSink } from 'subsink';
import { MaterialModule } from '../../material';
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
  createActivityInstanceError: string | null = null;

  @Input()
  selectedActivityType: ActivityType | null = null;

  @Output()
  back: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  create: EventEmitter<CreateActivityInstance> = new EventEmitter<
    CreateActivityInstance
  >();

  form: FormGroup;

  private subs = new SubSink();

  constructor(private fb: FormBuilder) {
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
                value: parameter.default,
              }),
            );
          });
        }
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedActivityType && this.selectedActivityType !== null) {
      this.createActivityInstanceError = null;
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
      };
      this.create.emit(activityInstance);
    }
  }
}

@NgModule({
  declarations: [CreateActivityInstanceFormComponent],
  exports: [CreateActivityInstanceFormComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class CreateActivityInstanceFormModule {}
