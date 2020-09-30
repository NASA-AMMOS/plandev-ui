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
  ActivityTypeListModule,
  DataTableModule,
  PanelHeaderModule,
  PlaceholderModule,
  ToolbarModule,
} from '../../components';
import { getPanelsText, hideTooltip } from '../../functions';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  getActivityInstances,
  getActivityTypes,
  getConstraintViolationsByCategory,
  getMaxTimeRange,
  getPanelsWithPoints,
  getSelectedActivityInstance,
  getSelectedPlan,
  getSelectedUiState,
  getSimulationOutOfDate,
  getUiStates,
  getViewTimeRange,
  getViolationListState,
} from '../../selectors';
import {
  ActivityInstance,
  ActivityType,
  CreateActivityInstance,
  Panel,
  PanelMenuItem,
  Plan,
  StringTMap,
  TimeRange,
  UiState,
  UpdateActivityInstance,
  Violation,
  ViolationListState,
} from '../../types';
import { ConstraintViolationListModule } from '../constraint-violation-list/constraint-violation-list.component';
import { TimelineModule } from '../timeline/timeline.component';
import { UpsertActivityInstanceFormModule } from '../upsert-activity-instance-form/upsert-activity-instance-form.component';

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
  activityTypes: ActivityType[] | null = null;
  constraintViolationsByCategory: StringTMap<Violation[]>;
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
      'Cmd-S': () => {
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
  totalConstraintViolations = 0;
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
      this.store.pipe(select(getActivityTypes)).subscribe(activityTypes => {
        this.activityTypes = activityTypes;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getConstraintViolationsByCategory))
        .subscribe(constraintViolationsByCategory => {
          this.constraintViolationsByCategory = constraintViolationsByCategory;
          this.totalConstraintViolations = 0;
          if (constraintViolationsByCategory) {
            const categories = Object.keys(this.constraintViolationsByCategory);
            for (const category of categories) {
              this.totalConstraintViolations +=
                constraintViolationsByCategory[category].length;
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

  onDeleteActivityInstance(activityInstanceId: string): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.deleteActivityInstance({ planId, activityInstanceId }),
    );
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const { key, metaKey } = event;
    if (metaKey && key === 'e') {
      event.preventDefault();
      this.showDrawerType('panelEditor');
      this.onResize();
    }
    if (metaKey && key === 's') {
      event.preventDefault();
      this.runSimulation();
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

  onUiStateChanged(change: MatSelectChange): void {
    const { value: id } = change;
    this.store.dispatch(PlanningActions.updateSelectedUiStateId({ id }));
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
    MaterialModule,
    AngularSplitModule.forChild(),
    DataTableModule,
    ActivityTypeListModule,
    ConstraintViolationListModule,
    FormsModule,
    PanelHeaderModule,
    PipesModule,
    PlaceholderModule,
    TimelineModule,
    ToolbarModule,
    UpsertActivityInstanceFormModule,
  ],
})
export class PlanModule {}
