import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  NgModule,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { AngularSplitModule, SplitComponent } from 'angular-split';
import { SubSink } from 'subsink';
import { AppActions, PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import {
  ActivityInstanceFormModule,
  ActivityTypeListModule,
  CodeMirrorModule,
  ConstraintEditorModule,
  ConstraintListModule,
  HeaderModule,
  PlaceholderModule,
  TableModule,
  TimelineModule,
  ToolbarModule,
} from '../../components';
import { AERIE_USER } from '../../constants';
import { getViewText } from '../../functions';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import {
  getActivityInstances,
  getActivityInstancesMap,
  getActivityTypes,
  getAdaptationConstraints,
  getAdaptationId,
  getConstraintViolations,
  getMaxTimeRange,
  getSelectedActivityInstance,
  getSelectedPlan,
  getSimulationOutOfDate,
  getViewTimeRange,
  getViewWithPoints,
} from '../../selectors';
import {
  ActivityInstance,
  ActivityType,
  Constraint,
  ConstraintViolation,
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
  User,
  VerticalGuide,
  VerticalGuideEvent,
  View,
  ViewSection,
  ViewSectionMenuItem,
} from '../../types';

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
  adaptationConstraints: Constraint[] | null = null;
  adaptationId = '';
  constraintViolations: ConstraintViolation[] = [];
  drawer = {
    activityDictionary: {
      visible: true,
    },
    constraintEditor: {
      visible: false,
    },
    constraintList: {
      visible: false,
    },
    constraintViolations: {
      visible: false,
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
  };
  editingConstraint: Constraint | null = null;
  maxTimeRange: TimeRange;
  plan: Plan | null = null;
  selectedActivityInstance: ActivityInstance | null = null;
  selectedActivityType: ActivityType | null = null;
  simulationOutOfDate = false;
  user: User;
  view: View | null;
  viewText: string;
  viewTimeRange: TimeRange;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
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
      this.store
        .pipe(select(getAdaptationConstraints))
        .subscribe(adaptationConstraints => {
          this.adaptationConstraints = adaptationConstraints;
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
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getMaxTimeRange)).subscribe(maxTimeRange => {
        this.maxTimeRange = maxTimeRange;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getViewWithPoints)).subscribe(view => {
        this.view = view;
        this.viewText = getViewText(view);
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
      this.store.pipe(select(getViewTimeRange)).subscribe(viewTimeRange => {
        this.viewTimeRange = viewTimeRange;
        this.cdRef.markForCheck();
      }),
    );
    this.user = JSON.parse(localStorage.getItem(AERIE_USER));
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const { key, metaKey } = event;
    if (metaKey && key === 'e') {
      event.preventDefault();
      this.onEditView();
    }
    if (metaKey && key === 's') {
      event.preventDefault();
      this.onSimulate();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onCancel(): void {
    this.showDrawerType('activityDictionary');
  }

  onConstraintList() {
    this.showDrawerType('constraintList');
    this.onResize();
  }

  onConstraintViolations() {
    if (this.constraintViolations && this.constraintViolations.length) {
      this.showDrawerType('constraintViolations');
      this.onResize();
    }
  }

  onCreateActivityInstance(activityInstance: CreateActivityInstance): void {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(
      PlanningActions.createActivityInstance({ activityInstance, planId }),
    );
  }

  onCreateConstraint() {
    this.editingConstraint = null;
    this.showDrawerType('constraintEditor');
    this.onResize();
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

  onDeleteConstraint(constraint: Constraint) {
    const { name: constraintName } = constraint;
    this.store.dispatch(PlanningActions.deleteConstraint({ constraintName }));
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

  onEditConstraint(constraint: Constraint) {
    this.editingConstraint = constraint;
    this.showDrawerType('constraintEditor');
    this.onResize();
  }

  onEditView() {
    this.showDrawerType('viewEditor');
    this.onResize();
  }

  onLoadView(): void {
    this.store.dispatch(PlanningActions.openLoadViewDialog());
  }

  onResize(): void {
    this.store.dispatch(AppActions.resize());
  }

  onSaveAsView(): void {
    this.store.dispatch(PlanningActions.openSaveAsViewDialog());
  }

  onSaveConstraintEditor(constraint: Constraint) {
    this.store.dispatch(PlanningActions.updateConstraint({ constraint }));
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

  onSaveView(): void {
    this.store.dispatch(PlanningActions.saveView());
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

  onSimulate() {
    const { id: planId } = this.route.snapshot.params;
    this.store.dispatch(PlanningActions.runSimulation({ planId }));
  }

  onViewTextChanged(view: View): void {
    this.store.dispatch(
      PlanningActions.updateView({
        id: this.view.id,
        view,
      }),
    );
    this.onResize();
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

  onViewSectionMenuAction(item: ViewSectionMenuItem) {
    const { action, data } = item;
    if (action === 'link' && data && data.url) {
      window.open(data.url, '_blank');
    }
    if (action === 'restore') {
      this.store.dispatch(PlanningActions.restoreViewTimeRange());
    }
    if (action === 'simulate') {
      this.onSimulate();
    }
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
    CodeMirrorModule,
    FormsModule,
    MaterialModule,
    AngularSplitModule,
    ActivityInstanceFormModule,
    ActivityTypeListModule,
    ConstraintEditorModule,
    ConstraintListModule,
    HeaderModule,
    PipesModule,
    PlaceholderModule,
    TableModule,
    TimelineModule,
    ToolbarModule,
  ],
})
export class PlanModule {}
