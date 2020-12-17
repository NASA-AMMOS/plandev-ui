import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import {
  activityInstance,
  activityInstanceId,
  activityInstances,
  activityTypes,
  adaptation,
  adaptationId,
  adaptations,
  plan,
  planDetail,
  planId,
  plans,
  simulationResponse,
} from '../mocks';
import { initialState, PlanningState, reducer } from './planning.reducer';

describe('planning reducer', () => {
  describe('createActivityInstanceSuccess', () => {
    it('should set the new activity instance', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createActivityInstanceSuccess({
          activityInstance,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: {
          [activityInstanceId]: {
            ...activityInstance,
          },
        },
      });
    });
  });

  describe('createAdaptationSuccess', () => {
    it('should set adaptations', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createAdaptationSuccess({
          adaptation,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: {
          [adaptationId]: {
            ...adaptation,
          },
        },
      });
    });
  });

  describe('createPlanSuccess', () => {
    it('should set plan', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.createPlanSuccess({ plan }),
      );
      expect(state).toEqual({
        ...initialState,
        plans: {
          [planId]: {
            ...plan,
          },
        },
      });
    });
  });

  describe('deleteActivityInstanceSuccess', () => {
    it('should delete an activity instance', () => {
      let state: PlanningState = {
        ...initialState,
        activityInstances: keyBy(activityInstances, 'id'),
        selectedActivityInstanceId: activityInstanceId,
      };
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

    it('should not delete an activity instance if the given activity instance id is wrong', () => {
      const newInitialState: PlanningState = {
        ...initialState,
        activityInstances: keyBy(activityInstances, 'id'),
        selectedActivityInstanceId: activityInstanceId,
      };
      const state = reducer(
        newInitialState,
        PlanningActions.deleteActivityInstanceSuccess({
          activityInstanceId: '100000000',
        }),
      );
      expect(state).toEqual(newInitialState);
    });
  });

  describe('deleteAdaptationSuccess', () => {
    it('should delete an adaptation', () => {
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.getAdaptationsSuccess({
          adaptations,
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
        PlanningActions.getPlansSuccess({
          plans,
        }),
      );
      state = reducer(state, PlanningActions.deletePlanSuccess({ id: planId }));
      expect(state).toEqual({
        ...initialState,
        plans: {},
      });
    });
  });

  describe('getAdaptationsSuccess', () => {
    it('should set adaptations', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.getAdaptationsSuccess({
          adaptations,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: keyBy(adaptations, 'id'),
      });
    });
  });

  describe('getPlansSuccess', () => {
    it('should set plans', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.getPlansSuccess({
          plans,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        plans: keyBy(plans, 'id'),
      });
    });
  });

  describe('restoreViewTimeRange', () => {
    it('should restore the view time range', () => {
      let state: PlanningState = {
        ...initialState,
        selectedPlan: plan,
        viewTimeRange: { end: 100, start: 0 },
      };
      state = reducer(state, PlanningActions.restoreViewTimeRange());
      expect(state).toEqual({
        ...initialState,
        selectedPlan: plan,
        viewTimeRange: { end: 1577750410000, start: 1577750400000 },
      });
    });
  });

  describe('runSimulationSuccess', () => {
    it('should update simulation results', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.runSimulationSuccess({
          simulationResponse,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: {},
        lastActivityInstanceUpdate: state.lastActivityInstanceUpdate,
        lastSimulationTime: state.lastSimulationTime,
        simulationResults: simulationResponse.results,
        violations: simulationResponse.violations,
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

  describe('getPlanDetailSuccess', () => {
    it('should set the plan detail', () => {
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.getPlanDetailSuccess({
          plan: planDetail,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: keyBy(activityInstances, 'id'),
        activityTypes: keyBy(activityTypes, 'name'),
        selectedPlan: omit(planDetail, ['activityInstances', 'adaptation']),
        viewTimeRange: {
          end: getUnixEpochTime(planDetail.endTimestamp),
          start: getUnixEpochTime(planDetail.startTimestamp),
        },
      });
    });
  });

  describe('updateActivityInstanceSuccess', () => {
    it('should update activity instances', () => {
      let state: PlanningState = {
        ...initialState,
        activityInstances: keyBy(activityInstances, 'id'),
      };
      state = reducer(
        state,
        PlanningActions.updateActivityInstanceSuccess({
          activityInstance: {
            ...activityInstance,
            type: 'EatCake',
          },
        }),
      );
      expect(state).toEqual({
        ...initialState,
        activityInstances: {
          [activityInstanceId]: {
            ...activityInstance,
            type: 'EatCake',
          },
        },
        lastActivityInstanceUpdate: state.lastActivityInstanceUpdate,
      });
    });
  });

  describe('updateAllUiStates', () => {
    it('should update all the uiStates', () => {
      const states = [];
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateAllUiStates({
          uiStates: states,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        uiStates: states,
      });
    });
  });

  describe('updateViewTimeRange', () => {
    it('should update the view time range', () => {
      const viewTimeRange = { end: 100, start: 0 };
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
});
