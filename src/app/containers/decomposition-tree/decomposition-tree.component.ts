import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgModule,
  OnDestroy,
} from '@angular/core';
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
  selector: 'app-decomposition-tree',
  styleUrls: ['./decomposition-tree.component.css'],
  templateUrl: './decomposition-tree.component.html',
})
export class DecompositionTreeComponent implements OnDestroy {
  @Input()
  activityInstance: ActivityInstance = {
    children: ['instance1', 'instance2', 'instance3'],
    duration: 0,
    id: 'instance0',
    parameters: [],
    parent: null,
    startTimestamp: '2020-001T00:00:00',
    type: 'RunInstrument',
  };

  @Input()
  activityInstances: StringTMap<ActivityInstance> | null = {
    instance1: {
      children: ['instance4', 'instance5', 'instance6'],
      duration: 0,
      id: 'instance1',
      parameters: [],
      parent: 'instance0',
      startTimestamp: '2020-001T00:00:10',
      type: 'PointCamera',
    },
    instance2: {
      children: [],
      duration: 0,
      id: 'instance2',
      parameters: [],
      parent: 'instance0',
      startTimestamp: '2020-001T00:00:20',
      type: 'CaptureImage',
    },
    instance3: {
      children: [],
      duration: 0,
      id: 'instance3',
      parameters: [],
      parent: 'instance0',
      startTimestamp: '2020-001T00:00:30',
      type: 'DownlinkData',
    },
    instance4: {
      children: [],
      duration: 0,
      id: 'instance4',
      parameters: [],
      parent: 'instance1',
      startTimestamp: '2020-001T00:00:02',
      type: 'RotateCamera',
    },
    instance5: {
      children: [],
      duration: 0,
      id: 'instance5',
      parameters: [],
      parent: 'instance1',
      startTimestamp: '2020-001T00:00:04',
      type: 'TranslateCamera',
    },
    instance6: {
      children: [],
      duration: 0,
      id: 'instance6',
      parameters: [],
      parent: 'instance1',
      startTimestamp: '2020-001T00:00:06',
      type: 'RotateCamera',
    },
  };

  decompositionTreeState: DecompositionTreeState = { instance: {} };

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
