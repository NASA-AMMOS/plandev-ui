import { NgModule } from '@angular/core';
import { MaterialModule } from '../../material';
import { SimulationControlsComponent } from './simulation-controls.component';

@NgModule({
  declarations: [SimulationControlsComponent],
  exports: [SimulationControlsComponent],
  imports: [MaterialModule],
})
export class SimulationControlsModule {}
