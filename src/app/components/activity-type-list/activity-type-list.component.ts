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
import { CActivityType } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-activity-type-list',
  styleUrls: ['./activity-type-list.component.css'],
  templateUrl: './activity-type-list.component.html',
})
export class ActivityTypeListComponent implements OnChanges {
  @Input()
  activityTypes: CActivityType[] = [];

  @Output()
  selectActivityType: EventEmitter<CActivityType> = new EventEmitter<
    CActivityType
  >();

  filteredActivityTypes: CActivityType[] = [];
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

  onActivityTypeSelect(activityType: CActivityType): void {
    this.selectActivityType.emit(activityType);
  }

  onClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.style.cursor = 'grabbing';
  }

  onMouseUp(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    target.style.cursor = 'grab';
  }
}

@NgModule({
  declarations: [ActivityTypeListComponent],
  exports: [ActivityTypeListComponent],
  imports: [CommonModule, MaterialModule],
})
export class ActivityTypeListModule {}
