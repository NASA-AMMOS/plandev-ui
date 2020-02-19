import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { contextMenu } from 'src/app/functions';
import { MaterialModule } from '../../material';
import { CAdaptation } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-adaptations-table',
  styleUrls: ['./adaptations-table.component.css'],
  templateUrl: './adaptations-table.component.html',
})
export class AdaptationsTableComponent {
  @Input()
  adaptations: CAdaptation[] = [];

  @Output()
  createPlan: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  deleteAdaptation: EventEmitter<string> = new EventEmitter<string>();

  displayedColumns: string[] = ['id', 'name', 'version', 'mission', 'owner'];
  onContextMenu = contextMenu;
}

@NgModule({
  declarations: [AdaptationsTableComponent],
  exports: [AdaptationsTableComponent],
  imports: [MaterialModule],
})
export class AdaptationsTableModule {}
