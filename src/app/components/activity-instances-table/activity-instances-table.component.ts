import { SelectionModel } from '@angular/cdk/collections';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { contextMenu } from 'src/app/functions';
import { CActivityInstance } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-instances-table',
  styleUrls: ['./activity-instances-table.component.css'],
  templateUrl: './activity-instances-table.component.html',
})
export class ActivityInstancesTableComponent implements OnChanges {
  @Input()
  activityInstances: CActivityInstance[] = [];

  @Input()
  selectedActivityInstance: CActivityInstance | null = null;

  @Output()
  deleteActivityInstance: EventEmitter<string> = new EventEmitter<string>();

  @Output()
  selectActivityInstance: EventEmitter<CActivityInstance> = new EventEmitter<
    CActivityInstance
  >();

  displayedColumns: string[] = ['select', 'type', 'startTimestamp'];
  onContextMenu = contextMenu;
  selection = new SelectionModel<CActivityInstance>(false, []);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedActivityInstance) {
      this.selection.select(this.selectedActivityInstance);
    }
  }

  onSelectActivityInstance(activityInstance: CActivityInstance): void {
    this.selection.toggle(activityInstance);
    this.selectActivityInstance.emit(activityInstance);
  }
}
