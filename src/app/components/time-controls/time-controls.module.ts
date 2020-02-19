import { NgModule } from '@angular/core';
import { MaterialModule } from '../../material';
import { TimeControlsComponent } from './time-controls.component';

@NgModule({
  declarations: [TimeControlsComponent],
  exports: [TimeControlsComponent],
  imports: [MaterialModule],
})
export class TimeControlsModule {}
