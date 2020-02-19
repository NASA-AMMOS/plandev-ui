import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';

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
