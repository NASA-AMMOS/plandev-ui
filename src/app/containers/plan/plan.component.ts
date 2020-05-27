import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgModule,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { IOutputData } from 'angular-split/lib/interface';
import { SubSink } from 'subsink';
import {
  AppActions,
  GuideActions,
  PlanningActions,
  SimulationActions,
} from '../../actions';
import { RootState } from '../../app-store';
import {
  ActivityInstancesTableModule,
  ActivityTypeListModule,
  PanelCollapsedModule,
  PanelEmptyModule,
  PanelHeaderModule,
  PlaceholderModule,
  SimulationControlsModule,
  TimeControlsModule,
  ToolbarModule,
} from '../../components';
import { MaterialModule } from '../../material';
import {
  getActivityInstances,
  getActivityTypes,
  getMaxTimeRange,
  getScheduleBands,
  getSelectedActivityInstance,
  getSelectedPlan,
  getSimulationRunning,
  getStateBands,
  getVerticalGuides,
  getViewTimeRange,
} from '../../selectors';
import {
  ActivityInstance,
  ActivityType,
  Band,
  CreateActivityInstance,
  Guide,
  Panel,
  Plan,
  TimeRange,
  UpdateActivityInstance,
} from '../../types';
import { TimelineModule } from '../timeline/timeline.component';
import { UpsertActivityInstanceFormModule } from '../upsert-activity-instance-form/upsert-activity-instance-form.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plan',
  styleUrls: ['./plan.component.css'],
  templateUrl: './plan.component.html',
})
export class PlanComponent implements AfterViewInit, OnDestroy {
  @ViewChild('verticalSplitAreas', { static: true })
  verticalSplitAreas: SplitComponent;

