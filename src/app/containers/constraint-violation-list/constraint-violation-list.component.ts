import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';
import { Store } from '@ngrx/store';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { PanelHeaderModule } from '../../components';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  ActivityInstance,
  Associations,
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
  activityInstances: ActivityInstance[] | null;

  @Input()
  constraintViolationsByCategory: StringTMap<Violation[]> | null = null;

  @Input()
  violationListState: ViolationListState;

  activityInstanceIdToType: StringTMap<string> = {};
  filteredConstraintViolations: StringTMap<Violation[]> | null = null;
  searchText = '';

  constructor(private store: Store<RootState>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.activityInstances && this.activityInstances) {
      this.activityInstanceIdToType = this.activityInstances.reduce(
        (activityInstanceIdToType, activityInstance) => {
          activityInstanceIdToType[activityInstance.id] = activityInstance.type;
          return activityInstanceIdToType;
        },
        {},
      );
    }

    if (changes.constraintViolationsByCategory) {
      this.filterConstraintViolations(this.searchText);
    }
  }

  get emptyConstraintViolations() {
    return (
      this.filteredConstraintViolations === null ||
      Object.keys(this.filteredConstraintViolations).length === 0
    );
  }

  filterConstraintViolations(text: string): void {
    this.searchText = text;
    this.filteredConstraintViolations = null;
    if (this.constraintViolationsByCategory) {
      this.filteredConstraintViolations = {};
      const lowerCaseText = text.toLowerCase();
      for (const category of Object.keys(this.constraintViolationsByCategory)) {
        const violations = this.constraintViolationsByCategory[category];
        for (const violation of violations) {
          const { associations, constraint, windows } = violation;
          const { name } = constraint;
          if (
            name.toLowerCase().includes(lowerCaseText) ||
            this.hasStateIds(associations, lowerCaseText) ||
            this.hasActivityInstanceTypes(associations, lowerCaseText) ||
            this.hasWindows(windows, lowerCaseText)
          ) {
            this.filteredConstraintViolations[category] = [
              ...(this.filteredConstraintViolations[category] || []),
              violation,
            ];
          }
        }
      }
    }
  }

  hasActivityInstanceTypes(
    associations: Associations,
    lowerCaseText: string,
  ): boolean {
    if (associations.activityInstanceIds) {
      for (const id of associations.activityInstanceIds) {
        const type = this.activityInstanceIdToType[id];
        if (type.toLowerCase().includes(lowerCaseText)) {
          return true;
        }
      }
    }
    return false;
  }

  hasStateIds(associations: Associations, lowerCaseText: string): boolean {
    if (associations.stateIds) {
      for (const id of associations.stateIds) {
        if (id.toLowerCase().includes(lowerCaseText)) {
          return true;
        }
      }
    }
    return false;
  }

  hasWindows(windows: TimeRange[] = [], lowerCaseText: string): boolean {
    for (const window of windows) {
      const { start, end } = window;
      const startTimestamp = getDoyTimestamp(start);
      const endTimestamp = getDoyTimestamp(end);
      if (
        startTimestamp.toLowerCase().includes(lowerCaseText) ||
        endTimestamp.toLowerCase().includes(lowerCaseText)
      ) {
        return true;
      }
    }
    return false;
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

  trackByViolations(_: number, violation: Violation): string {
    return violation.constraint.name;
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
