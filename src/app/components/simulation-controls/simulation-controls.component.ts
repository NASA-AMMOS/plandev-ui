import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  NgModule,
  Output,
} from '@angular/core';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-simulation-controls',
  styleUrls: ['./simulation-controls.component.css'],
  templateUrl: `./simulation-controls.component.html`,
})
export class SimulationControlsComponent {
  @Output()
  clear: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  run: EventEmitter<void> = new EventEmitter<void>();
}

@NgModule({
  declarations: [SimulationControlsComponent],
  exports: [SimulationControlsComponent],
  imports: [MaterialModule],
})
export class SimulationControlsModule {}
