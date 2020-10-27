import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AERIE_USER } from '../constants';
import * as types from '../types';
import { User } from '../types';
import * as gql from './gql';

const { aerieApolloServerUrl } = environment;

function getAuthorization() {
  const item: string | null = localStorage.getItem(AERIE_USER);
  if (item !== null) {
    const user: User = JSON.parse(item);
    return user.ssoCookieValue;
  }
  return '';
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  createActivityInstances(
    planId: string,
    activityInstances: types.CreateActivityInstance[],
  ): Observable<types.CreateActivityInstancesResponse> {
    const body = {
      query: gql.CREATE_ACTIVITY_INSTANCES,
      variables: {
        activityInstances,
        planId,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: {
          createActivityInstances: types.CreateActivityInstancesResponse;
        };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { createActivityInstances } }) => {
          if (!createActivityInstances.success) {
            throw new Error(createActivityInstances.message);
          }
          return createActivityInstances;
        }),
      );
  }

  createAdaptation(
    adaptation: types.CreateAdaptation,
  ): Observable<types.CreateAdaptationResponse> {
    const { file } = adaptation;
    const fileMap = {
      file: ['variables.file'],
    };
    const operations = {
      query: gql.CREATE_ADAPTATION,
      variables: {
        file: null,
        mission: adaptation.mission,
        name: adaptation.name,
        owner: adaptation.owner,
        version: adaptation.version,
      },
    };

    // Form append order matters here!
    const body = new FormData();
    body.append('operations', JSON.stringify(operations));
    body.append('map', JSON.stringify(fileMap));
    body.append('file', file, file.name);

    const options = {
      headers: { authorization: getAuthorization() },
    };

    return this.http
      .post<{ data: { createAdaptation: types.CreateAdaptationResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(
        map(({ data: { createAdaptation } }) => {
          if (!createAdaptation.success) {
            throw new Error(createAdaptation.message);
          }
          return createAdaptation;
        }),
      );
  }

  createPlan(plan: types.CreatePlan): Observable<types.CreatePlanResponse> {
    const body = {
      query: gql.CREATE_PLAN,
      variables: {
        adaptationId: plan.adaptationId,
        endTimestamp: plan.endTimestamp,
        name: plan.name,
        startTimestamp: plan.startTimestamp,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { createPlan: types.CreatePlanResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(
        map(({ data: { createPlan } }) => {
          if (!createPlan.success) {
            throw new Error(createPlan.message);
          }
          return createPlan;
        }),
      );
  }

  deleteActivityInstance(
    planId: string,
    activityInstanceId: string,
  ): Observable<types.DeleteActivityInstanceResponse> {
    const body = {
      query: gql.DELETE_ACTIVITY_INSTANCE,
      variables: { activityInstanceId, planId },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: { deleteActivityInstance: types.DeleteActivityInstanceResponse };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { deleteActivityInstance } }) => {
          if (!deleteActivityInstance.success) {
            throw new Error(deleteActivityInstance.message);
          }
          return deleteActivityInstance;
        }),
      );
  }

  deleteAdaptation(id: string): Observable<types.DeleteAdaptationResponse> {
    const body = {
      query: gql.DELETE_ADAPTATION,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { deleteAdaptation: types.DeleteAdaptationResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(
        map(({ data: { deleteAdaptation } }) => {
          if (!deleteAdaptation.success) {
            throw new Error(deleteAdaptation.message);
          }
          return deleteAdaptation;
        }),
      );
  }

  deletePlan(id: string): Observable<types.DeletePlanResponse> {
    const body = {
      query: gql.DELETE_PLAN,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { deletePlan: types.DeletePlanResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(
        map(({ data: { deletePlan } }) => {
          if (!deletePlan.success) {
            throw new Error(deletePlan.message);
          }
          return deletePlan;
        }),
      );
  }

  getAdaptations(): Observable<types.Adaptation[]> {
    const body = {
      query: gql.GET_ADAPTATIONS,
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { adaptations: types.Adaptation[] } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { adaptations } }) => adaptations));
  }

  getPlanDetail(id: string): Observable<types.PlanDetail> {
    const body = {
      query: gql.GET_PLAN_DETAIL,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { plan: types.PlanDetail } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { plan } }) => plan));
  }

  getPlansAndAdaptations(): Observable<{
    adaptations: types.Adaptation[];
    plans: types.Plan[];
  }> {
    const body = {
      query: gql.GET_PLANS_AND_ADAPTATIONS,
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { adaptations: types.Adaptation[]; plans: types.Plan[] } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data }) => data));
  }

  getUiStates(): Observable<types.UiState[]> {
    const body = {
      query: gql.GET_UI_STATES,
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { uiStates: types.UiState[] } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { uiStates } }) => uiStates));
  }

  login(username: string, password: string) {
    const url = `${aerieApolloServerUrl}/auth/login`;
    return this.http
      .post<{ message: string; ssoCookieValue: string; success: boolean }>(
        url,
        { username, password },
      )
      .pipe(
        map(res => {
          if (res.success) {
            return res;
          } else {
            throw new Error(res.message);
          }
        }),
      );
  }

  logout() {
    const url = `${aerieApolloServerUrl}/auth/logout`;
    const ssoToken = getAuthorization();
    return this.http
      .post<{ message: string; success: boolean }>(url, { ssoToken })
      .pipe(
        map(res => {
          if (res.success) {
            return res;
          } else {
            throw new Error(res.message);
          }
        }),
      );
  }

  simulate(adaptationId: string, planId: string, samplingPeriod: number) {
    const body = {
      query: gql.SIMULATE,
      variables: { adaptationId, planId, samplingPeriod },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { simulate: types.SimulationResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(
        map(({ data: { simulate } }) => {
          if (!simulate.success) {
            throw new Error(simulate.message);
          }
          return simulate;
        }),
      );
  }

  updateActivityInstance(
    planId: string,
    activityInstance: types.UpdateActivityInstance,
  ): Observable<types.UpdateActivityInstanceResponse> {
    const body = {
      query: gql.UPDATE_ACTIVITY_INSTANCE,
      variables: {
        activityInstance,
        planId,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: { updateActivityInstance: types.UpdateActivityInstanceResponse };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { updateActivityInstance } }) => {
          if (!updateActivityInstance.success) {
            throw new Error(updateActivityInstance.message);
          }
          return updateActivityInstance;
        }),
      );
  }

  validateParameters(
    activityTypeName: string,
    adaptationId: string,
    parameters: types.ActivityInstanceParameter[],
  ): Observable<types.ValidationResponse> {
    const body = {
      query: gql.VALIDATE_PARAMETERS,
      variables: { activityTypeName, adaptationId, parameters },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { validateParameters: types.ValidationResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { validateParameters } }) => validateParameters));
  }
}
