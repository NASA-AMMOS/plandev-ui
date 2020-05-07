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

  onDragEnd(): void {
    document.getElementById('list-item-drag-image').remove();
  }

  onDragStart(event: DragEvent, activityType: ActivityType): void {
    const dragImage = document.createElement('div');
    const text = document.createTextNode(activityType.name);
    dragImage.appendChild(text);
    dragImage.id = 'list-item-drag-image';
    dragImage.style.padding = '10px';
    dragImage.style.color = 'rgba(0, 0, 0, 0.8)';
    document.body.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    event.dataTransfer.setData('activityType', JSON.stringify(activityType));
  }
}

@NgModule({
  declarations: [ActivityTypeListComponent],
  exports: [ActivityTypeListComponent],
  imports: [CommonModule, MaterialModule],
})
export class ActivityTypeListModule {}
