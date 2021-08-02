import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import omit from 'lodash-es/omit';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AERIE_USER } from '../constants';
import {
  Adaptation,
  Constraint,
  CreateActivityInstance,
  CreateActivityInstancesResponse,
  CreateAdaptation,
  CreateAdaptationResponse,
  CreatePlan,
  CreatePlanResponse,
  DeleteActivityInstanceResponse,
  DeleteAdaptationResponse,
  DeletePlanResponse,
  LoginResponse,
  LogoutResponse,
  Parameter,
  Plan,
  PlanDetail,
  SimulationResponse,
  UpdateActivityInstance,
  UpdateActivityInstanceResponse,
  UpdateConstraintsResponse,
  User,
  ValidationResponse,
  View,
} from '../types';
import * as gql from './gql';

const { aerieApolloServerUrl, aerieUiServerUrl } = environment;

function getAuthorization() {
  const item: string | null = localStorage.getItem(AERIE_USER);
  if (item !== null) {
    const user: User = JSON.parse(item);
    return user.ssoToken;
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
    activityInstances: CreateActivityInstance[],
  ): Observable<CreateActivityInstancesResponse> {
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
          createActivityInstances: CreateActivityInstancesResponse;
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
    adaptation: CreateAdaptation,
  ): Observable<CreateAdaptationResponse> {
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
      .post<{ data: { createAdaptation: CreateAdaptationResponse } }>(
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

  createPlan(plan: CreatePlan): Observable<CreatePlanResponse> {
    const body = {
      query: gql.CREATE_PLAN,
      variables: {
        adaptationId: plan.adaptationId,
        configuration: plan.configuration,
        endTimestamp: plan.endTimestamp,
        name: plan.name,
        startTimestamp: plan.startTimestamp,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { createPlan: CreatePlanResponse } }>(
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
  ): Observable<DeleteActivityInstanceResponse> {
    const body = {
      query: gql.DELETE_ACTIVITY_INSTANCE,
      variables: { activityInstanceId, planId },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: { deleteActivityInstance: DeleteActivityInstanceResponse };
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

  deleteAdaptation(id: string): Observable<DeleteAdaptationResponse> {
    const body = {
      query: gql.DELETE_ADAPTATION,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { deleteAdaptation: DeleteAdaptationResponse } }>(
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

  deleteAdaptationConstraints(
    adaptationId: string,
    names: string[],
  ): Observable<UpdateConstraintsResponse> {
    const body = {
      query: gql.DELETE_ADAPTATION_CONSTRAINTS,
      variables: {
        adaptationId,
        names,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: {
          deleteAdaptationConstraints: UpdateConstraintsResponse;
        };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { deleteAdaptationConstraints } }) => {
          if (!deleteAdaptationConstraints.success) {
            throw new Error(deleteAdaptationConstraints.message);
          }
          return deleteAdaptationConstraints;
        }),
      );
  }

  deletePlanConstraints(
    planId: string,
    names: string[],
  ): Observable<UpdateConstraintsResponse> {
    const body = {
      query: gql.DELETE_PLAN_CONSTRAINTS,
      variables: {
        names,
        planId,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: {
          deletePlanConstraints: UpdateConstraintsResponse;
        };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { deletePlanConstraints } }) => {
          if (!deletePlanConstraints.success) {
            throw new Error(deletePlanConstraints.message);
          }
          return deletePlanConstraints;
        }),
      );
  }

  deletePlan(id: string): Observable<DeletePlanResponse> {
    const body = {
      query: gql.DELETE_PLAN,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { deletePlan: DeletePlanResponse } }>(
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

  deleteView(id: string): Observable<any> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.delete(`${aerieUiServerUrl}/views/${id}`, options);
  }

  getAdaptations(): Observable<Adaptation[]> {
    const body = {
      query: gql.GET_ADAPTATIONS,
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { adaptations: Adaptation[] } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { adaptations } }) => adaptations));
  }

  getPlanDetail(id: string): Observable<PlanDetail> {
    const body = {
      query: gql.GET_PLAN_DETAIL,
      variables: { id },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { plan: PlanDetail } }>(aerieApolloServerUrl, body, options)
      .pipe(map(({ data: { plan } }) => plan));
  }

  getPlansAndAdaptations(): Observable<{
    adaptations: Adaptation[];
    plans: Plan[];
  }> {
    const body = {
      query: gql.GET_PLANS_AND_ADAPTATIONS,
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { adaptations: Adaptation[]; plans: Plan[] } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data }) => data));
  }

  getViewById(id: string): Observable<View> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.get<View>(`${aerieUiServerUrl}/views/${id}`, options);
  }

  getViewLatest(): Observable<View> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.get<View>(`${aerieUiServerUrl}/views/latest`, options);
  }

  getViews(): Observable<View[]> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.get<View[]>(`${aerieUiServerUrl}/views`, options);
  }

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(`${aerieUiServerUrl}/cam/login`, {
        password,
        username,
      })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message);
          }
          return response;
        }),
      );
  }

  logout() {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<LogoutResponse>(`${aerieUiServerUrl}/cam/logout`, {}, options)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message);
          }
          return response;
        }),
      );
  }

  saveAsView(view: Partial<View>): Observable<any> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.post(`${aerieUiServerUrl}/views`, view, options);
  }

  saveView(view: View): Observable<any> {
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http.put(`${aerieUiServerUrl}/views/${view.id}`, view, options);
  }

  simulate(adaptationId: string, planId: string) {
    const body = {
      query: gql.SIMULATE,
      variables: { adaptationId, planId },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { simulate: SimulationResponse } }>(
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
    activityInstance: UpdateActivityInstance,
  ): Observable<UpdateActivityInstanceResponse> {
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
        data: { updateActivityInstance: UpdateActivityInstanceResponse };
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

  updateAdaptationConstraints(
    adaptationId: string,
    constraints: Constraint[],
  ): Observable<UpdateConstraintsResponse> {
    const body = {
      query: gql.UPDATE_ADAPTATION_CONSTRAINTS,
      variables: {
        adaptationId,
        constraints: constraints.map(constraint =>
          omit(constraint, 'association'),
        ),
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: {
          updateAdaptationConstraints: UpdateConstraintsResponse;
        };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { updateAdaptationConstraints } }) => {
          if (!updateAdaptationConstraints.success) {
            throw new Error(updateAdaptationConstraints.message);
          }
          return updateAdaptationConstraints;
        }),
      );
  }

  updatePlanConstraints(
    planId: string,
    constraints: Constraint[],
  ): Observable<UpdateConstraintsResponse> {
    const body = {
      query: gql.UPDATE_PLAN_CONSTRAINTS,
      variables: {
        constraints: constraints.map(constraint =>
          omit(constraint, 'association'),
        ),
        planId,
      },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{
        data: {
          updatePlanConstraints: UpdateConstraintsResponse;
        };
      }>(aerieApolloServerUrl, body, options)
      .pipe(
        map(({ data: { updatePlanConstraints } }) => {
          if (!updatePlanConstraints.success) {
            throw new Error(updatePlanConstraints.message);
          }
          return updatePlanConstraints;
        }),
      );
  }

  validateParameters(
    activityTypeName: string,
    adaptationId: string,
    parameters: Parameter[],
  ): Observable<ValidationResponse> {
    const body = {
      query: gql.VALIDATE_PARAMETERS,
      variables: { activityTypeName, adaptationId, parameters },
    };
    const options = {
      headers: { authorization: getAuthorization() },
    };
    return this.http
      .post<{ data: { validateParameters: ValidationResponse } }>(
        aerieApolloServerUrl,
        body,
        options,
      )
      .pipe(map(({ data: { validateParameters } }) => validateParameters));
  }
}
