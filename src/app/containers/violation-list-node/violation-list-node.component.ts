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
  StringTMap,
  TimeRange,
  ViolationListState,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'violation-list-node',
  styleUrls: ['./violation-list-node.component.css'],
  templateUrl: './violation-list-node.component.html',
})
export class ViolationListNodeComponent {
  @Input()
  activityInstanceIdToType: StringTMap<string>;

  @Input()
  violation: ConstraintViolation;

  @Input()
  violationListState: ViolationListState;

  @Output()
  selectWindow: EventEmitter<TimeRange> = new EventEmitter<TimeRange>();

  constructor(private store: Store<RootState>) {}

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
  declarations: [ViolationListNodeComponent],
  exports: [ViolationListNodeComponent],
  imports: [CommonModule, MaterialModule, PipesModule],
})
export class ViolationListNodeModule {}
