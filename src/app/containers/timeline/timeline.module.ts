import { NgModule } from '@angular/core';
import { TimeAxisControlsModule, TimeAxisModule } from '../../components';
import { BandModule } from '../../components/band';
import { TimelineComponent } from './timeline.component';

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [BandModule, TimeAxisModule, TimeAxisControlsModule],
})
export class TimelineModule {}
