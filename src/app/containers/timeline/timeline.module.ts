import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  SimulationControlsModule,
  TimeAxisModule,
  TimeControlsModule,
} from '../../components';
import { BandModule } from '../../components/band';
import { MaterialModule } from '../../material';
import { TimelineComponent } from './timeline.component';

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [
    BandModule,
    CommonModule,
    MaterialModule,
    SimulationControlsModule,
    TimeAxisModule,
    TimeControlsModule,
  ],
})
export class TimelineModule {}
