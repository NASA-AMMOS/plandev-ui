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
import { Store } from '@ngrx/store';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  ActivityInstance,
  StringTMap,
  TimeRange,
  Violation,
  ViolationListState,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-constraint-violation-list-node',
  styleUrls: ['./constraint-violation-list-node.component.css'],
  templateUrl: './constraint-violation-list-node.component.html',
})
export class ConstraintViolationListNodeComponent implements OnChanges {
  @Input()
  activityInstances: ActivityInstance[];

  @Input()
  violation: Violation;

  @Input()
  violationListState: ViolationListState;

  @Output()
  selectWindow: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  activityInstanceIdToType: StringTMap<string> = {};

  constructor(private store: Store<RootState>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.activityInstances) {
      this.activityInstanceIdToType = this.activityInstances.reduce(
        (activityInstanceIdToType, activityInstance) => {
          activityInstanceIdToType[activityInstance.id] = activityInstance.type;
          return activityInstanceIdToType;
        },
        {},
      );
    }
  }

  get expanded() {
    const { constraint } = this.violationListState;
    const { expanded } = constraint[this.violation.constraint.name];
    return expanded;
  }

  get visible() {
    const { constraint } = this.violationListState;
    const { visible } = constraint[this.violation.constraint.name];
    return visible;
  }

  toggleExpanded() {
    this.store.dispatch(
      PlanningActions.updateViolationListState({
        formType: 'constraint',
        formValue: this.violation.constraint.name,
        key: 'expanded',
        value: !this.expanded,
      }),
    );
  }

  toggleVisible(event: MouseEvent) {
    event.cancelBubble = true;
    this.store.dispatch(
      PlanningActions.updateViolationListState({
        formType: 'constraint',
        formValue: this.violation.constraint.name,
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
