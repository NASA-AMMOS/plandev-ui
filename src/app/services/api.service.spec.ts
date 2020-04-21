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
  simulationResults,
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

  it('createActivityInstances', () => {
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

  it('createAdaptation', () => {
    const createAdaptation = {
      id: adaptationId,
      message: 'Adaptation created successfully',
      success: true,
    };
    const newAdaptation = omit({ ...adaptation, file: new File([], '') }, 'id');
    apiService.createAdaptation(newAdaptation).subscribe(response => {
      expect(response).toEqual(createAdaptation);
    });
    apolloTestingController
      .expectOne(gql.CREATE_ADAPTATION)
      .flush({ data: { createAdaptation } });
  });

  it('createPlan', () => {
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

  it('deleteActivityInstance', () => {
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

  it('deleteAdaptation', () => {
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

  it('deletePlan', () => {
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
    apiService.simulate(planId, 1000000).subscribe(response => {
      expect(response).toEqual(simulationResults);
    });
    apolloTestingController
      .expectOne(gql.SIMULATE)
      .flush({ data: { simulate: simulationResults } });
  });

  it('updateActivityInstance success', () => {
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

  it('updateActivityInstance failure', () => {
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
