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
import { AppActions, PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
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
  panels = {
    bottom: {
      height: 200,
      order: 1,
      size: 30,
      visible: true,
    },
    middle: {
      height: 200,
      order: 1,
      size: 30,
      visible: true,
    },
    top: {
      height: 200,
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
    this.setPanelHeights();
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

  onOpenedChange(): void {
    this.store.dispatch(AppActions.resize());
  }

  onResize(): void {
    this.store.dispatch(AppActions.resize());
    this.setPanelHeights();
  }

  onSelectActivityInstance(activityInstance: CActivityInstance): void {
    this.store.dispatch(
      PlanningActions.setSelectedActivityInstanceId({
        selectedActivityInstanceId: activityInstance.id,
      }),
    );
    this.showDrawerType('selectedActivityInstance');
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
    this.setPanelHeights();
  }

  setPanelHeights() {
    const panelTop = this.elRef.nativeElement.querySelector('.panel-top');
    const panelBottom = this.elRef.nativeElement.querySelector('.panel-bottom');

    if (panelTop) {
      this.panels.top.height = panelTop.clientHeight;
    }

    if (panelBottom) {
      this.panels.bottom.height = panelBottom.clientHeight;
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
    this.drawerVisible = true;
  }

  togglePanelVisible(panel: string): void {
    this.panels[panel].visible = !this.panels[panel].visible;
  }
}
