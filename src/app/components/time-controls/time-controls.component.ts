import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-time-controls',
  styleUrls: ['./time-controls.component.css'],
  templateUrl: `./time-controls.component.html`,
})
export class TimeControlsComponent {
  @Output()
  restore: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  zoomIn: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  zoomOut: EventEmitter<void> = new EventEmitter<void>();
}
