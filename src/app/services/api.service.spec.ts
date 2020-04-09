import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ApolloTestingController,
  ApolloTestingModule,
} from 'apollo-angular/testing';
import omit from 'lodash-es/omit';
import { environment } from '../../environments/environment';
import {
  activityInstanceId,
  adaptation,
  adaptationId,
  adaptations,
  cActivityInstanceMap,
  cPlan,
  plan,
  planId,
  plans,
  sActivityInstance,
  sActivityInstanceMap,
  sPlan,
} from '../mocks';
import { ApiService } from './api.service';
import * as gql from './gql';

const { planServiceBaseUrl } = environment;

describe('api service', () => {
  let apiService: ApiService;
  let apolloTestingController: ApolloTestingController;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApolloTestingModule, HttpClientTestingModule],
    });
    apiService = TestBed.inject(ApiService);
    apolloTestingController = TestBed.inject(ApolloTestingController);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('getActivityInstances', () => {
    apiService.getActivityInstances(planId).subscribe(activityInstances => {
      expect(activityInstances).toEqual(cActivityInstanceMap);
    });
    const req = httpTestingController.expectOne(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances`,
    );
    req.flush(sActivityInstanceMap);
  });

  it('getAdaptations', () => {
    apiService.getAdaptations().subscribe(response => {
      expect(response).toEqual(adaptations);
    });
    apolloTestingController
      .expectOne(gql.GET_ADAPTATIONS)
      .flush({ data: { adaptations } });
  });

  it('createActivityInstances', () => {
    apiService
      .createActivityInstances(planId, [sActivityInstance])
      .subscribe(ids => {
        expect(ids).toEqual([activityInstanceId]);
      });
    const req = httpTestingController.expectOne(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances`,
    );
    req.flush([activityInstanceId]);
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
    const newPlan = omit(plan, 'id');
    apiService.createPlan(newPlan).subscribe(response => {
      expect(response).toEqual(createPlan);
    });
    apolloTestingController
      .expectOne(gql.CREATE_PLAN)
      .flush({ data: { createPlan } });
  });

  it('deleteActivityInstance', () => {
    apiService
      .deleteActivityInstance(planId, activityInstanceId)
      .subscribe(res => {
        expect(res).toEqual({});
      });
    const req = httpTestingController.expectOne(
      `${planServiceBaseUrl}/plans/${planId}/activity_instances/${activityInstanceId}`,
    );
    req.flush({});
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

  it('getPlansAndAdaptations', () => {
    apiService.getPlansAndAdaptations().subscribe(response => {
      expect(response).toEqual({ adaptations, plans });
    });
    apolloTestingController
      .expectOne(gql.GET_PLANS_AND_ADAPTATIONS)
      .flush({ data: { adaptations, plans } });
  });

  it('getPlan', () => {
    apiService.getPlan(planId).subscribe(response => {
      expect(response).toEqual(cPlan);
    });
    const req = httpTestingController.expectOne(
      `${planServiceBaseUrl}/plans/${planId}`,
    );
    req.flush(sPlan);
  });

  it('login', () => {
    apiService.login('testuser', '123456').subscribe(res => {
      expect(res).toEqual('Login success');
    });
  });

  it('logout', () => {
    apiService.logout().subscribe(res => {
      expect(res).toEqual('Logout success');
    });
  });
});
