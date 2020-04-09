import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgModule,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { AngularSplitModule } from 'angular-split';
import { SubSink } from 'subsink';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import {
  PanelHeaderModule,
  PlaceholderModule,
  PlansTableModule,
  ToolbarModule,
} from '../../components';
import { MaterialModule } from '../../material';
import { getAdaptations, getPlans } from '../../selectors';
import { Adaptation, Plan, SPlan } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plans',
  styleUrls: ['./plans.component.css'],
  templateUrl: './plans.component.html',
})
export class PlansComponent implements AfterViewInit, OnDestroy {
  @ViewChild('inputCreatePlanName')
  inputCreatePlanName: ElementRef;

  adaptations: Adaptation[] | null = null;
  createPlanForm: FormGroup;
  plans: Plan[] | null = null;
  selectedAdaptationId = '';

  private subs = new SubSink();

  constructor(
    private cdRef: ChangeDetectorRef,
    private fb: FormBuilder,
    private router: Router,
    private store: Store<RootState>,
  ) {
    const currentNavigation = this.router.getCurrentNavigation();
    if (currentNavigation) {
      const { extras } = currentNavigation;
      const { state } = extras;
      if (extras && state && state.adaptationId) {
        this.selectedAdaptationId = state.adaptationId;
      }
    }

    this.createPlanForm = this.fb.group({
      adaptationId: [this.selectedAdaptationId, Validators.required],
      endTimestamp: ['', Validators.required],
      name: ['', Validators.required],
      startTimestamp: ['', Validators.required],
    });

    this.subs.add(
      this.store.pipe(select(getAdaptations)).subscribe(adaptations => {
        this.adaptations = adaptations;
        this.cdRef.markForCheck();
      }),
      this.store.pipe(select(getPlans)).subscribe(plans => {
        this.plans = plans;
        this.cdRef.markForCheck();
      }),
    );
  }

  ngAfterViewInit() {
    if (this.selectedAdaptationId !== '') {
      setTimeout(() => this.inputCreatePlanName.nativeElement.focus(), 0);
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  onDeletePlan(id: string) {
    this.store.dispatch(PlanningActions.deletePlan({ id }));
  }

  onOpenPlan(id: string) {
    this.router.navigate(['/plans', id]);
  }

  onSubmit() {
    if (this.createPlanForm.valid) {
      const plan: SPlan = { ...this.createPlanForm.value };
      this.store.dispatch(PlanningActions.createPlan({ plan }));
    }
  }
}

@NgModule({
  declarations: [PlansComponent],
  exports: [PlansComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule,
    AngularSplitModule.forChild(),
    PanelHeaderModule,
    PlaceholderModule,
    PlansTableModule,
    ToolbarModule,
  ],
})
export class PlansModule {}
