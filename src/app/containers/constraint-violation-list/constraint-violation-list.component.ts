import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { PanelHeaderModule } from '../../components';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  StringTMap,
  TimeRange,
  Violation,
  ViolationListState,
} from '../../types';
import { ConstraintViolationListNodeModule } from '../constraint-violation-list-node/constraint-violation-list-node.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-constraint-violation-list',
  styleUrls: ['./constraint-violation-list.component.css'],
  templateUrl: './constraint-violation-list.component.html',
})
export class ConstraintViolationListComponent implements OnChanges {
  @Input()
  constraintViolationsByCategory: StringTMap<Violation[]> | null = null;

  @Input()
  violationListState: ViolationListState;

  filteredConstraintViolations: StringTMap<Violation[]> | null = null;
  searchText = '';

  constructor(private store: Store<RootState>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.constraintViolationsByCategory) {
      this.filterConstraintViolations(this.searchText);
    }
  }

  filterConstraintViolations(text: string): void {
    this.searchText = text;
    this.filteredConstraintViolations = null;
    if (this.constraintViolationsByCategory) {
      this.filteredConstraintViolations = {};
      const lowerCaseText = text.toLowerCase();
      for (const category of Object.keys(this.constraintViolationsByCategory)) {
        if (category.includes(lowerCaseText)) {
          this.filteredConstraintViolations[
            category
          ] = this.constraintViolationsByCategory[category];
        }
      }
    }
  }

  onSelectWindow(window: TimeRange): void {
    this.store.dispatch(
      PlanningActions.updateViewTimeRange({ viewTimeRange: window }),
    );
  }

  onToggleViolationCategoryExpanded(category: string, expanded: boolean) {
    this.store.dispatch(
      PlanningActions.updateViolationListState({
        formType: 'category',
        formValue: category,
        key: 'expanded',
        value: expanded,
      }),
    );
  }

  onToggleViolationCategoryVisibility(
    event: MouseEvent,
    category: string,
    visible: boolean,
  ) {
    event.cancelBubble = true;
    this.store.dispatch(
      PlanningActions.updateViolationListState({
        formType: 'category',
        formValue: category,
        key: 'visible',
        value: visible,
      }),
    );
  }
}

@NgModule({
  declarations: [ConstraintViolationListComponent],
  exports: [ConstraintViolationListComponent],
  imports: [
    CommonModule,
    ConstraintViolationListNodeModule,
    PanelHeaderModule,
    PipesModule,
    MaterialModule,
  ],
})
export class ConstraintViolationListModule {}
