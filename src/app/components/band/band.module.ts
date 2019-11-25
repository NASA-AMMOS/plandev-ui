import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ActivityBandModule } from './activity-band';
import { BandComponent } from './band.component';

@NgModule({
  declarations: [BandComponent],
  exports: [BandComponent],
  imports: [ActivityBandModule, CommonModule],
})
export class BandModule {}
