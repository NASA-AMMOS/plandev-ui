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
  ConstraintViolationListState,
  StringTMap,
  TimeRange,
} from '../../types';
import { ConstraintViolationListNodeModule } from './constraint-violation-list-node.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'constraint-violation-list',
  styles: [
    `
      mat-expansion-panel {
        border-radius: 0px;
      }

      mat-expansion-panel-header {
        border-radius: 0px;
        box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12);
        font-family: Roboto;
        font-size: 16px;
        font-style: normal;
        font-weight: normal;
      }

      mat-panel-title,
      mat-panel-description {
        flex-basis: 0;
      }

      mat-panel-description {
        align-items: center;
        justify-content: flex-end;
        margin-right: 10px;
      }

      ::ng-deep mat-expansion-panel-header > .mat-content {
        overflow: initial !important;
      }

      ::ng-deep .mat-expansion-panel-body {
        padding: 0px !important;
      }

      ul {
        padding-inline-start: 20px;
      }

      li {
        list-style: none;
      }

      .category {
        padding-bottom: 15px;
      }

      .visibility-icon {
        cursor: pointer;
        font-size: 18px;
        height: 18px;
        user-select: none;
        width: 18px;
      }
    `,
  ],
  template: `
    <panel-header> Constraint Violations </panel-header>

    <form class="p-1 pb-3">
      <mat-form-field class="w-100" appearance="outline">
        <mat-label>Search</mat-label>
        <input
          (input)="filterConstraintViolations($event.target.value)"
          type="text"
          matInput
          autocomplete="off"
        />
        <mat-icon matSuffix>search</mat-icon>
        <mat-hint>
          Constraint Violation Name, Activity Instance Type, State Name, or
          Window
        </mat-hint>
      </mat-form-field>
    </form>

    <mat-card *ngIf="emptyConstraintViolations">
      No Constraint Violations Found
    </mat-card>

    <ng-container *ngIf="!emptyConstraintViolations">
      <div
        class="category"
        *ngFor="let category of filteredConstraintViolations | keyvalue"
      >
        <mat-expansion-panel
          [expanded]="
            constraintViolationListState.category[category.key].expanded
          "
          (afterCollapse)="onToggleExpanded(category.key, false)"
          (afterExpand)="onToggleExpanded(category.key, true)"
        >
          <mat-expansion-panel-header
            collapsedHeight="40px"
            expandedHeight="40px"
          >
            <mat-panel-title>
              <span
                [matBadge]="category.value.length"
                matBadgeColor="warn"
                matBadgeOverlap="false"
                matBadgeSize="small"
              >
                {{ category.key | titlecase }}
              </span>
            </mat-panel-title>
            <mat-panel-description>
              <mat-icon
                *ngIf="
                  constraintViolationListState.category[category.key]
                    .visible === true
                "
                (click)="onToggleVisibility($event, category.key, false)"
                matRipple
                class="visibility-icon"
                matTooltip="Hide Category"
              >
                visibility
              </mat-icon>
              <mat-icon
                *ngIf="
                  constraintViolationListState.category[category.key]
                    .visible === false
                "
                (click)="onToggleVisibility($event, category.key, true)"
                matRipple
                class="visibility-icon"
                matTooltip="Show Category"
              >
                visibility_off
              </mat-icon>
            </mat-panel-description>
          </mat-expansion-panel-header>

          <ul>
            <li
              *ngFor="
                let constraintViolation of category.value;
                trackBy: trackByConstraintViolations
              "
            >
              <constraint-violation-list-node
                [activityInstanceIdToType]="activityInstanceIdToType"
                [constraintViolation]="constraintViolation"
                [constraintViolationListState]="constraintViolationListState"
                (selectWindow)="onSelectWindow($event)"
              ></constraint-violation-list-node>
            </li>
          </ul>
        </mat-expansion-panel>
      </div>
    </ng-container>
  `,
})
export class ConstraintViolationListComponent implements OnChanges {
  @Input()
  activityInstances: ActivityInstance[] | null;

  @Input()
  constraintViolations: ConstraintViolation[];

  @Input()
  constraintViolationListState: ConstraintViolationListState;

  activityInstanceIdToType: StringTMap<string> = {};
  constraintViolationsByCategory: StringTMap<ConstraintViolation[]>;
  filteredConstraintViolations: StringTMap<ConstraintViolation[]> | null = null;
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

    if (changes.constraintViolations) {
      this.constraintViolationsByCategory = this.constraintViolations.reduce(
        (constraintViolationsByCategory, constraintViolation) => {
          const { constraint } = constraintViolation;
          const { category } = constraint;
          const prevViolations = constraintViolationsByCategory[category] || [];
          constraintViolationsByCategory[category] = [
            ...prevViolations,
            constraintViolation,
          ];
          return constraintViolationsByCategory;
        },
        {},
      );
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

  onToggleExpanded(category: string, expanded: boolean) {
    this.store.dispatch(
      PlanningActions.updateConstraintViolationListState({
        formType: 'category',
        formValue: category,
        key: 'expanded',
        value: expanded,
      }),
    );
  }

  onToggleVisibility(event: MouseEvent, category: string, visible: boolean) {
    event.cancelBubble = true;
    this.store.dispatch(
      PlanningActions.updateConstraintViolationListState({
        formType: 'category',
        formValue: category,
        key: 'visible',
        value: visible,
      }),
    );
  }

  trackByConstraintViolations(
    _: number,
    constraintViolation: ConstraintViolation,
  ): string {
    return constraintViolation.constraint.name;
  }
}

@NgModule({
  declarations: [ConstraintViolationListComponent],
  exports: [ConstraintViolationListComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ConstraintViolationListNodeModule,
    PanelHeaderModule,
    PipesModule,
  ],
})
export class ConstraintViolationListModule {}
