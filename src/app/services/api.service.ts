import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import omit from 'lodash-es/omit';
import { Observable, Observer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { simulationResultsToBands } from '../functions';
import {
  Adaptation,
  Band,
  CActivityInstanceMap,
  CActivityInstanceParameterMap,
  CActivityTypeMap,
  CActivityTypeParameter,
  CPlan,
  CreateAdaptation,
  CreateAdaptationResponse,
  CreatePlan,
  CreatePlanResponse,
  DeleteAdaptationResponse,
  DeletePlanResponse,
  Plan,
  SActivityInstance,
  SActivityInstanceMap,
  SActivityTypeMap,
  SimulationResults,
  SPlan,
  StringTMap,
} from '../types';
import * as gql from './gql';

const { adaptationServiceBaseUrl, planServiceBaseUrl } = environment;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private apollo: Apollo, private http: HttpClient) {}

  getActivityInstances(planId: string): Observable<CActivityInstanceMap> {
    return this.http
      .get<SActivityInstanceMap>(
        `${planServiceBaseUrl}/plans/${planId}/activity_instances`,
      )
      .pipe(
        map((sActivityInstanceMap: SActivityInstanceMap) => {
          return Object.keys(sActivityInstanceMap).reduce(
            (cActivityInstanceMap: CActivityInstanceMap, id: string) => {
              const { parameters } = sActivityInstanceMap[id];

              cActivityInstanceMap[id] = {
                ...sActivityInstanceMap[id],
                id,
                parameters: Object.keys(parameters).reduce(
                  (
                    cActivityInstanceParameterMap: CActivityInstanceParameterMap,
                    name: string,
                  ) => {
                    cActivityInstanceParameterMap[name] = {
                      name,
                      value: parameters[name],
                    };

                    return cActivityInstanceParameterMap;
                  },
                  {},
                ),
              };

              return cActivityInstanceMap;
            },
            {},
          );
        }),
      );
  }

  getPlanAndActivityTypes(
    planId: string,
  ): Observable<{ activityTypes: CActivityTypeMap; plan: CPlan }> {
    return this.http.get<SPlan>(`${planServiceBaseUrl}/plans/${planId}`).pipe(
      switchMap((sPlan: SPlan) => {
        const plan = {
          ...omit(sPlan, 'activityInstances'),
          activityInstanceIds: Object.keys(sPlan.activityInstances),
          id: planId,
        };

        return this.http
          .get<SActivityTypeMap>(
            `${adaptationServiceBaseUrl}/adaptations/${plan.adaptationId}/activities`,
          )
          .pipe(
            map((sActivityTypeMap: SActivityTypeMap) => {
              const activityTypes = Object.keys(sActivityTypeMap).reduce(
                (
                  cActivityTypeMap: CActivityTypeMap,
                  activityTypeName: string,
                ) => {
                  const { defaults, parameters } = sActivityTypeMap[
                    activityTypeName
                  ];

                  cActivityTypeMap[activityTypeName] = {
                    name: activityTypeName,
                    parameters: Object.keys(parameters).reduce(
                      (
                        cActivityTypeParameters: CActivityTypeParameter[],
                        parameterName: string,
                      ) => {
                        const { type } = parameters[parameterName];

                        cActivityTypeParameters.push({
                          default: defaults[parameterName],
                          name: parameterName,
                          type,
                        });

                        return cActivityTypeParameters;
                      },
                      [],
                    ),
                  };

                  return cActivityTypeMap;
                },
                {},
              );

              return { activityTypes, plan };
            }),
          );
      }),
    );
  }

  getAdaptations(): Observable<Adaptation[]> {
    return this.apollo
      .query<{ adaptations: Adaptation[] }>({
        fetchPolicy: 'no-cache',
        query: gql.GET_ADAPTATIONS,
      })
      .pipe(map(({ data: { adaptations } }) => adaptations));
  }

  createActivityInstances(
    planId: string,
    activityInstances: SActivityInstance[],
  ): Observable<string[]> {
    return this.http.post<string[]>(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances`,
      activityInstances,
    );
  }

  createAdaptation(
    adaptation: CreateAdaptation,
  ): Observable<CreateAdaptationResponse> {
    return this.apollo
      .mutate<{ createAdaptation: CreateAdaptationResponse }>({
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

  createPlan(plan: CreatePlan): Observable<CreatePlanResponse> {
    return this.apollo
      .mutate<{ createPlan: CreatePlanResponse }>({
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
  ): Observable<{}> {
    return this.http.delete(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances/${activityInstanceId}`,
    );
  }

  deleteAdaptation(id: string): Observable<DeleteAdaptationResponse> {
    return this.apollo
      .mutate<{ deleteAdaptation: DeleteAdaptationResponse }>({
        fetchPolicy: 'no-cache',
        mutation: gql.DELETE_ADAPTATION,
        variables: { id },
      })
      .pipe(map(({ data: { deleteAdaptation } }) => deleteAdaptation));
  }

  deletePlan(id: string): Observable<DeletePlanResponse> {
    return this.apollo
      .mutate<{ deletePlan: DeletePlanResponse }>({
        fetchPolicy: 'no-cache',
        mutation: gql.DELETE_PLAN,
        variables: { id },
      })
      .pipe(map(({ data: { deletePlan } }) => deletePlan));
  }

  getPlansAndAdaptations(): Observable<{
    adaptations: Adaptation[];
    plans: Plan[];
  }> {
    return this.apollo
      .query<{ adaptations: Adaptation[]; plans: Plan[] }>({
        fetchPolicy: 'no-cache',
        query: gql.GET_PLANS_AND_ADAPTATIONS,
      })
      .pipe(map(({ data }) => data));
  }

  getPlan(planId: string): Observable<CPlan> {
    return this.http.get<SPlan>(`${planServiceBaseUrl}/plans/${planId}`).pipe(
      map((sPlan: SPlan) => {
        return {
          ...omit(sPlan, 'activityInstances'),
          activityInstanceIds: Object.keys(sPlan.activityInstances),
          id: planId,
        };
      }),
    );
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

  simulationRun(): Observable<StringTMap<Band>> {
    return this.http
      .get<SimulationResults>(`./assets/simulation-results.json`)
      .pipe(
        map(simulationResults => simulationResultsToBands(simulationResults)),
      );
  }

  updateActivityInstance(
    planId: string,
    activityInstanceId: string,
    activityInstance: Partial<SActivityInstance>,
  ): Observable<{}> {
    return this.http.patch<{}>(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances/${activityInstanceId}`,
      activityInstance,
    );
  }
}