  activityInstances: ActivityInstance[] | null = null;
  activityTypes: ActivityType[] | null = null;
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
  };
  drawerVisible = true;
  maxTimeRange: TimeRange;
  panels: Panel[] = [
    {
      id: 'panel-schedule',
      minSize: 1.7,
      size: 33.3,
      template: 'schedule',
      type: 'timeline',
      virtualSize: 33.3,
    },
    {
      id: 'panel-simulation',
      minSize: 1.7,
      size: 33.3,
      template: 'simulation',
      type: 'timeline',
      virtualSize: 33.3,
    },
    {
      id: 'panel-table',
      minSize: 1.7,
      size: 33.3,
      template: 'table',
      type: 'table',
      virtualSize: 33.3,
    },
  ];
  plan: Plan | null = null;
  scheduleBands: Band[];
  selectedActivityInstance: ActivityInstance | null = null;
  selectedActivityType: ActivityType | null = null;
  simulationRunning = false;
  stateBands: Band[];
  verticalGuides: Guide[];
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
      this.store.pipe(select(getActivityTypes)).subscribe(activityTypes => {
        this.activityTypes = activityTypes;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store
        .pipe(select(getSimulationRunning))
        .subscribe(simulationRunning => {
          this.simulationRunning = simulationRunning;
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
      this.store.pipe(select(getVerticalGuides)).subscribe(verticalGuides => {
        this.verticalGuides = verticalGuides;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getViewTimeRange)).subscribe(viewTimeRange => {
        this.viewTimeRange = viewTimeRange;
        this.cdRef.markForCheck();
      }),
    );

    // TODO: Remove.
    this.store.dispatch(
      GuideActions.addOne({
        guide: {
          id: 'vertical-guide-0',
          label: { text: 'Guide 0000000000000000000000' },
          timestamp: '2020-001T00:00:11',
          type: 'vertical',
        },
      }),
    );
    this.store.dispatch(
      GuideActions.addOne({
        guide: {
          id: 'vertical-guide-1',
          label: { text: 'Guide 1' },
          timestamp: '2020-001T00:00:23',
          type: 'vertical',
        },
      }),
    );
    this.store.dispatch(
      GuideActions.addOne({
        guide: {
          id: 'vertical-guide-2',
          label: { text: 'Guide 2' },
          timestamp: '2020-001T00:00:42',
          type: 'vertical',
        },
      }),
    );
    this.store.dispatch(
      GuideActions.addOne({
        guide: {
          id: 'vertical-guide-3',
          label: { text: 'Guide 3' },
          timestamp: '2020-001T00:00:52',
          type: 'vertical',
        },
      }),
    );
  }

  ngAfterViewInit(): void {
    this.subs.add(
      this.verticalSplitAreas.dragProgress$.subscribe(({ sizes }) => {
        this.ngZone.run(() => {
          sizes.forEach((size: number, i: number) => {
            this.panels[i].virtualSize = size;
          });
          this.cdRef.markForCheck();
        });
      }),
    );
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
    this.store.dispatch(PlanningActions.restoreViewTimeRange());
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

  onSimulationRun(): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(SimulationActions.run({ planId }));
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

  trackByPanels(_: number, panel: Panel): string {
    return panel.id;
  }

  /**
   * This function collapses panels if they are below a certain percentage threshold.
   * After collapsing we ensure all panel percentages add to 100% or angular-split
   * does not work properly.
   * @note this function will need to be updated when more than 3 panels are added to the page.
   * @see https://github.com/bertrandg/angular-split/blob/master/projects/angular-split/src/lib/component/split.component.ts#L348
   */
  tryToCollapsePanels(outputData: IOutputData): void {
    const { gutterNum } = outputData;
    const collapseThreshold = 13;
    const collapseSize = 1.7;

    const sizes = outputData.sizes as number[];
    const newSizes = [...sizes] as number[];

    for (let i = 0; i < this.panels.length; ++i) {
      if (sizes[i] !== collapseSize && sizes[i] < collapseThreshold) {
        const first = 0;
        const last = this.panels.length - 1;

        if (gutterNum === 1) {
          if (i === first) {
            let next = first + 1;
            newSizes[first] = collapseSize;
            newSizes[next] = sizes[next] + (sizes[first] - collapseSize);

            for (; next < newSizes.length; ++next) {
              if (
                newSizes[next] < collapseThreshold &&
                newSizes[next + 1] !== undefined
              ) {
                newSizes[next] = collapseSize;
                newSizes[next + 1] =
                  sizes[next + 1] + (sizes[first] - collapseSize);
              }
            }
          } else {
            newSizes[i] = collapseSize;
            newSizes[first] = sizes[first] + (sizes[i] - collapseSize);
          }
        }

        if (gutterNum === 2) {
          if (i === last) {
            let prev = last - 1;
            newSizes[last] = collapseSize;
            newSizes[prev] = sizes[prev] + (sizes[last] - collapseSize);

            for (; prev >= 0; --prev) {
              if (
                newSizes[prev] < collapseThreshold &&
                newSizes[prev - 1] !== undefined
              ) {
                newSizes[prev] = collapseSize;
                newSizes[prev - 1] =
                  sizes[prev - 1] + (sizes[last] - collapseSize);
              }
            }
          } else {
            newSizes[i] = collapseSize;
            newSizes[last] = sizes[last] + (sizes[i] - collapseSize);
          }
        }
      }
    }

    const totalNewSizes = newSizes.reduce((sum, size) => (sum += size));
    if (totalNewSizes > 99.9 && totalNewSizes < 100.1) {
      this.panels.forEach((panel, i) => {
        panel.size = newSizes[i];
        panel.virtualSize = newSizes[i];
      });
      this.verticalSplitAreas.setVisibleAreaSizes(newSizes);
    } else {
      console.error('the total of new sizes is not between 99.9 and 100.1');
      console.error(`totalNewSizes: ${totalNewSizes}`);
      console.error('sizes: ', sizes);
      console.error('newSizes: ', newSizes);
    }

    this.onResize();
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
    PanelCollapsedModule,
    PanelEmptyModule,
    PanelHeaderModule,
    PlaceholderModule,
    SimulationControlsModule,
    TimeControlsModule,
    TimelineModule,
    ToolbarModule,
    UpsertActivityInstanceFormModule,
  ],
})
export class PlanModule {}
