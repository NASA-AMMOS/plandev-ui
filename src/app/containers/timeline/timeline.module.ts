import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TimeAxisControlsModule, TimeAxisModule } from '../../components';
import { BandModule } from '../../components/band';
import { TimelineComponent } from './timeline.component';

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [BandModule, CommonModule, TimeAxisModule, TimeAxisControlsModule],
})
export class TimelineModule {}
