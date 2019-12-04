import { NgModule } from '@angular/core';
import { MaterialModule } from '../../material';
import { TimeAxisControlsComponent } from './time-axis-controls.component';

@NgModule({
  declarations: [TimeAxisControlsComponent],
  exports: [TimeAxisControlsComponent],
  imports: [MaterialModule],
})
export class TimeAxisControlsModule {}
