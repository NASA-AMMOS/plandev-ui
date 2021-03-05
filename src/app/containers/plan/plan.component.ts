import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  NgModule,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { select, Store } from '@ngrx/store';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { SubSink } from 'subsink';
import { AppActions, PlanningActions, ToastActions } from '../../actions';
import { RootState } from '../../app-store';
import {
  ActivityInstanceFormModule,
  ActivityTypeListModule,
  HeaderModule,
  PlaceholderModule,
  TableModule,
  TimelineModule,
  ToolbarModule,
} from '../../components';
import { getViewText } from '../../functions';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  getActivityInstances,
  getActivityInstancesMap,
  getActivityTypes,
  getAdaptationId,
  getConstraintViolationListState,
  getConstraintViolations,
  getMaxTimeRange,
  getSelectedActivityInstance,
  getSelectedPlan,
  getSelectedViewWithPoints,
  getSimulationOutOfDate,
  getViews,
  getViewTimeRange,
} from '../../selectors';
import {
  ActivityInstance,
  ActivityType,
  ConstraintViolation,
  ConstraintViolationListState,
  CreateActivityInstance,
  CreatePoint,
  DeletePoint,
  HorizontalGuideEvent,
  LayerEvent,
  Plan,
  Row,
  SavePoint,
  SelectPoint,
  StringTMap,
  TimeRange,
  UpdateActivityInstance,
  UpdatePoint,
  UpdateRow,
  VerticalGuide,
  VerticalGuideEvent,
  View,
  ViewSection,
  ViewSectionMenuItem,
} from '../../types';
import { ConstraintViolationListModule } from '../constraint-violation-list/constraint-violation-list.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plan',
  styleUrls: ['./plan.component.css'],
  templateUrl: './plan.component.html',
})
export class PlanComponent implements OnDestroy {
  @ViewChild('verticalSplitAreas', { static: true })
  verticalSplitAreas: SplitComponent;

