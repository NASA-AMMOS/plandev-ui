import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ApolloTestingController,
  ApolloTestingModule,
} from 'apollo-angular/testing';
import omit from 'lodash-es/omit';
import {
  activityInstance,
  activityInstanceId,
  adaptation,
  adaptationId,
  adaptations,
  plan,
  planDetail,
  planId,
  plans,
  simulationResponse,
  uiStates,
} from '../mocks';
import { CreatePlan } from '../types';
import { ApiService } from './api.service';
import * as gql from './gql';

describe('api service', () => {
  let apiService: ApiService;
  let apolloTestingController: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApolloTestingModule, HttpClientTestingModule],
    });
    apiService = TestBed.inject(ApiService);
    apolloTestingController = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => {
    apolloTestingController.verify();
  });

  describe('createActivityInstances', () => {
    it('succeeds', () => {
      const createActivityInstances = {
        ids: [activityInstanceId],
        message: 'Activity instances created successfully',
        success: true,
      };
      const newActivityInstance = omit(activityInstance, 'id');
      apiService
        .createActivityInstances(planId, [newActivityInstance])
        .subscribe(response => {
          expect(response).toEqual(createActivityInstances);
        });
      apolloTestingController
        .expectOne(gql.CREATE_ACTIVITY_INSTANCES)
        .flush({ data: { createActivityInstances } });
    });

    it('fails', () => {
      const createActivityInstances = {
        ids: null,
        message: 'Create activity instances failed',
        success: false,
      };
      const newActivityInstance = omit(activityInstance, 'id');
      apiService
        .createActivityInstances(planId, [newActivityInstance])
        .subscribe(
          () => {},
          error => {
            expect(error.message).toEqual(createActivityInstances.message);
          },
        );
      apolloTestingController
        .expectOne(gql.CREATE_ACTIVITY_INSTANCES)
        .flush({ data: { createActivityInstances } });
    });
  });

  describe('createAdaptation', () => {
    it('succeeds', () => {
      const createAdaptation = {
        id: adaptationId,
        message: 'Adaptation created successfully',
        success: true,
      };
      const newAdaptation = omit(
        { ...adaptation, file: new File([], '') },
        'id',
      );
      apiService.createAdaptation(newAdaptation).subscribe(response => {
        expect(response).toEqual(createAdaptation);
      });
      apolloTestingController
        .expectOne(gql.CREATE_ADAPTATION)
        .flush({ data: { createAdaptation } });
    });

    it('fails', () => {
      const createAdaptation = {
        id: null,
        message: 'Create adaptation failed',
        success: false,
      };
      const newAdaptation = omit(
        { ...adaptation, file: new File([], '') },
        'id',
      );
      apiService.createAdaptation(newAdaptation).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(createAdaptation.message);
        },
      );
      apolloTestingController
        .expectOne(gql.CREATE_ADAPTATION)
        .flush({ data: { createAdaptation } });
    });
  });

  describe('createPlan', () => {
    it('succeeds', () => {
      const createPlan = {
        id: planId,
        message: 'Plan created successfully',
        success: true,
      };
      const newPlan: CreatePlan = {
        adaptationId: plan.adaptationId,
        endTimestamp: plan.endTimestamp,
        name: plan.name,
        startTimestamp: plan.startTimestamp,
      };
      apiService.createPlan(newPlan).subscribe(response => {
        expect(response).toEqual(createPlan);
      });
      apolloTestingController
        .expectOne(gql.CREATE_PLAN)
        .flush({ data: { createPlan } });
    });

    it('fails', () => {
      const createPlan = {
        id: null,
        message: 'Create plan failed',
        success: false,
      };
      const newPlan: CreatePlan = {
        adaptationId: plan.adaptationId,
        endTimestamp: plan.endTimestamp,
        name: plan.name,
        startTimestamp: plan.startTimestamp,
      };
      apiService.createPlan(newPlan).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(createPlan.message);
        },
      );
      apolloTestingController
        .expectOne(gql.CREATE_PLAN)
        .flush({ data: { createPlan } });
    });
  });

  describe('deleteActivityInstance', () => {
    it('succeeds', () => {
      const deleteActivityInstance = {
        message: 'Activity instance successfully deleted',
        success: true,
      };
      apiService
        .deleteActivityInstance(planId, activityInstanceId)
        .subscribe(response => {
          expect(response).toEqual(deleteActivityInstance);
        });
      apolloTestingController
        .expectOne(gql.DELETE_ACTIVITY_INSTANCE)
        .flush({ data: { deleteActivityInstance } });
    });

    it('fails', () => {
      const deleteActivityInstance = {
        message: 'Delete activity instance failed',
        success: false,
      };
      apiService.deleteActivityInstance(planId, activityInstanceId).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(deleteActivityInstance.message);
        },
      );
      apolloTestingController
        .expectOne(gql.DELETE_ACTIVITY_INSTANCE)
        .flush({ data: { deleteActivityInstance } });
    });
  });

  describe('deleteAdaptation', () => {
    it('succeeds', () => {
      const deleteAdaptation = {
        message: 'Adaptation successfully deleted',
        success: true,
      };
      apiService.deleteAdaptation(adaptationId).subscribe(response => {
        expect(response).toEqual(deleteAdaptation);
      });
      apolloTestingController
        .expectOne(gql.DELETE_ADAPTATION)
        .flush({ data: { deleteAdaptation } });
    });

    it('fails', () => {
      const deleteAdaptation = {
        message: 'Delete adaptation failed',
        success: false,
      };
      apiService.deleteAdaptation(adaptationId).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(deleteAdaptation.message);
        },
      );
      apolloTestingController
        .expectOne(gql.DELETE_ADAPTATION)
        .flush({ data: { deleteAdaptation } });
    });
  });

  describe('deletePlan', () => {
    it('succeeds', () => {
      const deletePlan = {
        message: 'Adaptation successfully deleted',
        success: true,
      };
      apiService.deletePlan(planId).subscribe(response => {
        expect(response).toEqual(deletePlan);
      });
      apolloTestingController
        .expectOne(gql.DELETE_PLAN)
        .flush({ data: { deletePlan } });
    });

    it('fails', () => {
      const deletePlan = {
        message: 'Delete plan failed',
        success: false,
      };
      apiService.deletePlan(planId).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(deletePlan.message);
        },
      );
      apolloTestingController
        .expectOne(gql.DELETE_PLAN)
        .flush({ data: { deletePlan } });
    });
  });

  it('getAdaptations', () => {
    apiService.getAdaptations().subscribe(response => {
      expect(response).toEqual(adaptations);
    });
    apolloTestingController
      .expectOne(gql.GET_ADAPTATIONS)
      .flush({ data: { adaptations } });
  });

  it('getPlanDetail', () => {
    apiService.getPlanDetail(planId).subscribe(response => {
      expect(response).toEqual(planDetail);
    });
    apolloTestingController
      .expectOne(gql.GET_PLAN_DETAIL)
      .flush({ data: { plan: planDetail } });
  });

  it('getPlansAndAdaptations', () => {
    apiService.getPlansAndAdaptations().subscribe(response => {
      expect(response).toEqual({ adaptations, plans });
    });
    apolloTestingController
      .expectOne(gql.GET_PLANS_AND_ADAPTATIONS)
      .flush({ data: { adaptations, plans } });
  });

  it('getUiStates', () => {
    apiService.getUiStates().subscribe(response => {
      expect(response).toEqual(uiStates);
    });
    apolloTestingController
      .expectOne(gql.GET_UI_STATES)
      .flush({ data: { uiStates } });
  });

  it('login success', () => {
    apiService.login('testuser', '123456').subscribe(res => {
      expect(res).toEqual('Login success');
    });
  });

  it('login failure', () => {
    apiService.login('testuser', 'abcdef').subscribe(
      () => {},
      res => {
        expect(res).toEqual('Login failed. Invalid username or password.');
      },
    );
  });

  it('logout', () => {
    apiService.logout().subscribe(res => {
      expect(res).toEqual('Logout success');
    });
  });

  it('simulate', () => {
    apiService.simulate(adaptationId, planId, 1000000).subscribe(response => {
      expect(response).toEqual(simulationResponse);
    });
    apolloTestingController
      .expectOne(gql.SIMULATE)
      .flush({ data: { simulate: simulationResponse } });
  });

  describe('updateActivityInstance', () => {
    it('succeeds', () => {
      const updateActivityInstance = {
        message: 'Activity instance updated successfully',
        success: true,
      };
      apiService
        .updateActivityInstance(planId, activityInstance)
        .subscribe(response => {
          expect(response).toEqual(updateActivityInstance);
        });
      apolloTestingController
        .expectOne(gql.UPDATE_ACTIVITY_INSTANCE)
        .flush({ data: { updateActivityInstance } });
    });

    it('fails', () => {
      const updateActivityInstance = {
        message: 'Activity instance update failed',
        success: false,
      };
      apiService.updateActivityInstance(planId, activityInstance).subscribe(
        () => {},
        error => {
          expect(error.message).toEqual(updateActivityInstance.message);
        },
      );
      apolloTestingController
        .expectOne(gql.UPDATE_ACTIVITY_INSTANCE)
        .flush({ data: { updateActivityInstance } });
    });
  });

  it('validateParameters', () => {
    const validateParameters = {
      errors: null,
      success: true,
    };
    const parameters = [{ name: 'peelDirection', value: 'fromTip' }];
    apiService
      .validateParameters('PeelBanana', adaptationId, parameters)
      .subscribe(response => {
        expect(response).toEqual(validateParameters);
      });
    apolloTestingController
      .expectOne(gql.VALIDATE_PARAMETERS)
      .flush({ data: { validateParameters } });
  });
});
