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
import { first } from 'rxjs/operators';
import { PanelHeaderModule } from '../../components';
import { MaterialModule } from '../../material';
import { ApiService } from '../../services';
import {
  ActivityInstance,
  ActivityInstanceForm,
  ActivityInstanceFormParameter,
  ActivityInstanceFormParameterChange,
  ActivityType,
  CreateActivityInstance,
  StringTMap,
  UpdateActivityInstance,
} from '../../types';
import { DecompositionTreeModule } from '../decomposition-tree/decomposition-tree.component';
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

  instance: ActivityInstanceForm;

  constructor(
    private apiService: ApiService,
    private cdRef: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.activityInstance) {
      this.instance = {
        id: this.activityInstance.id,
        isChild: this.activityInstance.parent !== null,
        parameters: this.getParameters(this.activityInstance.type),
        startTimestamp: this.activityInstance.startTimestamp,
        type: this.activityInstance.type,
        valid: false,
      };
    }

    if (changes.selectedActivityType && this.selectedActivityType) {
      const { name } = this.selectedActivityType;
      this.instance = {
        ...this.instance,
        parameters: this.getParameters(name),
        type: name,
      };
    }

    if (changes.type && this.type === 'create') {
      this.instance = {
        id: '',
        isChild: false,
        parameters: [],
        startTimestamp: '',
        type: '',
        valid: false,
      };
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
    const parameters = this.instance.parameters.map(({ name, value }) => ({
      name,
      value,
    }));

    if (this.type === 'create') {
      const activityInstance: CreateActivityInstance = {
        parameters,
        startTimestamp: this.instance.startTimestamp,
        type: this.instance.type,
      };
      this.create.emit(activityInstance);
    } else if (this.type === 'update') {
      const activityInstance: UpdateActivityInstance = {
        id: this.instance.id,
        parameters,
        startTimestamp: this.instance.startTimestamp,
        type: this.instance.type,
      };
      this.update.emit(activityInstance);
    }
  }

  setParameter(
    change: ActivityInstanceFormParameterChange,
    update: Partial<ActivityInstanceFormParameter>,
  ) {
    this.instance = {
      ...this.instance,
      parameters: this.instance.parameters.map(parameter => {
        if (parameter.name === change.parameter.name) {
          return {
            ...parameter,
            ...update,
            value: change.newValue,
          };
        }
        return parameter;
      }),
    };
  }

  async validateParameterValue(change: ActivityInstanceFormParameterChange) {
    const { newValue, parameter } = change;
    const activityType = this.activityTypes.find(
      ({ name }) => name === this.instance.type,
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
    ActivityInstanceFormParametersModule,
    DecompositionTreeModule,
    MaterialModule,
    PanelHeaderModule,
  ],
})
export class ActivityInstanceFormModule {}
