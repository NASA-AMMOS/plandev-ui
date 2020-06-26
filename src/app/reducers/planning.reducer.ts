import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import { getUnixEpochTime } from '../functions';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Panel,
  Plan,
  SimulationResult,
  StringTMap,
  TimeRange,
} from '../types';

export interface PlanningState {
  activityInstances: StringTMap<ActivityInstance> | null;
  activityTypes: StringTMap<ActivityType> | null;
  adaptations: StringTMap<Adaptation> | null;
  panels: Panel[];
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  simulationResults: SimulationResult[] | null;
  viewTimeRange: TimeRange;
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  panels: [
    {
      bands: [
        {
          height: 200,
          id: 'band0',
          subBands: [
            {
              chartType: 'activity',
              filter: {
                activity: {
                  type: '.*',
                },
              },
              id: 'subBand0',
              type: 'activity',
            },
          ],
        },
      ],
      id: 'panel0',
      menu: [
        {
          action: 'restore',
          icon: 'restore',
          title: 'Restore Time',
        },
      ],
      title: 'Schedule',
      type: 'timeline',
      verticalGuides: [
        {
          id: 'verticalGuide0',
          label: { text: 'Guide 0000000000000000000000' },
          timestamp: '2020-001T00:00:11',
          type: 'vertical',
        },
        {
          id: 'verticalGuide1',
          label: { text: 'Guide 1' },
          timestamp: '2020-001T00:00:23',
          type: 'vertical',
        },
      ],
    },
    {
      bands: [
        {
          height: 100,
          horizontalGuides: [],
          id: 'band1',
          subBands: [
            {
              chartType: 'line',
              filter: {
                state: {
                  name: 'peel',
                },
              },
              id: 'subBand1',
              type: 'state',
            },
          ],
          yAxes: [
            {
              id: 'axis-subBand1',
              label: {
                text: 'peel',
              },
            },
          ],
        },
        {
          height: 100,
          id: 'band2',
          subBands: [
            {
              chartType: 'line',
              filter: {
                state: {
                  name: 'fruit',
                },
              },
              id: 'subBand2',
              type: 'state',
            },
          ],
          yAxes: [
            {
              id: 'axis-subBand2',
              label: {
                text: 'fruit',
              },
            },
          ],
        },
      ],
      id: 'panel1',
      menu: [
        {
          action: 'restore',
          icon: 'restore',
          title: 'Restore Time',
        },
        {
          action: 'simulate',
          icon: 'timeline',
          title: 'Run Simulation',
        },
      ],
      title: 'Simulation',
      type: 'timeline',
      verticalGuides: [
        {
          id: 'verticalGuide2',
          label: { text: 'Guide 2' },
          timestamp: '2020-001T00:00:42',
          type: 'vertical',
        },
        {
          id: 'verticalGuide3',
          label: { text: 'Guide 3' },
          timestamp: '2020-001T00:00:52',
          type: 'vertical',
        },
      ],
    },
    {
      id: 'panel2',
      table: {
        columns: ['select', 'type', 'startTimestamp'],
        type: 'activity',
      },
      title: 'Table',
      type: 'table',
    },
  ],
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  simulationResults: null,
  viewTimeRange: { start: 0, end: 0 },
};

