import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, Observer } from 'rxjs';
import { map } from 'rxjs/operators';
import { simulationResultsToBands } from '../functions';
import * as types from '../types';
import * as gql from './gql';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private apollo: Apollo, private http: HttpClient) {}

  createActivityInstances(
    planId: string,
    activityInstances: types.CreateActivityInstance[],
  ): Observable<types.CreateActivityInstancesResponse> {
    return this.apollo
      .mutate<{
        createActivityInstances: types.CreateActivityInstancesResponse;
      }>({
        fetchPolicy: 'no-cache',
        mutation: gql.CREATE_ACTIVITY_INSTANCES,
        variables: {
          activityInstances,
          planId,
        },
      })
      .pipe(
        map(({ data: { createActivityInstances } }) => createActivityInstances),
      );
  }

  createAdaptation(
    adaptation: types.CreateAdaptation,
  ): Observable<types.CreateAdaptationResponse> {
    return this.apollo
      .mutate<{ createAdaptation: types.CreateAdaptationResponse }>({
        context: {
          useMultipart: true,
        },
        fetchPolicy: 'no-cache',
        mutation: gql.CREATE_ADAPTATION,
        variables: {
          file: adaptation.file,
          mission: adaptation.mission,
          name: adaptation.name,
          owner: adaptation.owner,
          version: adaptation.version,
        },
      })
      .pipe(map(({ data: { createAdaptation } }) => createAdaptation));
  }

  createPlan(plan: types.CreatePlan): Observable<types.CreatePlanResponse> {
    return this.apollo
      .mutate<{ createPlan: types.CreatePlanResponse }>({
        fetchPolicy: 'no-cache',
        mutation: gql.CREATE_PLAN,
        variables: {
          adaptationId: plan.adaptationId,
          endTimestamp: plan.endTimestamp,
          name: plan.name,
          startTimestamp: plan.startTimestamp,
        },
      })
      .pipe(map(({ data: { createPlan } }) => createPlan));
  }

  deleteActivityInstance(
    planId: string,
    activityInstanceId: string,
  ): Observable<types.DeleteActivityInstanceResponse> {
    return this.apollo
      .mutate<{ deleteActivityInstance: types.DeleteActivityInstanceResponse }>(
        {
          fetchPolicy: 'no-cache',
          mutation: gql.DELETE_ACTIVITY_INSTANCE,
          variables: { activityInstanceId, planId },
        },
      )
      .pipe(
        map(({ data: { deleteActivityInstance } }) => deleteActivityInstance),
      );
  }

  deleteAdaptation(id: string): Observable<types.DeleteAdaptationResponse> {
    return this.apollo
      .mutate<{ deleteAdaptation: types.DeleteAdaptationResponse }>({
        fetchPolicy: 'no-cache',
        mutation: gql.DELETE_ADAPTATION,
        variables: { id },
      })
      .pipe(map(({ data: { deleteAdaptation } }) => deleteAdaptation));
  }

  deletePlan(id: string): Observable<types.DeletePlanResponse> {
    return this.apollo
      .mutate<{ deletePlan: types.DeletePlanResponse }>({
        fetchPolicy: 'no-cache',
        mutation: gql.DELETE_PLAN,
        variables: { id },
      })
      .pipe(map(({ data: { deletePlan } }) => deletePlan));
  }

  getAdaptations(): Observable<types.Adaptation[]> {
    return this.apollo
      .query<{ adaptations: types.Adaptation[] }>({
        fetchPolicy: 'no-cache',
        query: gql.GET_ADAPTATIONS,
      })
      .pipe(map(({ data: { adaptations } }) => adaptations));
  }

  getPlanDetail(id: string): Observable<types.PlanDetail> {
    return this.apollo
      .query<{ plan: types.PlanDetail }>({
        fetchPolicy: 'no-cache',
        query: gql.GET_PLAN_DETAIL,
        variables: { id },
      })
      .pipe(map(({ data: { plan } }) => plan));
  }

  getPlansAndAdaptations(): Observable<{
    adaptations: types.Adaptation[];
    plans: types.Plan[];
  }> {
    return this.apollo
      .query<{ adaptations: types.Adaptation[]; plans: types.Plan[] }>({
        fetchPolicy: 'no-cache',
        query: gql.GET_PLANS_AND_ADAPTATIONS,
      })
      .pipe(map(({ data }) => data));
  }

  login(username: string, password: string): Observable<string> {
    return new Observable((o: Observer<string>) => {
      if (username === 'testuser' && password === '123456') {
        o.next('Login success');
        o.complete();
      } else {
        o.error('Login failed. Invalid username or password.');
      }
    });
  }

  logout(): Observable<string> {
    return new Observable((o: Observer<string>) => {
      o.next('Logout success');
      o.complete();
    });
  }

  simulationRun(): Observable<types.StringTMap<types.Band>> {
    return this.http
      .get<types.SimulationResults>(`./assets/simulation-results.json`)
      .pipe(
        map(simulationResults => simulationResultsToBands(simulationResults)),
      );
  }

  updateActivityInstance(
    planId: string,
    activityInstance: types.UpdateActivityInstance,
  ): Observable<types.UpdateActivityInstanceResponse> {
    return this.apollo
      .mutate<{ updateActivityInstance: types.UpdateActivityInstanceResponse }>(
        {
          fetchPolicy: 'no-cache',
          mutation: gql.UPDATE_ACTIVITY_INSTANCE,
          variables: {
            activityInstance,
            planId,
          },
        },
      )
      .pipe(
        map(({ data: { updateActivityInstance } }) => {
          if (!updateActivityInstance.success) {
            throw new Error(updateActivityInstance.message);
          }
          return updateActivityInstance;
        }),
      );
  }
}
