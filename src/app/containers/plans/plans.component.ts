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
  HeaderModule,
  PlaceholderModule,
  PlansTableModule,
  ToolbarModule,
} from '../../components';
import { doyTimestampValidator } from '../../functions';
import { MaterialModule } from '../../material';
import { getAdaptations, getPlans } from '../../selectors';
import { Adaptation, CreatePlan, Plan } from '../../types';

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
  invalidConfigJson: string | null = null;
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
      configuration: null,
      endTimestamp: ['', [Validators.required, doyTimestampValidator]],
      name: ['', Validators.required],
      startTimestamp: ['', [Validators.required, doyTimestampValidator]],
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

  async fileToJSON(file: File) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = _ => {
        try {
          const json = JSON.parse(fileReader.result as string);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      fileReader.onerror = error => reject(error);
      fileReader.readAsText(file);
    });
  }

  onDeletePlan(id: string) {
    this.store.dispatch(PlanningActions.deletePlan({ id }));
  }

  async onFileChange(event: Event) {
    this.invalidConfigJson = null;
    const input = event.target as HTMLInputElement;
    if (input.files.length) {
      try {
        const file = input.files.item(0);
        const configuration = await this.fileToJSON(file);
        this.createPlanForm.patchValue({
          configuration,
        });
      } catch (error) {
        console.error(error);
        this.invalidConfigJson = error.message;
        this.cdRef.markForCheck();
      }
    }
  }

  onOpenPlan(id: string) {
    this.router.navigateByUrl(`/plans/${id}`);
  }

  onSubmit() {
    if (this.createPlanForm.valid) {
      const plan: CreatePlan = { ...this.createPlanForm.value };
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
    AngularSplitModule,
    HeaderModule,
    PlaceholderModule,
    PlansTableModule,
    ToolbarModule,
  ],
})
export class PlansModule {}
