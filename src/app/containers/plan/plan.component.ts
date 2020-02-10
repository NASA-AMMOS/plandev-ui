import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { EventActions, PlanningActions } from '../../actions';
import { AppState } from '../../app-store';
import {
  getActivityInstancesForSelectedPlan,
  getActivityTypes,
  getActivityTypesMap,
  getCreateActivityInstanceError,
  getSelectedActivityInstance,
  getSelectedPlan,
  getUpdateActivityInstanceError,
} from '../../selectors';
import {
  CActivityInstance,
  CActivityType,
  CActivityTypeMap,
  CPlan,
  SActivityInstance,
  UpdateActivityInstance,
} from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plan',
  styleUrls: ['./plan.component.css'],
  templateUrl: './plan.component.html',
})
export class PlanComponent implements AfterViewInit, OnDestroy {
  activityInstances: CActivityInstance[] | null = null;
  activityTypes: CActivityType[] | null = null;
  activityTypesMap: CActivityTypeMap | null = null;
  createActivityInstanceError: string | null = null;
  panels = {
    activityInstances: {
      order: 2,
      size: 50,
      visible: true,
    },
    activityTypes: {
      order: 0,
      size: 20,
      visible: true,
    },
    bottom: {
      height: 200,
      order: 1,
      size: 60,
      visible: true,
    },
    createActivityInstance: {
      order: 1,
      size: 20,
      visible: true,
    },
    selectedActivityInstance: {
      order: 3,
      size: 20,
      visible: true,
    },
    top: {
      order: 0,
      size: 40,
      visible: true,
    },
  };
  plan: CPlan | null = null;
  selectedActivityInstance: CActivityInstance | null = null;
  updateActivityInstanceError: string | null = null;

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private elRef: ElementRef,
    private route: ActivatedRoute,
    private store: Store<AppState>,
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
      this.store
        .pipe(select(getSelectedActivityInstance))
        .subscribe(selectedActivityInstance => {
          this.selectedActivityInstance = selectedActivityInstance;
          this.cdRef.markForCheck();
        }),
      this.store.pipe(select(getSelectedPlan)).subscribe(plan => {
        this.plan = plan;
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

  ngAfterViewInit() {
    this.setPanelBottomHeight();
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
    this.store.dispatch(EventActions.resize());
    this.setPanelBottomHeight();
  }

  onSelectActivityInstance(activityInstance: CActivityInstance): void {
    this.store.dispatch(
      PlanningActions.setSelectedActivityInstanceId({
        selectedActivityInstanceId: activityInstance.id,
      }),
    );
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

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.setPanelBottomHeight();
  }

  setPanelBottomHeight() {
    const panelBottom = this.elRef.nativeElement.querySelector('.panel-bottom');
    if (panelBottom) {
      this.panels.bottom.height = panelBottom.clientHeight;
    }
  }

  togglePanelVisible(panel: string): void {
    this.panels[panel].visible = !this.panels[panel].visible;
  }
}