  activityInstances: ActivityInstance[] | null = null;
  activityInstancesMap: StringTMap<ActivityInstance> | null = null;
  activityTypes: ActivityType[] | null = null;
  adaptationId = '';
  constraintViolations: ConstraintViolation[] = [];
  constraintViolationListState: ConstraintViolationListState;
  drawer = {
    activityDictionary: {
      visible: true,
    },
    createActivityInstance: {
      visible: false,
    },
    selectedActivityInstance: {
      visible: false,
    },
    viewEditor: {
      visible: false,
    },
    violations: {
      visible: false,
    },
  };
  drawerVisible = true;
  maxTimeRange: TimeRange;
  viewEditorOptions = {
    extraKeys: {
      ['Cmd-S']: () => {
        this.ngZone.run(() => {
          try {
            if (this.selectedView) {
              const newView = JSON.parse(this.selectedViewText);
              this.store.dispatch(
                PlanningActions.updateView({
                  id: this.selectedView.id,
                  view: newView,
                }),
              );
              this.onResize();
            }
          } catch (error) {
            const { message } = error;
            console.error(message);
            this.store.dispatch(
              ToastActions.showToast({
                message,
                toastType: 'error',
              }),
            );
          }
        });
      },
    },
    lineNumbers: true,
    mode: 'javascript',
    theme: 'default',
  };
  plan: Plan | null = null;
  selectedActivityInstance: ActivityInstance | null = null;
  selectedActivityType: ActivityType | null = null;
  selectedView: View;
  selectedViewText: string;
  simulationOutOfDate = false;
  totalConstraintViolations = 0;
  views: View[];
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private store: Store<RootState>,
  ) {
    this.subs.add(
      this.store
        .pipe(select(getActivityInstances))
        .subscribe(activityInstances => {
          this.activityInstances = activityInstances;
          this.cdRef.markForCheck();
        }),
      this.store
        .pipe(select(getActivityInstancesMap))
        .subscribe(activityInstancesMap => {
          this.activityInstancesMap = activityInstancesMap;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getActivityTypes)).subscribe(activityTypes => {
        this.activityTypes = activityTypes;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getAdaptationId)).subscribe(adaptationId => {
        this.adaptationId = adaptationId;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getConstraintViolations))
        .subscribe(constraintViolations => {
          this.constraintViolations = constraintViolations;
          this.totalConstraintViolations = constraintViolations.length;
          this.cdRef.markForCheck();
        }),
      this.store
        .pipe(select(getConstraintViolationListState))
        .subscribe(constraintViolationListState => {
          this.constraintViolationListState = constraintViolationListState;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getSelectedViewWithPoints)).subscribe(view => {
        this.selectedView = view;
        this.selectedViewText = getViewText(view);
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getSelectedActivityInstance))
        .subscribe(selectedActivityInstance => {
          this.selectedActivityInstance = selectedActivityInstance;
          if (this.selectedActivityInstance !== null) {
            this.showDrawerType('selectedActivityInstance');
          }
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getSelectedPlan)).subscribe(plan => {
        this.plan = plan;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getSimulationOutOfDate))
        .subscribe(simulationOutOfDate => {
          this.simulationOutOfDate = simulationOutOfDate;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getViews)).subscribe(views => {
        this.views = views;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getViewTimeRange)).subscribe(viewTimeRange => {
        this.viewTimeRange = viewTimeRange;
        this.cdRef.markForCheck();
      }),
    );
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const { key, metaKey } = event;
    if (metaKey && key === 'e') {
      event.preventDefault();
      this.showViewEditor();
    }
    if (metaKey && key === 's') {
      event.preventDefault();
      this.runSimulation();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onCancel(): void {
    this.showDrawerType('activityDictionary');
  }

  onCreateActivityInstance(activityInstance: CreateActivityInstance): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.createActivityInstance({ activityInstance, planId }),
    );
  }

  onCreateHorizontalGuide(event: HorizontalGuideEvent) {
    this.store.dispatch(PlanningActions.horizontalGuideOpenDialog({ event }));
  }

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
        PlanningActions.createActivityInstance({ activityInstance, planId }),
      );
    }
  }

  onCreateVerticalGuide(timelineId: string): void {
    const event: VerticalGuideEvent = {
      mode: 'create',
      timelineId,
    };
    this.store.dispatch(PlanningActions.verticalGuideOpenDialog({ event }));
  }

  onDeleteActivityInstance(activityInstanceId: string): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.deleteActivityInstance({ activityInstanceId, planId }),
    );
  }

  onDeleteHorizontalGuide(event: HorizontalGuideEvent): void {
    const { guide, rowId } = event;
    this.store.dispatch(
      PlanningActions.horizontalGuideDelete({ guide, rowId }),
    );
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

  onDeleteRow(row: Row, timelineId: string) {
    this.store.dispatch(PlanningActions.deleteRow({ row, timelineId }));
  }

  onDeleteVerticalGuide(guide: VerticalGuide, timelineId: string) {
    this.store.dispatch(
      PlanningActions.verticalGuideDelete({ guide, timelineId }),
    );
  }

  onResize(): void {
    this.store.dispatch(AppActions.resize());
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

  onSelectActivityInstance(activityInstance: ActivityInstance): void {
    this.store.dispatch(
      PlanningActions.setSelectedActivityInstanceId({
        selectedActivityInstanceId: activityInstance.id,
      }),
    );
  }

  onSelectActivityType(activityType: ActivityType): void {
    this.selectedActivityType = { ...activityType };
    this.showDrawerType('createActivityInstance');
  }

  onSelectPoint(event: SelectPoint): void {
    if (event.type === 'activity') {
      this.store.dispatch(
        PlanningActions.setSelectedActivityInstanceId({
          keepSelected: true,
          selectedActivityInstanceId: event.id,
        }),
      );
      this.showDrawerType('selectedActivityInstance');
    }
  }

  onViewChanged(change: MatSelectChange): void {
    const { value: id } = change;
    this.store.dispatch(PlanningActions.updateSelectedViewId({ id }));
    this.store.dispatch(AppActions.resize());
  }

  onViewSectionMenuAction(item: ViewSectionMenuItem) {
    const { action, data } = item;
    if (action === 'link' && data && data.url) {
      window.open(data.url, '_blank');
    }
    if (action === 'restore') {
      this.store.dispatch(PlanningActions.restoreViewTimeRange());
    }
    if (action === 'simulate') {
      this.runSimulation();
    }
  }

  onUpdateActivityInstance(activityInstance: UpdateActivityInstance): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.updateActivityInstance({
        activityInstance,
        planId,
      }),
    );
  }

  onUpdateHorizontalGuide(event: HorizontalGuideEvent): void {
    this.store.dispatch(PlanningActions.horizontalGuideOpenDialog({ event }));
  }

  onUpdateLayer(event: LayerEvent): void {
    this.store.dispatch(PlanningActions.layerOpenDialog({ event }));
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

  onUpdateRow(event: UpdateRow): void {
    const { rowId, update } = event;
    this.store.dispatch(PlanningActions.updateRow({ rowId, update }));
    this.store.dispatch(AppActions.resize());
  }

  onUpdateVerticalGuide(guide: VerticalGuide, timelineId: string) {
    const event: VerticalGuideEvent = {
      guide,
      mode: 'edit',
      timelineId,
    };
    this.store.dispatch(PlanningActions.verticalGuideOpenDialog({ event }));
  }

  onUpdateViewTimeRange(viewTimeRange: TimeRange): void {
    this.store.dispatch(PlanningActions.updateViewTimeRange({ viewTimeRange }));
  }

  runSimulation() {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(PlanningActions.runSimulation({ planId }));
  }

  showDrawerType(type: string): void {
    const drawerContent = Object.keys(this.drawer);
    drawerContent.forEach(content => {
      if (content !== type) {
        this.drawer[content].visible = false;
      } else {
        this.drawer[content].visible = true;
      }
    });
    this.drawerVisible = true;
  }

  showViewEditor() {
    this.showDrawerType('viewEditor');
    this.onResize();
  }

  trackByViewSections(index: number, viewSection: ViewSection): string {
    return `${viewSection.id}-${index}`;
  }
}

@NgModule({
  declarations: [PlanComponent],
  exports: [PlanComponent],
  imports: [
    CommonModule,
    CodemirrorModule,
    FormsModule,
    MaterialModule,
    AngularSplitModule,
    ActivityInstanceFormModule,
    ActivityTypeListModule,
    ConstraintViolationListModule,
    HeaderModule,
    PipesModule,
    PlaceholderModule,
    TableModule,
    TimelineModule,
    ToolbarModule,
  ],
})
export class PlanModule {}
