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
  PanelHeaderModule,
  PlaceholderModule,
  TableModule,
  TimelineModule,
  ToolbarModule,
} from '../../components';
import {
  getPanelsText,
  getTooltipTextForPoints,
  hideTooltip,
  showTooltip,
} from '../../functions';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  getActivityInstances,
  getActivityInstancesMap,
  getActivityTypes,
  getAdaptationId,
  getMaxTimeRange,
  getPanelsWithPoints,
  getSelectedActivityInstance,
  getSelectedPlan,
  getSelectedUiState,
  getSimulationOutOfDate,
  getUiStates,
  getViewTimeRange,
  getViolationListState,
  getViolationsByCategory,
} from '../../selectors';
import {
  ActivityInstance,
  ActivityType,
  ConstraintViolation,
  CreateActivityInstance,
  CreatePoint,
  DeletePoint,
  HorizontalGuideEvent,
  MouseOverPoints,
  Panel,
  PanelMenuItem,
  Plan,
  Point,
  SavePoint,
  SelectPoint,
  StringTMap,
  TimeRange,
  UiState,
  UpdateActivityInstance,
  UpdatePoint,
  UpdateRow,
  ViolationListState,
} from '../../types';
import { ViolationListModule } from '../violation-list/violation-list.component';

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
  violationsByCategory: StringTMap<ConstraintViolation[]>;
  drawer = {
    activityDictionary: {
      visible: true,
    },
    createActivityInstance: {
      visible: false,
    },
    panelEditor: {
      visible: false,
    },
    selectedActivityInstance: {
      visible: false,
    },
    violations: {
      visible: false,
    },
  };
  drawerVisible = true;
  maxTimeRange: TimeRange;
  panelsEditorOptions = {
    extraKeys: {
      ['Cmd-S']: () => {
        this.ngZone.run(() => {
          try {
            if (this.selectedUiState) {
              const panels = JSON.parse(this.panelsText);
              this.store.dispatch(
                PlanningActions.updateUiState({
                  id: this.selectedUiState.id,
                  uiState: { panels },
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
  panels: Panel[] = [];
  panelsText: string;
  plan: Plan | null = null;
  selectedActivityInstance: ActivityInstance | null = null;
  selectedActivityType: ActivityType | null = null;
  selectedUiState: UiState | null;
  simulationOutOfDate = false;
  totalViolations = 0;
  uiStates: UiState[];
  viewTimeRange: TimeRange;
  violationListState: ViolationListState;

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
        .pipe(select(getViolationsByCategory))
        .subscribe(violationsByCategory => {
          this.violationsByCategory = violationsByCategory;
          this.totalViolations = 0;
          if (violationsByCategory) {
            const categories = Object.keys(this.violationsByCategory);
            for (const category of categories) {
              this.totalViolations += violationsByCategory[category].length;
            }
          }
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getPanelsWithPoints)).subscribe(panels => {
        this.panels = panels;
        this.panelsText = getPanelsText(panels);
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
      this.store.pipe(select(getSelectedUiState)).subscribe(selectedUiState => {
        this.selectedUiState = selectedUiState;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getSimulationOutOfDate))
        .subscribe(simulationOutOfDate => {
          this.simulationOutOfDate = simulationOutOfDate;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getUiStates)).subscribe(uiStates => {
        this.uiStates = uiStates;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getViewTimeRange)).subscribe(viewTimeRange => {
        this.viewTimeRange = viewTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getViolationListState))
        .subscribe(violationListState => {
          this.violationListState = violationListState;
          this.cdRef.markForCheck();
        }),
    );
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const { key, metaKey } = event;
    if (metaKey && key === 'e') {
      event.preventDefault();
      this.showPanelEditor();
    }
    if (metaKey && key === 's') {
      event.preventDefault();
      this.runSimulation();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    hideTooltip();
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

  onDeleteActivityInstance(activityInstanceId: string): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.deleteActivityInstance({ activityInstanceId, planId }),
    );
  }

  onMouseOverPoints(event: MouseOverPoints<Point>) {
    if (event.points.length) {
      let tooltipText = `${event?.doyTimestamp || ''}<br>`;
      if (event.points.length) {
        tooltipText += getTooltipTextForPoints(event.points);
      }
      showTooltip(event.e, tooltipText, event.drawWidth);
    } else {
      hideTooltip();
    }
  }

  onPanelMenuAction(item: PanelMenuItem) {
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

  onUiStateChanged(change: MatSelectChange): void {
    const { value: id } = change;
    this.store.dispatch(PlanningActions.updateSelectedUiStateId({ id }));
    this.store.dispatch(AppActions.resize());
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

  showPanelEditor() {
    this.showDrawerType('panelEditor');
    this.onResize();
  }

  trackByPanels(index: number, panel: Panel): string {
    return `${panel.id}-${index}`;
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
    PanelHeaderModule,
    PipesModule,
    PlaceholderModule,
    TableModule,
    TimelineModule,
    ToolbarModule,
    ViolationListModule,
  ],
})
export class PlanModule {}
