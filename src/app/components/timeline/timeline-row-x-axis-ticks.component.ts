import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { ScaleTime } from 'd3-scale';
import { XAxisTick } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-x-axis-ticks',
  styles: [
    `
      svg {
        height: 100%;
        position: absolute;
        width: 100%;
        z-index: -2;
      }
    `,
  ],
  template: `
    <svg>
      <g [attr.transform]="'translate(' + marginLeft + ',' + marginTop + ')'">
        <g
          *ngFor="let tick of xTicksView"
          class="tick"
          opacity="1"
          [attr.transform]="
            'translate(' + xScaleView(tick.date) + ',' + 0 + ')'
          "
        >
          <line stroke="lightgrey" [attr.y2]="drawHeight" />
        </g>
      </g>
    </svg>
  `,
})
export class TimelineRowXAxisTicksComponent {
  @Input()
  drawHeight: number;

  @Input()
  marginLeft: number;

  @Input()
  marginTop: number;

  @Input()
  xScaleView: ScaleTime<number, number>;

  @Input()
  xTicksView: XAxisTick[] = [];
}

@NgModule({
  declarations: [TimelineRowXAxisTicksComponent],
  exports: [TimelineRowXAxisTicksComponent],
  imports: [CommonModule],
})
export class TimelineRowXAxisTicksModule {}
