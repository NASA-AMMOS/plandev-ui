import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { MaterialModule } from '../../material';
import { getDecompositionTreeState } from '../../selectors';
import {
  ActivityInstance,
  DecompositionTreeState,
  StringTMap,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'decomposition-tree',
  styleUrls: ['./decomposition-tree.component.css'],
  templateUrl: './decomposition-tree.component.html',
})
export class DecompositionTreeComponent implements OnChanges, OnDestroy {
  @Input()
  activityInstance: ActivityInstance | null = null;

  @Input()
  activityInstancesMap: StringTMap<ActivityInstance> | null = null;

  decompositionTreeState: DecompositionTreeState = { instance: {} };
  sortedChildIds: string[] = [];

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private store: Store<RootState>,
  ) {
    this.subs.add(
      this.store
        .pipe(select(getDecompositionTreeState))
        .subscribe(decompositionTreeState => {
          this.decompositionTreeState = decompositionTreeState;
          this.cdRef.markForCheck();
        }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.activityInstance) {
      if (this.activityInstance?.children?.length) {
        this.sortedChildIds = [...this.activityInstance.children].sort(
          (id0: string, id1: string) => {
            const a = this.activityInstancesMap[id0];
            const b = this.activityInstancesMap[id1];
            const aTime = getUnixEpochTime(a.startTimestamp);
            const bTime = getUnixEpochTime(b.startTimestamp);
            if (aTime < bTime) {
              return -1;
            }
            if (aTime > bTime) {
              return 1;
            }
            return 0;
          },
        );
      } else {
        this.sortedChildIds = [];
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get expanded() {
    const { instance } = this.decompositionTreeState;
    const activityInstance = instance[this.activityInstance.id];
    if (activityInstance) {
      const { expanded } = activityInstance;
      return expanded;
    }
    return true;
  }

  get hasChildren() {
    return this.activityInstance?.children?.length > 0 || false;
  }

  onClickTimestamp(event: MouseEvent): void {
    event.cancelBubble = true;
  }

  toggleExpanded() {
    if (this.hasChildren) {
      this.store.dispatch(
        PlanningActions.updateDecompositionTreeState({
          formType: 'instance',
          formValue: this.activityInstance.id,
          key: 'expanded',
          value: !this.expanded,
        }),
      );
    }
  }
}

@NgModule({
  declarations: [DecompositionTreeComponent],
  exports: [DecompositionTreeComponent],
  imports: [CommonModule, MaterialModule],
})
export class DecompositionTreeModule {}
