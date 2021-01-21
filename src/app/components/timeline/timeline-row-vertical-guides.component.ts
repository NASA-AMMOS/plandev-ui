import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { ScaleTime } from 'd3-scale';
import { VerticalGuide } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-vertical-guides',
  styles: [
    `
      svg {
        height: 100%;
        pointer-events: none;
        position: absolute;
        width: 100%;
        z-index: 1;
      }
    `,
  ],
  template: `
    <svg>
      <g [attr.transform]="'translate(' + marginLeft + ',' + marginTop + ')'">
        <line
          *ngFor="let guide of filteredVerticalGuides"
          [attr.x1]="guide.x"
          [attr.y1]="0"
          [attr.x2]="guide.x"
          [attr.y2]="drawHeight"
          stroke="gray"
          stroke-dasharray="2"
        ></line>
      </g>
    </svg>
  `,
})
export class TimelineRowVerticalGuidesComponent implements OnChanges {
  @Input()
  drawHeight: number;

  @Input()
  marginLeft: number;

  @Input()
  marginTop: number;

  @Input()
  verticalGuides: VerticalGuide[] | undefined;

  @Input()
  xScaleView: ScaleTime<number, number>;

  filteredVerticalGuides: VerticalGuide[];

  ngOnChanges(changes: SimpleChanges) {
    if (this.verticalGuides && (changes.verticalGuides || changes.xScaleView)) {
      this.filteredVerticalGuides = this.verticalGuides.map(guide => ({
        ...guide,
        x: this.xScaleView(getUnixEpochTime(guide.timestamp)),
      }));
    }
  }
}

@NgModule({
  declarations: [TimelineRowVerticalGuidesComponent],
  exports: [TimelineRowVerticalGuidesComponent],
  imports: [CommonModule],
})
export class TimelineRowVerticalGuidesModule {}
