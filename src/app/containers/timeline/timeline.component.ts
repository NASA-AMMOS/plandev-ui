import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgModule,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { PlanningActions, TimelineActions } from '../../actions';
import { RootState } from '../../app-store';
import { TimeAxisGlobalModule, TimeAxisModule } from '../../components';
import { BandModule } from '../../components/band/band.component';
import { MaterialModule } from '../../material';
import { getMaxTimeRange, getViewTimeRange } from '../../selectors';
import { Band, DeletePoint, TimeRange, UpdatePoint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
})
export class TimelineComponent implements OnDestroy {
  @Input()
  bands: Band[] | null;

  @Input()
  marginBottom = 10;

  @Input()
  marginLeft = 70;

  @Input()
  marginRight = 70;

  @Input()
  marginTop = 10;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute,
    private store: Store<RootState>,
  ) {
    this.subs.add(
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getViewTimeRange)).subscribe(viewTimeRange => {
        this.viewTimeRange = viewTimeRange;
        this.cdRef.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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

  onSavePoint(event: UpdatePoint): void {
    if (event.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      this.store.dispatch(
        PlanningActions.updateActivityInstance({
          activityInstance: event.value,
          activityInstanceId: event.id,
          planId,
        }),
      );
    }
  }

  onSelectPoint(selectedActivityInstanceId: string): void {
    this.store.dispatch(
      PlanningActions.setSelectedActivityInstanceId({
        keepSelected: true,
        selectedActivityInstanceId,
      }),
    );
  }

  onUpdatePoint(event: UpdatePoint): void {
    if (event.type === 'activity') {
      this.store.dispatch(
        PlanningActions.updateActivityInstanceProps({
          activityInstanceId: event.id,
          props: event.value,
        }),
      );
    }
  }

  onUpdateViewTimeRange(viewTimeRange: TimeRange): void {
    this.store.dispatch(TimelineActions.updateViewTimeRange({ viewTimeRange }));
  }

  trackByBands(_: number, band: Band): string {
    return band.id;
  }
}

@NgModule({
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
  imports: [
    BandModule,
    CommonModule,
    MaterialModule,
    TimeAxisModule,
    TimeAxisGlobalModule,
  ],
})
export class TimelineModule {}
