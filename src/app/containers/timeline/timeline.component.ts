import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { MerlinActions } from '../../actions';
import { AppState } from '../../app-store';
import {
  getActivityInstancesBand,
  getMaxTimeRange,
  getViewTimeRange,
} from '../../selectors';
import { Band, DeletePoint, TimeRange, UpdatePoint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  styleUrls: ['./timeline.component.css'],
  templateUrl: './timeline.component.html',
})
export class TimelineComponent implements OnDestroy {
  band: Band;
  maxTimeRange: TimeRange;
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute,
    private store: Store<AppState>,
  ) {
    this.subs.add(
      this.store.pipe(select(getActivityInstancesBand)).subscribe(band => {
        this.band = band;
        this.cdRef.markForCheck();
      }),
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

  onRestore(): void {
    this.store.dispatch(MerlinActions.restoreViewTimeRange());
  }

  onDeletePoint(event: DeletePoint): void {
    if (event.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      this.store.dispatch(
        MerlinActions.deleteActivityInstance({
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
        MerlinActions.updateActivityInstance({
          activityInstance: event.value,
          activityInstanceId: event.id,
          planId,
        }),
      );
    }
  }

  onSelectPoint(selectedActivityInstanceId: string): void {
    this.store.dispatch(
      MerlinActions.setSelectedActivityInstanceId({
        keepSelected: true,
        selectedActivityInstanceId,
      }),
    );
  }

  onUpdatePoint(event: UpdatePoint): void {
    if (event.type === 'activity') {
      this.store.dispatch(
        MerlinActions.updateActivityInstanceProps({
          activityInstanceId: event.id,
          props: event.value,
        }),
      );
    }
  }

  onUpdateViewTimeRange(viewTimeRange: TimeRange): void {
    this.store.dispatch(MerlinActions.updateViewTimeRange({ viewTimeRange }));
  }

  onZoomIn(): void {
    this.store.dispatch(MerlinActions.zoomInViewTimeRange());
  }

  onZoomOut(): void {
    this.store.dispatch(MerlinActions.zoomOutViewTimeRange());
  }
}
