import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { MerlinActions, SimulationActions } from '../../actions';
import { AppState } from '../../app-store';
import {
  getActivityInstancesBand,
  getMarginBottom,
  getMarginLeft,
  getMarginRight,
  getMarginTop,
  getMaxTimeRange,
  getStateBands,
  getViewTimeRange,
} from '../../selectors';
import { Band, DeletePoint, TimeRange, UpdatePoint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  styleUrls: ['./timeline.component.css'],
  templateUrl: './timeline.component.html',
})
export class TimelineComponent implements OnChanges, OnDestroy {
  @Input()
  height: number;

  activityInstancesBand: Band;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  maxTimeRange: TimeRange;
  stateBands: Band[];
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private route: ActivatedRoute,
    private store: Store<AppState>,
  ) {
    this.subs.add(
      this.store
        .pipe(select(getActivityInstancesBand))
        .subscribe(activityInstancesBand => {
          this.activityInstancesBand = activityInstancesBand;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getMarginBottom)).subscribe(marginBottom => {
        this.marginBottom = marginBottom;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getMarginLeft)).subscribe(marginLeft => {
        this.marginLeft = marginLeft;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getMarginRight)).subscribe(marginRight => {
        this.marginRight = marginRight;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getMarginTop)).subscribe(marginTop => {
        this.marginTop = marginTop;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getStateBands)).subscribe(stateBands => {
        this.stateBands = stateBands;
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
      this.setBandContainerHeight();
    }
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

  onSimulationClear(): void {
    this.store.dispatch(SimulationActions.clear());
  }

  onSimulationRun(): void {
    this.store.dispatch(SimulationActions.run());
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

  /**
   * @todo Find a better solution than using 180 to account for the padding before the band container
   */
  setBandContainerHeight() {
    const bandContainer = this.elRef.nativeElement.querySelector(
      '.band-container',
    );
    if (bandContainer) {
      bandContainer.style.setProperty('--max-height', `${this.height - 180}px`);
    }
  }
}
