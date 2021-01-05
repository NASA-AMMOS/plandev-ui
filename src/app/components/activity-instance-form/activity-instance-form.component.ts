import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { first } from 'rxjs/operators';
import { DecompositionTreeModule } from '../../containers/decomposition-tree/decomposition-tree.component';
import { doyTimestampValidator } from '../../functions';
import { MaterialModule } from '../../material';
import { ApiService } from '../../services';
import {
  ActivityInstance,
  ActivityInstanceFormParameter,
  ActivityInstanceFormParameterChange,
  ActivityType,
  CreateActivityInstance,
  StringTMap,
  UpdateActivityInstance,
} from '../../types';
import { PanelHeaderModule } from '../panel-header/panel-header.component';
import { ActivityInstanceFormParametersModule } from './activity-instance-form-parameters.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'activity-instance-form',
  styleUrls: ['./activity-instance-form.component.css'],
  templateUrl: './activity-instance-form.component.html',
})
export class ActivityInstanceFormComponent implements OnChanges {
  @Input()
  activityInstance: ActivityInstance | undefined;

  @Input()
  activityInstancesMap: StringTMap<ActivityInstance> | null;

  @Input()
  activityTypes: ActivityType[] = [];

  @Input()
  adaptationId: string;

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

  isChild: boolean;
  parameters: ActivityInstanceFormParameter[];
  valid: boolean;

  idControl: FormControl;
  startTimestampControl: FormControl;
  typeControl: FormControl;

  constructor(
    private apiService: ApiService,
    private cdRef: ChangeDetectorRef,
  ) {
    this.idControl = new FormControl(
      { disabled: true, value: '' },
      Validators.required,
    );
    this.startTimestampControl = new FormControl('', [
      Validators.required,
      doyTimestampValidator,
    ]);
    this.typeControl = new FormControl('', Validators.required);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.activityInstance) {
      this.isChild = this.activityInstance.parent !== null;
      this.parameters = this.getParameters(this.activityInstance.type);
      this.valid = false;

      this.idControl.setValue(this.activityInstance.id);
      this.startTimestampControl.setValue(this.activityInstance.startTimestamp);
      if (this.isChild) {
        this.startTimestampControl.disable();
      }
      this.typeControl.setValue(this.activityInstance.type);
      this.typeControl.disable();
    }

    if (changes.selectedActivityType && this.selectedActivityType) {
      const { name } = this.selectedActivityType;
      this.parameters = this.getParameters(name);
      this.typeControl.setValue(name);
    }

    if (changes.type && this.type === 'create') {
      this.idControl.setValue('');
      this.startTimestampControl.setValue('');
      this.typeControl.setValue('');
    }
  }

  /**
   * Return a list of parameters for a given activity type.
   * If there is a corresponding activity instance parameter available, then use it's value.
   * Otherwise use the activity type default value, or a null value.
   */
  getParameters(activityTypeName: string): ActivityInstanceFormParameter[] {
    const activityType = this.activityTypes.find(
      ({ name }) => name === activityTypeName,
    );

    const parameters = activityType.parameters.map(activityTypeParameter => {
      let value = activityTypeParameter?.default || null;

      if (this.activityInstance) {
        const activityInstanceParameter = this.activityInstance.parameters.find(
          instanceParameter =>
            instanceParameter.name === activityTypeParameter.name,
        );
        value = activityInstanceParameter?.value || value;
      }

      const parameter: ActivityInstanceFormParameter = {
        error: null,
        loading: false,
        name: activityTypeParameter.name,
        schema: activityTypeParameter.schema,
        type: activityTypeParameter.schema.type,
        value,
      };

      return parameter;
    });

    return parameters;
  }

  async onParameterChange(change: ActivityInstanceFormParameterChange) {
    await this.validateParameterValue(change);
  }

  onCreateOrUpdate() {
    const parameters = this.parameters.map(({ name, value }) => ({
      name,
      value,
    }));

    if (this.type === 'create') {
      const activityInstance: CreateActivityInstance = {
        parameters,
        startTimestamp: this.startTimestampControl.value,
        type: this.typeControl.value,
      };
      this.create.emit(activityInstance);
    } else if (this.type === 'update') {
      const activityInstance: UpdateActivityInstance = {
        id: this.idControl.value,
        parameters,
        startTimestamp: this.startTimestampControl.value,
        type: this.typeControl.value,
      };
      this.update.emit(activityInstance);
    }
  }

  setParameter(
    change: ActivityInstanceFormParameterChange,
    update: Partial<ActivityInstanceFormParameter>,
  ) {
    this.parameters = this.parameters.map(parameter => {
      if (parameter.name === change.parameter.name) {
        return {
          ...parameter,
          ...update,
          value: change.newValue,
        };
      }
      return parameter;
    });
  }

  async validateParameterValue(change: ActivityInstanceFormParameterChange) {
    const { newValue, parameter } = change;
    const activityType = this.activityTypes.find(
      ({ name }) => name === this.typeControl.value,
    );
    this.setParameter(change, { error: null, loading: true });
    const { errors, success } = await this.apiService
      .validateParameters(activityType.name, this.adaptationId, [
        { name: parameter.name, value: newValue },
      ])
      .pipe(first())
      .toPromise();
    if (success) {
      this.setParameter(change, { error: null, loading: false });
    } else {
      const [error] = errors;
      this.setParameter(change, { error, loading: false });
    }
    this.cdRef.markForCheck();
  }
}

@NgModule({
  declarations: [ActivityInstanceFormComponent],
  exports: [ActivityInstanceFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ReactiveFormsModule,
    ActivityInstanceFormParametersModule,
    DecompositionTreeModule,
    PanelHeaderModule,
  ],
})
export class ActivityInstanceFormModule {}
