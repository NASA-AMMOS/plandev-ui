import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
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
import { Band, TimeRange, UpdatePoint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  styleUrls: ['./timeline.component.css'],
  templateUrl: './timeline.component.html',
})
export class TimelineComponent implements OnChanges, OnDestroy {
  @Input()
  height: number;

  band: Band;
  bandHeight: number;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.height) {
      this.setBandHeight();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onRestore(): void {
    this.store.dispatch(MerlinActions.restoreViewTimeRange());
  }

  onSavePoint(update: UpdatePoint): void {
    if (update.type === 'activity') {
      const { id: planId } = this.route.snapshot.params;
      this.store.dispatch(
        MerlinActions.updateActivityInstance({
          activityInstance: update.value,
          activityInstanceId: update.id,
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

  onUpdatePoint(update: UpdatePoint): void {
    if (update.type === 'activity') {
      this.store.dispatch(
        MerlinActions.updateActivityInstanceProps({
          activityInstanceId: update.id,
          props: update.value,
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

  /**
   * @todo find a better solution than using 180 to account for the padding before the band
   */
  setBandHeight(): void {
    this.bandHeight = this.height - 180;
  }
}
