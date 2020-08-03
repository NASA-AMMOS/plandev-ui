import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import { getUnixEpochTime } from '../functions';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Plan,
  SimulationResult,
  StringTMap,
  TimeRange,
  UiState,
  Violation,
  ViolationListState,
} from '../types';

export interface PlanningState {
  activityInstances: StringTMap<ActivityInstance> | null;
  activityTypes: StringTMap<ActivityType> | null;
  adaptations: StringTMap<Adaptation> | null;
  constraintViolations: Violation[] | null;
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  selectedUiStateId: string | null;
  simulationResults: SimulationResult[] | null;
  uiStates: UiState[];
  viewTimeRange: TimeRange;
  violationListState: ViolationListState;
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  constraintViolations: null,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  selectedUiStateId: null,
  simulationResults: null,
  uiStates: [],
  viewTimeRange: { start: 0, end: 0 },
  violationListState: { category: {}, constraint: {} },
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
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
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
  })),
  on(PlanningActions.guideRemove, (state, { guide: removedGuide }) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
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
  })),
  on(PlanningActions.guideUpdate, (state, { id, changes: updatedGuide }) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
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
  })),
  on(PlanningActions.restoreViewTimeRange, state => ({
    ...state,
    viewTimeRange: {
      end: getUnixEpochTime(state.selectedPlan.endTimestamp),
      start: getUnixEpochTime(state.selectedPlan.startTimestamp),
    },
  })),
  on(
    PlanningActions.runSimulationSuccess,
    (state, { simulationResponse: { results, violations = [] } }) => ({
      ...state,
      constraintViolations: violations.map(violation => ({
        ...violation,
        windows: violation.windows.map(({ end, start }) => {
          const planStart = getUnixEpochTime(state.selectedPlan.startTimestamp);
          return {
            end: planStart + end / 1000,
            start: planStart + start / 1000,
          };
        }),
      })),
      simulationResults: results || [],
      violationListState: {
        ...violations.reduce(
          (violationListState: ViolationListState, violation) => {
            const { constraint } = violation;
            const { category, name } = constraint;
            if (state.violationListState.category[category] === undefined) {
              violationListState.category[category] = {
                expanded: true,
                visible: true,
              };
            }
            if (state.violationListState.constraint[name] === undefined) {
              violationListState.constraint[name] = {
                expanded: false,
                visible: true,
              };
            }
            return violationListState;
          },
          {
            ...state.violationListState,
            category: { ...state.violationListState.category },
            constraint: { ...state.violationListState.constraint },
          },
        ),
      },
    }),
  ),
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
  on(PlanningActions.updateAllUiStates, (state, { uiStates }) => ({
    ...state,
    selectedUiStateId: uiStates[2]?.id || null,
    uiStates,
  })),
  on(PlanningActions.updateBand, (state, { id, update }) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
        if (panel.bands) {
          return {
            ...panel,
            bands: panel.bands.map(band => {
              if (band.id === id) {
                return {
                  ...band,
                  ...update,
                };
              }
              return band;
            }),
          };
        }
        return panel;
      }),
    })),
  })),
  on(PlanningActions.updateViolationListState, (state, action) => ({
    ...state,
    violationListState: {
      ...state.violationListState,
      [action.formType]: {
        ...state.violationListState[action.formType],
        [action.formValue]: {
          ...state.violationListState[action.formType][action.formValue],
          [action.key]: action.value,
        },
      },
    },
  })),
  on(PlanningActions.updateSelectedUiStateId, (state, { id }) => ({
    ...state,
    selectedUiStateId: id,
  })),
  on(PlanningActions.updateUiState, (state, action) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => {
      if (action.id === uiState.id) {
        return {
          ...uiState,
          ...action.uiState,
        };
      }
      return uiState;
    }),
  })),
  on(PlanningActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
);
