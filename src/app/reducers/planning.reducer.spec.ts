import { PlanningActions } from '../actions';
import {
  activityInstanceId,
  adaptationId,
  cActivityInstanceMap,
  cActivityTypeMap,
  cAdaptation,
  cAdaptationMap,
  cPlan,
  cPlanMap,
  planId,
  sActivityInstance,
  sAdaptation,
  sPlan,
} from '../mocks';
import { SCreateAdaption, SPlan } from '../types';
import { initialState, PlanningState, reducer } from './planning.reducer';

describe('planning reducer', () => {
  describe('createActivityInstance', () => {
    it('should set createActivityInstanceError', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createActivityInstance({
          activityInstance: sActivityInstance,
          planId: '42',
        }),
      );
      expect(state).toEqual({
        ...initialState,
      });
    });
  });

  describe('createActivityInstanceFailure', () => {
    it('should set createActivityInstanceError', () => {
      const errorMsg = 'Create activity instance failed!';
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createActivityInstanceFailure({
          errorMsg,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        createActivityInstanceError: errorMsg,
      });
    });
  });

  describe('createAdaptationSuccess', () => {
    it('should set adaptations', () => {
      const adaptation: SCreateAdaption = {
        ...sAdaptation,
        file: new File([], ''),
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createAdaptationSuccess({
          adaptation,
          id: adaptationId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: {
          [adaptationId]: {
            ...cAdaptation,
          },
        },
      });
    });
  });

  describe('createPlanSuccess', () => {
    it('should set plan', () => {
      const plan: SPlan = {
        ...sPlan,
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createPlanSuccess({ id: planId, plan }),
      );
      expect(state).toEqual({
        ...initialState,
        plans: {
          [planId]: {
            ...cPlan,
            activityInstanceIds: [],
          },
        },
      });
    });
  });

  describe('deleteActivityInstanceSuccess', () => {
    it('should delete an activity instance', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setActivityInstances({
          activityInstances: cActivityInstanceMap,
          planId,
        }),
      );
      state = reducer(
        state,
        PlanningActions.setSelectedActivityInstanceId({
          selectedActivityInstanceId: activityInstanceId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: cActivityInstanceMap,
        selectedActivityInstanceId: activityInstanceId,
      });
      state = reducer(
        state,
        PlanningActions.deleteActivityInstanceSuccess({ activityInstanceId }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: {},
        selectedActivityInstanceId: null,
      });
    });
  });

  describe('deleteAdaptationSuccess', () => {
    it('should delete an adaptation', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setAdaptations({
          adaptations: cAdaptationMap,
        }),
      );
      state = reducer(
        state,
        PlanningActions.deleteAdaptationSuccess({ id: adaptationId }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: {},
      });
    });
  });

  describe('deletePlanSuccess', () => {
    it('should delete a plan', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setPlans({
          plans: cPlanMap,
        }),
      );
      state = reducer(state, PlanningActions.deletePlanSuccess({ id: planId }));
      expect(state).toEqual({
        ...initialState,
        plans: {},
      });
    });
  });

  describe('setActivityInstances', () => {
    it('should set activityInstances', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setActivityInstances({
          activityInstances: cActivityInstanceMap,
          planId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: cActivityInstanceMap,
      });
    });
  });

  describe('setAdaptations', () => {
    it('should set adaptations', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setAdaptations({
          adaptations: cAdaptationMap,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: cAdaptationMap,
      });
    });
  });

  describe('setLoading', () => {
    it('should set loading', () => {
      const loading = true;
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setLoading({ loading }),
      );
      expect(state).toEqual({
        ...initialState,
        loading,
      });
    });
  });

  describe('setPlans', () => {
    it('should set plans', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setPlans({
          plans: cPlanMap,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        plans: cPlanMap,
      });
    });
  });

  describe('setSelectedActivityInstanceId', () => {
    it('should set setSelectedActivityInstanceId', () => {
      const selectedActivityInstanceId = '42';
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setSelectedActivityInstanceId({
          selectedActivityInstanceId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        selectedActivityInstanceId,
      });
    });

    it('should set setSelectedActivityInstanceId to null if the id is already selected', () => {
      const selectedActivityInstanceId = '42';
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setSelectedActivityInstanceId({
          selectedActivityInstanceId,
        }),
      );
      state = reducer(
        state,
        PlanningActions.setSelectedActivityInstanceId({
          selectedActivityInstanceId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        selectedActivityInstanceId: null,
      });
    });
  });

  describe('setSelectedPlanAndActivityTypes', () => {
    it('should set plans and activity types', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setSelectedPlanAndActivityTypes({
          activityTypes: cActivityTypeMap,
          selectedPlan: cPlan,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityTypes: cActivityTypeMap,
        selectedPlan: cPlan,
      });
    });
  });

  describe('updateActivityInstance', () => {
    it('should set updateActivityInstanceError', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateActivityInstance({
          activityInstance: sActivityInstance,
          activityInstanceId: '42',
          planId: '42',
        }),
      );
      expect(state).toEqual({
        ...initialState,
      });
    });
  });

  describe('updateActivityInstanceFailure', () => {
    it('should set updateActivityInstanceError', () => {
      const errorMsg = 'Update activity instance failed!';
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateActivityInstanceFailure({
          errorMsg,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        updateActivityInstanceError: errorMsg,
      });
    });
  });

  describe('updateActivityInstanceSuccess', () => {
    it('should update activity instances', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setActivityInstances({
          activityInstances: cActivityInstanceMap,
          planId,
        }),
      );
      state = reducer(
        state,
        PlanningActions.updateActivityInstanceSuccess({
          activityInstance: sActivityInstance,
          activityInstanceId,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: cActivityInstanceMap,
      });
    });
  });
});
