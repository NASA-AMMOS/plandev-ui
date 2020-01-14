import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-time-axis-controls',
  styleUrls: ['./time-axis-controls.component.css'],
  templateUrl: `./time-axis-controls.component.html`,
})
export class TimeAxisControlsComponent {
  @Output()
  restore: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  simulationClear: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  simulationRun: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  zoomIn: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  zoomOut: EventEmitter<void> = new EventEmitter<void>();
}
