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
import {
  PlanningActions,
  SimulationActions,
  TimelineActions,
} from '../../actions';
import { RootState } from '../../app-store';
import { getMaxTimeRange, getViewTimeRange } from '../../selectors';
import { Band, DeletePoint, TimeRange, UpdatePoint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-timeline',
  styleUrls: ['./timeline.component.css'],
  templateUrl: './timeline.component.html',
})
export class TimelineComponent implements OnChanges, OnDestroy {
  @Input()
  bands: Band[];

  @Input()
  height: number;

  @Input()
  marginBottom = 10;

  @Input()
  marginLeft = 280;

  @Input()
  marginRight = 70;

  @Input()
  marginTop = 10;

  @Input()
  maxTimeRange: TimeRange;

  @Input()
  showSimulationControls = false;

  @Input()
  showTimeControls = true;

  @Input()
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.height) {
      this.setBandContainerHeight();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onRestore(): void {
    this.store.dispatch(TimelineActions.restoreViewTimeRange());
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

  onSimulationClear(): void {
    this.store.dispatch(SimulationActions.clear());
  }

  onSimulationRun(): void {
    this.store.dispatch(SimulationActions.run());
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

  onZoomIn(): void {
    this.store.dispatch(TimelineActions.zoomInViewTimeRange());
  }

  onZoomOut(): void {
    this.store.dispatch(TimelineActions.zoomOutViewTimeRange());
  }

  setBandContainerHeight() {
    const controlsContainer = this.elRef.nativeElement.querySelector(
      '.controls-container',
    );
    const timeAxisContainer = this.elRef.nativeElement.querySelector(
      '.time-axis-container',
    );
    const bandContainer = this.elRef.nativeElement.querySelector(
      '.band-container',
    );

    let offsetTop = 55; // TODO: Find a better solution than a static offset.

    if (controlsContainer) {
      offsetTop += controlsContainer.clientHeight;
    }

    if (timeAxisContainer) {
      offsetTop += controlsContainer.clientHeight;
    }

    if (bandContainer) {
      bandContainer.style.setProperty(
        '--max-height',
        `${this.height - offsetTop}px`,
      );
    }
  }

  trackByBands(_: number, band: Band): string {
    return band.id;
  }
}
