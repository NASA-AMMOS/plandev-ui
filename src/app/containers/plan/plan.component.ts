import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgModule,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { AngularSplitModule } from 'angular-split';
import { SubSink } from 'subsink';
import {
  AppActions,
  PlanningActions,
  SimulationActions,
  TimelineActions,
} from '../../actions';
import { RootState } from '../../app-store';
import {
  ActivityInstancesTableModule,
  ActivityTypeListModule,
  CreateActivityInstanceFormModule,
  PanelHeaderModule,
  PlaceholderModule,
  SimulationControlsModule,
  TimeControlsModule,
  ToolbarModule,
  UpdateActivityInstanceFormModule,
} from '../../components';
import { MaterialModule } from '../../material';
import {
  getActivityInstancesForSelectedPlan,
  getActivityTypes,
  getActivityTypesMap,
  getCreateActivityInstanceError,
  getScheduleBands,
  getSelectedActivityInstance,
  getSelectedPlan,
  getStateBands,
  getUpdateActivityInstanceError,
} from '../../selectors';
import {
  Band,
  CActivityInstance,
  CActivityType,
  CActivityTypeMap,
  CPlan,
  SActivityInstance,
  UpdateActivityInstance,
} from '../../types';
import { TimelineModule } from '../timeline/timeline.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plan',
  styleUrls: ['./plan.component.css'],
  templateUrl: './plan.component.html',
})
export class PlanComponent implements OnDestroy {
  activityInstances: CActivityInstance[] | null = null;
  activityTypes: CActivityType[] | null = null;
  activityTypesMap: CActivityTypeMap | null = null;
  createActivityInstanceError: string | null = null;
  drawer = {
    activityTypes: {
      visible: true,
    },
    createActivityInstance: {
      visible: false,
    },
    selectedActivityInstance: {
      visible: false,
    },
  };
  drawerVisible = true;
  plan: CPlan | null = null;
  scheduleBands: Band[];
  selectedActivityInstance: CActivityInstance | null = null;
  stateBands: Band[];
  updateActivityInstanceError: string | null = null;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private route: ActivatedRoute,
    private store: Store<RootState>,
  ) {
    this.subs.add(
      this.store
        .pipe(select(getActivityInstancesForSelectedPlan))
        .subscribe(activityInstances => {
          this.activityInstances = activityInstances;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getActivityTypes)).subscribe(activityTypes => {
        this.activityTypes = activityTypes;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getActivityTypesMap))
        .subscribe(activityTypesMap => {
          this.activityTypesMap = activityTypesMap;
          this.cdRef.markForCheck();
        }),
      this.store
        .pipe(select(getCreateActivityInstanceError))
        .subscribe(createActivityInstanceError => {
          this.createActivityInstanceError = createActivityInstanceError;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getScheduleBands)).subscribe(scheduleBands => {
        this.scheduleBands = scheduleBands;
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
      this.store.pipe(select(getStateBands)).subscribe(stateBands => {
        this.stateBands = stateBands;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getUpdateActivityInstanceError))
        .subscribe(updateActivityInstanceError => {
          this.updateActivityInstanceError = updateActivityInstanceError;
          this.cdRef.markForCheck();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onCreateActivityInstance(activityInstance: SActivityInstance): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.createActivityInstance({ planId, activityInstance }),
    );
  }

  onDeleteActivityInstance(activityInstanceId: string): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.deleteActivityInstance({ planId, activityInstanceId }),
    );
  }

  onResize(): void {
    this.store.dispatch(AppActions.resize());
  }

  onRestore(): void {
    this.store.dispatch(TimelineActions.restoreViewTimeRange());
  }

  onSelectActivityInstance(activityInstance: CActivityInstance): void {
    this.store.dispatch(
      PlanningActions.setSelectedActivityInstanceId({
        selectedActivityInstanceId: activityInstance.id,
      }),
    );
  }

  onSimulationClear(): void {
    this.store.dispatch(SimulationActions.clear());
  }

  onSimulationRun(): void {
    this.store.dispatch(SimulationActions.run());
  }

  onUpdateActivityInstance(update: UpdateActivityInstance): void {
    const { id: planId } = this.route.snapshot.params;
    const { activityInstanceId, activityInstance } = update;
    this.store.dispatch(
      PlanningActions.updateActivityInstance({
        activityInstance,
        activityInstanceId,
        planId,
      }),
    );
  }

  onZoomIn(): void {
    this.store.dispatch(TimelineActions.zoomInViewTimeRange());
  }

  onZoomOut(): void {
    this.store.dispatch(TimelineActions.zoomOutViewTimeRange());
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
}

@NgModule({
  declarations: [PlanComponent],
  exports: [PlanComponent],
  imports: [
    CommonModule,
    MaterialModule,
    AngularSplitModule.forChild(),
    ActivityInstancesTableModule,
    ActivityTypeListModule,
    CreateActivityInstanceFormModule,
    PanelHeaderModule,
    PlaceholderModule,
    SimulationControlsModule,
    TimeControlsModule,
    TimelineModule,
    ToolbarModule,
    UpdateActivityInstanceFormModule,
  ],
})
export class PlanModule {}
