import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ActivityBandComponent } from './activity-band.component';

@NgModule({
  declarations: [ActivityBandComponent],
  exports: [ActivityBandComponent],
  imports: [CommonModule],
})
export class ActivityBandModule {}
