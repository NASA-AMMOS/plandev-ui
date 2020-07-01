import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import { getUnixEpochTime } from '../functions';
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
import { Guide } from '../types';
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

  describe('guideAdd', () => {
    it('vertical guide', () => {
      const guide: Guide = {
        id: '42',
        label: { text: 'hello ' },
        type: 'vertical',
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      state.panels.forEach(panel => {
        if (panel.verticalGuides) {
          expect(panel.verticalGuides.pop()).toEqual(guide);
        }
      });
    });

    it('first horizontal guide', () => {
      const guide: Guide = {
        bandId: 'band0',
        id: '42',
        label: { text: 'hello ' },
        type: 'horizontal',
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      state.panels.forEach(panel => {
        if (panel.bands) {
          panel.bands.forEach(band => {
            if (band.id === guide.id) {
              expect(band.horizontalGuides.pop()).toEqual(guide);
            }
          });
        }
      });
    });

    it('append horizontal guide', () => {
      const guide: Guide = {
        bandId: 'band0',
        id: '42',
        label: { text: 'hello ' },
        type: 'horizontal',
      };
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      state = reducer(state, PlanningActions.guideAdd({ guide }));
      state.panels.forEach(panel => {
        if (panel.bands) {
          panel.bands.forEach(band => {
            if (band.id === guide.id) {
              expect(band.horizontalGuides.pop()).toEqual(guide);
            }
          });
        }
      });
    });
  });

  describe('guideRemove', () => {
    it('vertical guide', () => {
      const guide: Guide = {
        id: 'verticalGuide0',
        label: { text: 'hello ' },
        type: 'vertical',
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideRemove({ guide }),
      );
      state.panels.forEach(panel => {
        if (panel.verticalGuides) {
          panel.verticalGuides.forEach(vGuide => {
            expect(vGuide.id).not.toEqual(guide.id);
          });
        }
      });
    });

    it('horizontal guide', () => {
      const guide: Guide = {
        bandId: 'band0',
        id: '42',
        label: { text: 'hello ' },
        type: 'horizontal',
      };
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      state = reducer(state, PlanningActions.guideRemove({ guide }));
      state.panels.forEach(panel => {
        if (panel.bands) {
          panel.bands.forEach(band => {
            if (band.horizontalGuides) {
              band.horizontalGuides.forEach(hGuide => {
                expect(hGuide.id).not.toEqual(guide.id);
              });
            }
          });
        }
      });
    });
  });

  describe('guideUpdate', () => {
    it('vertical guide', () => {
      const id = 'verticalGuide0';
      const changes: Partial<Guide> = {
        label: { text: 'hello ' },
        type: 'vertical',
      };
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideUpdate({ id, changes }),
      );
      state.panels.forEach(panel => {
        if (panel.verticalGuides) {
          panel.verticalGuides.forEach(vGuide => {
            if (vGuide.id === id) {
              expect(vGuide.label.text).toEqual(changes.label.text);
            }
          });
        }
      });
    });

    it('horizontal guide', () => {
      const id = '42';
      const guide: Guide = {
        bandId: 'band0',
        id,
        label: { text: 'hello ' },
        type: 'horizontal',
      };
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      const changes: Partial<Guide> = {
        bandId: 'band0',
        label: { text: 'hi' },
        type: 'horizontal',
      };
      state = reducer(state, PlanningActions.guideUpdate({ id, changes }));
      state.panels.forEach(panel => {
        if (panel.bands) {
          panel.bands.forEach(band => {
            if (band.horizontalGuides) {
              band.horizontalGuides.forEach(hGuide => {
                if (hGuide.id === id) {
                  expect(hGuide.label.text).toEqual(changes.label.text);
                }
              });
            }
          });
        }
      });
    });

    it('horizontal guide with unknown horizontal guide id', () => {
      const id = '42';
      const guide: Guide = {
        bandId: 'band0',
        id,
        label: { text: 'hello ' },
        type: 'horizontal',
      };
      let state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.guideAdd({ guide }),
      );
      const changes: Partial<Guide> = {
        bandId: 'band0',
        label: { text: 'hi' },
        type: 'horizontal',
      };
      state = reducer(
        state,
        PlanningActions.guideUpdate({ id: '52', changes }),
      );
      state.panels.forEach(panel => {
        if (panel.bands) {
          panel.bands.forEach(band => {
            if (band.horizontalGuides) {
              band.horizontalGuides.forEach(hGuide => {
                expect(hGuide).toEqual(hGuide);
              });
            }
          });
        }
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
        constraintViolations: simulationResponse.violations,
        simulationResults: simulationResponse.results,
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
      });
    });
  });

  describe('updateAllPanels', () => {
    it('should update all the panels', () => {
      const panels = [];
      const state: PlanningState = reducer(
        { ...initialState },
        PlanningActions.updateAllPanels({
          panels,
        }),
      );
      expect(state).toEqual({
        ...initialState,
        panels,
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
