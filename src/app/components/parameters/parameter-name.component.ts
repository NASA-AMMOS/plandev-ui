import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { FormParameter } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-name',
  styles: [
    `
      :host {
        align-items: center;
        display: flex;
      }

      div {
        color: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        font-size: 14px;
        font-style: normal;
        font-weight: 500;
        letter-spacing: 0.1px;
        line-height: 24px;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ],
  template: `
    <div [matTooltip]="parameter?.name" matTooltipPosition="above">
      {{ parameter?.name }}
    </div>
  `,
})
export class ParameterNameComponent {
  @Input() parameter: FormParameter | undefined;
}

@NgModule({
  declarations: [ParameterNameComponent],
  exports: [ParameterNameComponent],
  imports: [CommonModule, MaterialModule],
})
export class ParameterNameModule {}
