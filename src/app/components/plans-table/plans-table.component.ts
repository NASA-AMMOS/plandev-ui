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
import { Plan } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'plans-table',
  styleUrls: ['./plans-table.component.css'],
  templateUrl: './plans-table.component.html',
})
export class PlansTableComponent {
  @Input()
  plans: Plan[] = [];

  @Output()
  deletePlan: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  openPlan: EventEmitter<string> = new EventEmitter<string>();

  displayedColumns: string[] = [
    'name',
    'adaptationId',
    'startTimestamp',
    'endTimestamp',
  ];
  onContextMenu = contextMenu;
}

@NgModule({
  declarations: [PlansTableComponent],
  exports: [PlansTableComponent],
  imports: [MaterialModule],
})
export class PlansTableModule {}
