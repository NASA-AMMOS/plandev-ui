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
}

@NgModule({
  declarations: [ActivityTypeListComponent],
  exports: [ActivityTypeListComponent],
  imports: [CommonModule, MaterialModule],
})
export class ActivityTypeListModule {}
