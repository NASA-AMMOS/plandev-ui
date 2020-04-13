import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { TimeAxisGlobalModule, TimeAxisModule } from '../../components';
import { BandModule } from '../../components/band/band.component';
import {
  Band,
  CreateActivityInstance,
  CreatePoint,
  DeletePoint,
  SavePoint,
  SelectPoint,
  TimeRange,
  UpdatePoint,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
})
export class TimelineComponent {
  @Input()
  bands: Band[] | null;

  @Input()
  marginBottom = 10;

  @Input()
  marginLeft = 100;

  @Input()
  marginRight = 40;

  @Input()
  marginTop = 10;

  @Input()
  maxTimeRange: TimeRange = { end: 0, start: 0 };

  @Input()
  viewTimeRange: TimeRange = { end: 0, start: 0 };

  constructor(private route: ActivatedRoute, private store: Store<RootState>) {}

  onCreatePoint(event: CreatePoint): void {
    if (event.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      const activityType = event.activityType;
      const activityInstance: CreateActivityInstance = {
        parameters: [],
        startTimestamp: event.startTimestamp,
        type: activityType.name,
      };
      this.store.dispatch(
        PlanningActions.createActivityInstance({ planId, activityInstance }),
      );
    }
  }

  onDeletePoint(event: DeletePoint): void {
    if (event.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      this.store.dispatch(
        PlanningActions.deleteActivityInstance({
          activityInstanceId: event.id,
          planId,
        }),
      );
    }
  }

  onSavePoint(event: SavePoint): void {
    if (event.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      this.store.dispatch(
        PlanningActions.updateActivityInstance({
          activityInstance: { ...event.value, id: event.id },
          planId,
        }),
      );
    }
  }

  onSelectPoint(event: SelectPoint): void {
    if (event.type === 'activity') {
      this.store.dispatch(
        PlanningActions.setSelectedActivityInstanceId({
          keepSelected: true,
          selectedActivityInstanceId: event.id,
        }),
      );
    }
  }

  onUpdatePoint(event: UpdatePoint): void {
    if (event.type === 'activity') {
      this.store.dispatch(
        PlanningActions.updateActivityInstanceSuccess({
          activityInstance: { ...event.value, id: event.id },
        }),
      );
    }
  }

  onUpdateViewTimeRange(viewTimeRange: TimeRange): void {
    this.store.dispatch(PlanningActions.updateViewTimeRange({ viewTimeRange }));
  }

  trackByBands(_: number, band: Band): string {
    return band.id;
  }
}

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [BandModule, CommonModule, TimeAxisModule, TimeAxisGlobalModule],
})
export class TimelineModule {}
