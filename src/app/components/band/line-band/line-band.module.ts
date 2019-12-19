import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LineBandComponent } from './line-band.component';

@NgModule({
  declarations: [LineBandComponent],
  exports: [LineBandComponent],
  imports: [CommonModule],
})
export class LineBandModule {}
