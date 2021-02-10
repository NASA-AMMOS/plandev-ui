import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  ConstraintViolation,
  ConstraintViolationListState,
  StringTMap,
  TimeRange,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'constraint-violation-list-node',
  styles: [
    `
      ul {
        padding-inline-start: 30px;
      }

      li {
        list-style: none;
      }

      .association,
      .constraint-violation {
        align-items: center;
        display: flex;
      }

      .constraint-violation {
        cursor: pointer;
      }

      .constraint-violation-left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }

      .constraint-violation-right {
        align-items: center;
        justify-content: flex-end;
        margin-right: 20px;
      }

      .association > mat-icon {
        color: #bdbdbd;
        font-size: 15px;
        height: 15px;
        padding-right: 5px;
        user-select: none;
        width: 15px;
      }

      .constraint-violation > mat-icon {
        cursor: pointer;
        font-size: 20px;
        height: 20px;
        padding-right: 5px;
        user-select: none;
        width: 20px;
      }

      .visibility-icon {
        color: rgba(0, 0, 0, 0.54);
        cursor: pointer;
        font-size: 18px;
        height: 18px;
        user-select: none;
        width: 18px;
      }

      .window {
        cursor: pointer;
        margin-right: 10px;
        text-decoration: underline;
      }
    `,
  ],
  template: `
    <div class="constraint-violation" (click)="toggleExpanded()">
      <div class="constraint-violation-left">
        <mat-icon *ngIf="expanded"> expand_more </mat-icon>
        <mat-icon *ngIf="!expanded"> chevron_right </mat-icon>
        <div>{{ constraintViolation.constraint.name }}</div>
      </div>
      <div class="constraint-violation-right">
        <mat-icon
          *ngIf="visible"
          (click)="toggleVisible($event)"
          matRipple
          class="visibility-icon"
          matTooltip="Hide Constraint"
        >
          visibility
        </mat-icon>
        <mat-icon
          *ngIf="!visible"
          (click)="toggleVisible($event)"
          tRipple
          class="visibility-icon"
          matTooltip="Show Constraint"
        >
          visibility_off
        </mat-icon>
      </div>
    </div>

    <ng-container *ngIf="expanded">
      <ul
        *ngIf="constraintViolation?.associations?.activityInstanceIds?.length"
      >
        <li
          *ngFor="
            let id of constraintViolation.associations.activityInstanceIds
          "
        >
          <div class="association">
            <mat-icon>share</mat-icon>{{ activityInstanceIdToType[id] || id }}
          </div>
        </li>
      </ul>
      <ul *ngIf="constraintViolation?.associations?.resourceIds?.length">
        <li *ngFor="let id of constraintViolation.associations.resourceIds">
          <div class="association"><mat-icon>share</mat-icon> {{ id }}</div>
        </li>
      </ul>
      <ul *ngIf="constraintViolation?.windows?.length">
        <li
          class="ellipsis window"
          (click)="selectWindow.emit(window)"
          *ngFor="let window of constraintViolation.windows"
        >
          {{ window.start | doyTimestamp }} -
          {{ window.end | doyTimestamp }}
        </li>
      </ul>
    </ng-container>
  `,
})
export class ConstraintViolationListNodeComponent {
  @Input()
  activityInstanceIdToType: StringTMap<string>;

  @Input()
  constraintViolation: ConstraintViolation;

  @Input()
  constraintViolationListState: ConstraintViolationListState;

  @Output()
  selectWindow: EventEmitter<TimeRange> = new EventEmitter();

  constructor(private store: Store<RootState>) {}

  get expanded() {
    const { constraint } = this.constraintViolationListState;
    const { expanded } = constraint[this.constraintViolation.constraint.name];
    return expanded;
  }

  get visible() {
    const { constraint } = this.constraintViolationListState;
    const { visible } = constraint[this.constraintViolation.constraint.name];
    return visible;
  }

  toggleExpanded() {
    this.store.dispatch(
      PlanningActions.updateConstraintViolationListState({
        formType: 'constraint',
        formValue: this.constraintViolation.constraint.name,
        key: 'expanded',
        value: !this.expanded,
      }),
    );
  }

  toggleVisible(event: MouseEvent) {
    event.cancelBubble = true;
    this.store.dispatch(
      PlanningActions.updateConstraintViolationListState({
        formType: 'constraint',
        formValue: this.constraintViolation.constraint.name,
        key: 'visible',
        value: !this.visible,
      }),
    );
  }
}

@NgModule({
  declarations: [ConstraintViolationListNodeComponent],
  exports: [ConstraintViolationListNodeComponent],
  imports: [CommonModule, MaterialModule, PipesModule],
})
export class ConstraintViolationListNodeModule {}
