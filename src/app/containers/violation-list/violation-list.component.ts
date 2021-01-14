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
  ConstraintViolation,
  ConstraintViolationAssociations,
  StringTMap,
  TimeRange,
  ViolationListState,
} from '../../types';
import { ViolationListNodeModule } from '../violation-list-node/violation-list-node.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'violation-list',
  styleUrls: ['./violation-list.component.css'],
  templateUrl: './violation-list.component.html',
})
export class ViolationListComponent implements OnChanges {
  @Input()
  activityInstances: ActivityInstance[] | null;

  @Input()
  violationListState: ViolationListState;

  @Input()
  violationsByCategory: StringTMap<ConstraintViolation[]> | null = null;

  activityInstanceIdToType: StringTMap<string> = {};
  filteredViolations: StringTMap<ConstraintViolation[]> | null = null;
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

    if (changes.violationsByCategory) {
      this.filterViolations(this.searchText);
    }
  }

  get emptyViolations() {
    return (
      this.filteredViolations === null ||
      Object.keys(this.filteredViolations).length === 0
    );
  }

  filterViolations(text: string): void {
    this.searchText = text;
    this.filteredViolations = null;
    if (this.violationsByCategory) {
      this.filteredViolations = {};
      const lowerCaseText = text.toLowerCase();
      for (const category of Object.keys(this.violationsByCategory)) {
        const violations = this.violationsByCategory[category];
        for (const violation of violations) {
          const { associations, constraint, windows } = violation;
          const { name } = constraint;
          if (
            name.toLowerCase().includes(lowerCaseText) ||
            this.hasStateIds(associations, lowerCaseText) ||
            this.hasActivityInstanceTypes(associations, lowerCaseText) ||
            this.hasWindows(windows, lowerCaseText)
          ) {
            this.filteredViolations[category] = [
              ...(this.filteredViolations[category] || []),
              violation,
            ];
          }
        }
      }
    }
  }

  hasActivityInstanceTypes(
    associations: ConstraintViolationAssociations,
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

  hasStateIds(
    associations: ConstraintViolationAssociations,
    lowerCaseText: string,
  ): boolean {
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

  trackByViolations(_: number, violation: ConstraintViolation): string {
    return violation.constraint.name;
  }
}

@NgModule({
  declarations: [ViolationListComponent],
  exports: [ViolationListComponent],
  imports: [
    CommonModule,
    MaterialModule,
    PanelHeaderModule,
    PipesModule,
    ViolationListNodeModule,
  ],
})
export class ViolationListModule {}
