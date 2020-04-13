import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { contextMenu } from 'src/app/functions';
import { MaterialModule } from '../../material';
import { ActivityInstance } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-instances-table',
  styleUrls: ['./activity-instances-table.component.css'],
  templateUrl: './activity-instances-table.component.html',
})
export class ActivityInstancesTableComponent implements OnChanges {
  @Input()
  activityInstances: ActivityInstance[] = [];

  @Input()
  selectedActivityInstance: ActivityInstance | null = null;

  @Output()
  deleteActivityInstance: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  selectActivityInstance: EventEmitter<ActivityInstance> = new EventEmitter<
    ActivityInstance
  >();

  displayedColumns: string[] = ['select', 'type', 'startTimestamp'];
  onContextMenu = contextMenu;
  selection = new SelectionModel<ActivityInstance>(false, []);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedActivityInstance) {
      this.selection.select(this.selectedActivityInstance);
    }
  }

  onSelectActivityInstance(activityInstance: ActivityInstance): void {
    this.selection.toggle(activityInstance);
    this.selectActivityInstance.emit(activityInstance);
  }
}

@NgModule({
  declarations: [ActivityInstancesTableComponent],
  exports: [ActivityInstancesTableComponent],
  imports: [MaterialModule],
})
export class ActivityInstancesTableModule {}
