import { MerlinActions } from '../actions';
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
import { initialState, MerlinState, reducer } from './merlin.reducer';

describe('merlin reducer', () => {
  describe('createActivityInstance', () => {
    it('it should set createActivityInstanceError', () => {
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.createActivityInstance({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.createActivityInstanceFailure({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.createAdaptationSuccess({ id: adaptationId, adaptation }),
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.createPlanSuccess({ id: planId, plan }),
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
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setActivityInstances({
          activityInstances: cActivityInstanceMap,
          planId,
        }),
      );
      state = reducer(
        state,
        MerlinActions.setSelectedActivityInstanceId({
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
        MerlinActions.deleteActivityInstanceSuccess({ activityInstanceId }),
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
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setAdaptations({
          adaptations: cAdaptationMap,
        }),
      );
      state = reducer(
        state,
        MerlinActions.deleteAdaptationSuccess({ id: adaptationId }),
      );
      expect(state).toEqual({
        ...initialState,
        adaptations: {},
      });
    });
  });

  describe('deletePlanSuccess', () => {
    it('it should delete a plan', () => {
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setPlans({
          plans: cPlanMap,
        }),
      );
      state = reducer(state, MerlinActions.deletePlanSuccess({ id: planId }));
      expect(state).toEqual({
        ...initialState,
        plans: {},
      });
    });
  });

  describe('restoreViewTimeRange', () => {
    it('viewTimeRange should not change when there is no selectedPlan', () => {
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.restoreViewTimeRange(),
      );
      expect(state).toEqual({
        ...initialState,
      });
    });

    it('viewTimeRange should update with the selectedPlan time range', () => {
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setSelectedPlanAndActivityTypes({
          activityTypes: cActivityTypeMap,
          selectedPlan: cPlan,
        }),
      );
      state = reducer(state, MerlinActions.zoomInViewTimeRange());
      state = reducer(state, MerlinActions.restoreViewTimeRange());
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setActivityInstances({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setAdaptations({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setLoading({ loading }),
      );
      expect(state).toEqual({
        ...initialState,
        loading,
      });
    });
  });

  describe('setPlans', () => {
    it('it should set plans', () => {
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setPlans({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setSelectedActivityInstanceId({
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
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setSelectedActivityInstanceId({
          selectedActivityInstanceId,
        }),
      );
      state = reducer(
        state,
        MerlinActions.setSelectedActivityInstanceId({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setSelectedPlanAndActivityTypes({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateActivityInstance({
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
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateActivityInstanceFailure({
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
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setActivityInstances({
          activityInstances: cActivityInstanceMap,
          planId,
        }),
      );
      state = reducer(
        state,
        MerlinActions.updateActivityInstanceSuccess({
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

  describe('updateMarginBottom', () => {
    it('it should set marginBottom', () => {
      const marginBottom = 42;
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateMarginBottom({
          marginBottom,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginBottom,
      });
    });
  });

  describe('updateMarginLeft', () => {
    it('it should set marginLeft', () => {
      const marginLeft = 42;
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateMarginLeft({
          marginLeft,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginLeft,
      });
    });
  });

  describe('updateMarginRight', () => {
    it('it should set marginRight', () => {
      const marginRight = 42;
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateMarginRight({
          marginRight,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginRight,
      });
    });
  });

  describe('updateMarginTop', () => {
    it('it should set marginTop', () => {
      const marginTop = 42;
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateMarginTop({
          marginTop,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        marginTop,
      });
    });
  });

  describe('updateViewTimeRange', () => {
    it('it should update the view time range', () => {
      const viewTimeRange = { start: 217, end: 314 };
      const state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateViewTimeRange({
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
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.updateViewTimeRange({
          viewTimeRange: { start: 10, end: 110 },
        }),
      );
      state = reducer(state, MerlinActions.zoomInViewTimeRange());
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
    it('should properly zoom out the viewTimeRange', () => {
      let state: MerlinState = reducer(
        { ...initialState },
        MerlinActions.setSelectedPlanAndActivityTypes({
          activityTypes: cActivityTypeMap,
          selectedPlan: cPlan,
        }),
      );
      state = reducer(state, MerlinActions.zoomInViewTimeRange());
      state = reducer(state, MerlinActions.zoomInViewTimeRange());
      state = reducer(state, MerlinActions.zoomOutViewTimeRange());
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
