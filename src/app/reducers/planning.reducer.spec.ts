import { PlanningActions } from '../actions';
import { getUnixEpochTime } from '../functions';
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
    it('it should set createActivityInstanceError', () => {
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
    it('it should set createActivityInstanceError', () => {
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
    it('it should delete an activity instance', () => {
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
    it('it should delete an adaptation', () => {
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
    it('it should delete a plan', () => {
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

  describe('restoreViewTimeRange', () => {
    it('viewTimeRange should not change when there is no selectedPlan', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.restoreViewTimeRange(),
      );
      expect(state).toEqual({
        ...initialState,
      });
    });

    it('viewTimeRange should update with the selectedPlan time range', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setSelectedPlanAndActivityTypes({
          activityTypes: cActivityTypeMap,
          selectedPlan: cPlan,
        }),
      );
      state = reducer(state, PlanningActions.zoomInViewTimeRange());
      state = reducer(state, PlanningActions.restoreViewTimeRange());
      expect(state).toEqual({
        ...initialState,
        activityTypes: cActivityTypeMap,
        selectedPlan: cPlan,
        viewTimeRange: {
          end: getUnixEpochTime(cPlan.endTimestamp),
          start: getUnixEpochTime(cPlan.startTimestamp),
        },
      });
    });
  });

  describe('setActivityInstances', () => {
    it('it should set activityInstances', () => {
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
    it('it should set adaptations', () => {
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
    it('it should set loading', () => {
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
    it('it should set plans', () => {
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
    it('it should set setSelectedActivityInstanceId', () => {
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

    it('it should set setSelectedActivityInstanceId to null if the id is already selected', () => {
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
    it('it should set plans and activity types', () => {
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
        viewTimeRange: { start: 1577750400000, end: 1577750410000 },
      });
    });
  });

  describe('updateActivityInstance', () => {
    it('it should set updateActivityInstanceError', () => {
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
    it('it should set updateActivityInstanceError', () => {
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
    it('it should update activity instances', () => {
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

  describe('updateViewTimeRange', () => {
    it('it should update the view time range', () => {
      const viewTimeRange = { start: 217, end: 314 };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateViewTimeRange({
          viewTimeRange,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        viewTimeRange,
      });
    });
  });

  describe('zoomInViewTimeRange', () => {
    it('should properly zoom in the viewTimeRange', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateViewTimeRange({
          viewTimeRange: { start: 10, end: 110 },
        }),
      );
      state = reducer(state, PlanningActions.zoomInViewTimeRange());
      expect(state).toEqual({
        ...initialState,
        viewTimeRange: {
          end: 100,
          start: 20,
        },
      });
    });
  });

  describe('zoomOutViewTimeRange', () => {
    it('should return the default state if there is no selected plan', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.zoomOutViewTimeRange(),
      );
      expect(state).toEqual({
        ...initialState,
      });
    });

    it('should properly zoom out the viewTimeRange', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.setSelectedPlanAndActivityTypes({
          activityTypes: cActivityTypeMap,
          selectedPlan: cPlan,
        }),
      );
      state = reducer(state, PlanningActions.zoomInViewTimeRange());
      state = reducer(state, PlanningActions.zoomInViewTimeRange());
      state = reducer(state, PlanningActions.zoomOutViewTimeRange());
      expect(state).toEqual({
        ...initialState,
        activityTypes: cActivityTypeMap,
        selectedPlan: cPlan,
        viewTimeRange: {
          end: 1577750408840,
          start: 1577750401160,
        },
      });
    });
  });
});
