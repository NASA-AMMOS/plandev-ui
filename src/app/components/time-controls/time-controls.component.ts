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
  selector: 'app-time-controls',
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

@NgModule({
  declarations: [TimeControlsComponent],
  exports: [TimeControlsComponent],
  imports: [MaterialModule],
})
export class TimeControlsModule {}
