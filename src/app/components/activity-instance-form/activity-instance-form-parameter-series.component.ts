import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { ActivityInstanceFormParameter } from '../../types';
import { ActivityInstanceFormParameterBooleanModule } from './activity-instance-form-parameter-boolean.component';
import { ActivityInstanceFormParameterInputModule } from './activity-instance-form-parameter-input.component';
import { ActivityInstanceFormParameterNameModule } from './activity-instance-form-parameter-name.component';
import { ActivityInstanceFormParameterStructModule } from './activity-instance-form-parameter-struct.component';
import { ActivityInstanceFormParameterVariantModule } from './activity-instance-form-parameter-variant.component';
import { activityInstanceFormParameterStyles } from './shared-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-series',
  styles: [
    activityInstanceFormParameterStyles,
    `
      :host {
        display: block;
        padding-left: 0px;
        width: 100%;
      }

      mat-form-field {
        width: 50px;
      }

      mat-icon {
        color: rgba(0, 0, 0, 0.6);
      }

      ul {
        margin: 0;
        padding-inline-start: 20px;
      }

      li {
        list-style: none;
      }

      .series {
        cursor: pointer;
        display: flex;
        padding-right: 40px;
        width: 100%;
      }

      .series-left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }

      .series-right {
        align-items: center;
        justify-content: flex-end;
        padding-right: 10px;
      }
    `,
  ],
  template: `
    <div class="series">
      <div class="series-left" (click)="toggleExpanded()">
        <mat-icon *ngIf="expanded">expand_more</mat-icon>
        <mat-icon *ngIf="!expanded">chevron_right</mat-icon>
        <parameter-name [parameter]="parameter"></parameter-name>
      </div>
      <div class="series-right">
        <mat-form-field floatLabel="always">
          <mat-label>Indices</mat-label>
          <input
            matInput
            type="number"
            [value]="indices"
            (change)="onIndicesChange($event)"
          />
        </mat-form-field>
      </div>
    </div>

    <ul *ngIf="expanded">
      <li
        *ngFor="
          let subParameter of subParameters;
          trackBy: trackBySubParameters
        "
      >
        <parameter-boolean
          *ngIf="subParameter.schema.type === 'boolean'"
          [parameter]="subParameter"
        ></parameter-boolean>

        <parameter-input
          *ngIf="subParameter.schema.type === 'duration'"
          label="Duration"
          type="text"
          [parameter]="subParameter"
        ></parameter-input>

        <parameter-input
          *ngIf="subParameter.schema.type === 'int'"
          label="Integer"
          type="number"
          [parameter]="subParameter"
        ></parameter-input>

        <parameter-input
          *ngIf="subParameter.schema.type === 'real'"
          label="Real Number"
          type="number"
          [parameter]="subParameter"
        ></parameter-input>

        <parameter-series
          *ngIf="subParameter.schema.type === 'series'"
          [parameter]="subParameter"
        ></parameter-series>

        <parameter-input
          *ngIf="subParameter.schema.type === 'string'"
          label="String"
          type="text"
          [parameter]="subParameter"
        ></parameter-input>

        <parameter-struct
          *ngIf="subParameter.schema.type === 'struct'"
          [parameter]="subParameter"
        ></parameter-struct>

        <parameter-variant
          *ngIf="subParameter.schema.type === 'variant'"
          [parameter]="subParameter"
        ></parameter-variant>
      </li>
    </ul>
  `,
})
export class ActivityInstanceFormParameterSeriesComponent implements OnChanges {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;

  expanded = false;
  indices = 1;
  subParameters: ActivityInstanceFormParameter[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes.parameter) {
      this.updateSubParameters();
    }
  }

  onIndicesChange(event: Event) {
    const { valueAsNumber } = event.target as HTMLInputElement;
    this.indices = valueAsNumber;
    this.updateSubParameters();
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  trackBySubParameters(_: number, parameter: ActivityInstanceFormParameter) {
    return parameter.name;
  }

  updateSubParameters() {
    this.subParameters = [];
    for (let i = 0; i < this.indices; ++i) {
      const subParameter: ActivityInstanceFormParameter = {
        error: null,
        loading: false,
        name: `Index ${i + 1}`,
        schema: this.parameter.schema.items,
        value: null,
      };
      this.subParameters.push(subParameter);
    }
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParameterSeriesComponent],
  exports: [ActivityInstanceFormParameterSeriesComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterBooleanModule,
    ActivityInstanceFormParameterInputModule,
    ActivityInstanceFormParameterNameModule,
    ActivityInstanceFormParameterStructModule,
    ActivityInstanceFormParameterVariantModule,
  ],
})
export class ActivityInstanceFormParameterSeriesModule {}
