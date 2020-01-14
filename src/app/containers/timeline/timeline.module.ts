import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TimeAxisControlsModule, TimeAxisModule } from '../../components';
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
    TimeAxisModule,
    TimeAxisControlsModule,
  ],
})
export class TimelineModule {}
