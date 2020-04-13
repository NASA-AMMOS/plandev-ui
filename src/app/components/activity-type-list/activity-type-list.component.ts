import { CommonModule } from '@angular/common';
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
import { MaterialModule } from '../../material';
import { ActivityType } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-type-list',
  styleUrls: ['./activity-type-list.component.css'],
  templateUrl: './activity-type-list.component.html',
})
export class ActivityTypeListComponent implements OnChanges {
  @Input()
  activityTypes: ActivityType[] = [];

  @Output()
  selectActivityType: EventEmitter<ActivityType> = new EventEmitter<
    ActivityType
  >();

  draggable = false;
  filteredActivityTypes: ActivityType[] = [];
  searchText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.activityTypes) {
      this.filterActivityTypes(this.searchText);
    }
  }

  filterActivityTypes(text: string): void {
    this.filteredActivityTypes = this.activityTypes.filter(activityType =>
      activityType.name.toLowerCase().includes(text.toLowerCase()),
    );
    this.searchText = text;
  }

  onActivityTypeSelect(activityType: ActivityType): void {
    this.selectActivityType.emit(activityType);
  }

  onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragEnd(): void {
    this.draggable = false;
  }

  onDragStart(event: DragEvent, activityType: ActivityType): void {
    event.dataTransfer.setData('activityType', JSON.stringify(activityType));
  }

  onMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    this.draggable = true;
  }

  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    this.draggable = false;
  }
}

@NgModule({
  declarations: [ActivityTypeListComponent],
  exports: [ActivityTypeListComponent],
  imports: [CommonModule, MaterialModule],
})
export class ActivityTypeListModule {}
