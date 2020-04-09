import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import {
  activityInstanceId,
  adaptationId,
  adaptations,
  cActivityInstanceMap,
  cActivityTypeMap,
  cPlan,
  getSimulationRunBands,
  planId,
  plans,
} from '../mocks';
import {
  Adaptation,
  Band,
  CActivityInstanceMap,
  CActivityTypeMap,
  CPlan,
  CreateAdaptationResponse,
  CreatePlanResponse,
  DeleteAdaptationResponse,
  DeletePlanResponse,
  Plan,
  StringTMap,
} from '../types';

@Injectable()
export class ApiMockService {
  getActivityInstances(): Observable<CActivityInstanceMap> {
    return new Observable((o: Observer<CActivityInstanceMap>) => {
      o.next(cActivityInstanceMap);
      o.complete();
    });
  }

  getPlanAndActivityTypes(): Observable<{
    activityTypes: CActivityTypeMap;
    plan: CPlan;
  }> {
    return new Observable(
      (o: Observer<{ activityTypes: CActivityTypeMap; plan: CPlan }>) => {
        o.next({
          activityTypes: cActivityTypeMap,
          plan: cPlan,
        });
        o.complete();
      },
    );
  }

  getAdaptations(): Observable<Adaptation[]> {
    return new Observable((o: Observer<Adaptation[]>) => {
      o.next(adaptations);
      o.complete();
    });
  }

  createActivityInstances(): Observable<string[]> {
    return new Observable((o: Observer<string[]>) => {
      o.next([activityInstanceId]);
      o.complete();
    });
  }

  createAdaptation(): Observable<CreateAdaptationResponse> {
    return new Observable((o: Observer<CreateAdaptationResponse>) => {
      o.next({
        id: adaptationId,
        message: 'Adaptation created successfully',
        success: true,
      });
      o.complete();
    });
  }

  createPlan(): Observable<CreatePlanResponse> {
    return new Observable((o: Observer<CreatePlanResponse>) => {
      o.next({
        id: planId,
        message: 'Plan created successfully',
        success: true,
      });
      o.complete();
    });
  }

  deleteActivityInstance(): Observable<{}> {
    return new Observable((o: Observer<{}>) => {
      o.next({});
      o.complete();
    });
  }

  deleteAdaptation(): Observable<DeleteAdaptationResponse> {
    return new Observable((o: Observer<DeleteAdaptationResponse>) => {
      o.next({ message: 'Adaptation deleted successfully', success: true });
      o.complete();
    });
  }

  deletePlan(): Observable<DeletePlanResponse> {
    return new Observable((o: Observer<DeletePlanResponse>) => {
      o.next({ message: 'Plan deleted successfully', success: true });
      o.complete();
    });
  }

  getPlansAndAdaptations(): Observable<{
    adaptations: Adaptation[];
    plans: Plan[];
  }> {
    return new Observable(
      (
        o: Observer<{
          adaptations: Adaptation[];
          plans: Plan[];
        }>,
      ) => {
        o.next({ adaptations, plans });
        o.complete();
      },
    );
  }

  getPlan(): Observable<CPlan> {
    return new Observable((o: Observer<CPlan>) => {
      o.next(cPlan);
      o.complete();
    });
  }

  simulationRun(): Observable<StringTMap<Band>> {
    const stateBands = getSimulationRunBands();
    return new Observable((o: Observer<StringTMap<Band>>) => {
      o.next(stateBands);
      o.complete();
    });
  }
}