export const reducer = createReducer(
  initialState,
  on(PlanningActions.createActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstance.id]: {
        ...action.activityInstance,
      },
    },
  })),
  on(PlanningActions.createAdaptationSuccess, (state, action) => ({
    ...state,
    adaptations: {
      ...state.adaptations,
      [action.adaptation.id]: {
        ...action.adaptation,
      },
    },
  })),
  on(PlanningActions.createPlanSuccess, (state, action) => ({
    ...state,
    plans: {
      ...state.plans,
      [action.plan.id]: {
        ...action.plan,
      },
    },
  })),
  on(PlanningActions.deleteActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: omit(state.activityInstances, action.activityInstanceId),
    selectedActivityInstanceId:
      state.selectedActivityInstanceId === action.activityInstanceId
        ? null
        : state.selectedActivityInstanceId,
  })),
  on(PlanningActions.deleteAdaptationSuccess, (state, { id }) => ({
    ...state,
    adaptations: omit(state.adaptations, id),
  })),
  on(PlanningActions.deletePlanSuccess, (state, { id }) => ({
    ...state,
    plans: omit(state.plans, id),
  })),
  on(PlanningActions.getAdaptationsSuccess, (state, { adaptations }) => ({
    ...state,
    adaptations: keyBy(adaptations, 'id'),
  })),
  on(PlanningActions.getPlanDetailSuccess, (state, { plan }) => ({
    ...state,
    activityInstances: keyBy(plan.activityInstances, 'id'),
    activityTypes: keyBy(plan.adaptation.activityTypes, 'name'),
    selectedPlan: omit(plan, ['activityInstances', 'adaptation']),
    viewTimeRange: {
      end: getUnixEpochTime(plan.endTimestamp),
      start: getUnixEpochTime(plan.startTimestamp),
    },
  })),
  on(PlanningActions.getPlansSuccess, (state, { plans }) => ({
    ...state,
    plans: keyBy(plans, 'id'),
  })),
  on(PlanningActions.guideAdd, (state, { guide }) => ({
    ...state,
    panels: state.panels.map(panel => {
      if (guide.type === 'vertical') {
        return {
          ...panel,
          verticalGuides: panel.verticalGuides
            ? [...panel.verticalGuides, guide]
            : [guide],
        };
      }
      if (guide.type === 'horizontal' && panel.bands) {
        return {
          ...panel,
          bands: panel.bands.map(band => {
            if (band.id === guide.bandId) {
              return {
                ...band,
                horizontalGuides: band.horizontalGuides
                  ? [...band.horizontalGuides, guide]
                  : [guide],
              };
            }
            return band;
          }),
        };
      }
      return panel;
    }),
  })),
  on(PlanningActions.guideRemove, (state, { guide: removedGuide }) => ({
    ...state,
    panels: state.panels.map(panel => {
      if (removedGuide.type === 'vertical' && panel.verticalGuides) {
        return {
          ...panel,
          verticalGuides: panel.verticalGuides.filter(
            guide => removedGuide.id !== guide.id,
          ),
        };
      }
      if (removedGuide.type === 'horizontal' && panel.bands) {
        return {
          ...panel,
          bands: panel.bands.map(band => {
            if (band.id === removedGuide.bandId) {
              return {
                ...band,
                horizontalGuides: band.horizontalGuides.filter(
                  guide => removedGuide.id !== guide.id,
                ),
              };
            }
            return band;
          }),
        };
      }
      return panel;
    }),
  })),
  on(PlanningActions.guideUpdate, (state, { id, changes: updatedGuide }) => ({
    ...state,
    panels: state.panels.map(panel => {
      if (updatedGuide.type === 'vertical' && panel.verticalGuides) {
        return {
          ...panel,
          verticalGuides: panel.verticalGuides.map(guide => {
            if (id === guide.id) {
              return {
                ...guide,
                ...updatedGuide,
              };
            }
            return guide;
          }),
        };
      }
      if (updatedGuide.type === 'horizontal' && panel.bands) {
        return {
          ...panel,
          bands: panel.bands.map(band => {
            if (band.id === updatedGuide.bandId) {
              return {
                ...band,
                horizontalGuides: band.horizontalGuides.map(guide => {
                  if (id === guide.id) {
                    return {
                      ...guide,
                      ...updatedGuide,
                    };
                  }
                  return guide;
                }),
              };
            }
            return band;
          }),
        };
      }
      return panel;
    }),
  })),
  on(PlanningActions.restoreViewTimeRange, state => ({
    ...state,
    viewTimeRange: {
      end: getUnixEpochTime(state.selectedPlan.endTimestamp),
      start: getUnixEpochTime(state.selectedPlan.startTimestamp),
    },
  })),
  on(PlanningActions.runSimulationSuccess, (state, { simulationResults }) => ({
    ...state,
    simulationResults,
  })),
  on(
    PlanningActions.setSelectedActivityInstanceId,
    (state, { keepSelected, selectedActivityInstanceId: id }) => ({
      ...state,
      selectedActivityInstanceId:
        !keepSelected && state.selectedActivityInstanceId === id ? null : id,
    }),
  ),
  on(PlanningActions.updateActivityInstanceSuccess, (state, action) => ({
    ...state,
    activityInstances: {
      ...state.activityInstances,
      [action.activityInstance.id]: {
        ...state.activityInstances[action.activityInstance.id],
        ...action.activityInstance,
      },
    },
  })),
  on(PlanningActions.updateAllPanels, (state, { panels }) => ({
    ...state,
    panels,
  })),
  on(PlanningActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
);
