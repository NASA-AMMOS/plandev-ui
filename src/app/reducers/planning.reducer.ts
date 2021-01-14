import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  ConstraintViolation,
  DecompositionTreeState,
  HorizontalGuide,
  Plan,
  SimulationResult,
  StringTMap,
  TimeRange,
  UiState,
  ViolationListState,
} from '../types';

export interface PlanningState {
  activityInstances: StringTMap<ActivityInstance> | null;
  activityTypes: StringTMap<ActivityType> | null;
  adaptations: StringTMap<Adaptation> | null;
  decompositionTreeState: DecompositionTreeState;
  lastActivityInstanceUpdate: number;
  lastSimulationTime: number;
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  selectedUiStateId: string | null;
  simulationResults: SimulationResult[] | null;
  uiStates: UiState[];
  viewTimeRange: TimeRange;
  violationListState: ViolationListState;
  violations: ConstraintViolation[] | null;
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  decompositionTreeState: { instance: {} },
  lastActivityInstanceUpdate: 0,
  lastSimulationTime: 0,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  selectedUiStateId: null,
  simulationResults: null,
  uiStates: [],
  viewTimeRange: { end: 0, start: 0 },
  violationListState: { category: {}, constraint: {} },
  violations: null,
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
  on(PlanningActions.horizontalGuideCreate, (state, { guide, rowId }) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
        if (panel.timeline) {
          return {
            ...panel,
            timeline: {
              ...panel.timeline,
              rows: panel.timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    horizontalGuides: row.horizontalGuides
                      ? [...row.horizontalGuides, guide]
                      : [guide],
                  };
                }
                return row;
              }),
            },
          };
        }
        return panel;
      }),
    })),
  })),
  on(
    PlanningActions.horizontalGuideDelete,
    (state, { guide: removedGuide, rowId }) => ({
      ...state,
      uiStates: state.uiStates.map(uiState => ({
        ...uiState,
        panels: uiState.panels.map(panel => {
          if (panel.timeline) {
            return {
              ...panel,
              timeline: {
                ...panel.timeline,
                rows: panel.timeline.rows.map(row => {
                  if (row.id === rowId) {
                    return {
                      ...row,
                      horizontalGuides: row.horizontalGuides.filter(
                        (guide: HorizontalGuide) =>
                          removedGuide.id !== guide.id,
                      ),
                    };
                  }
                  return row;
                }),
              },
            };
          }
          return panel;
        }),
      })),
    }),
  ),
  on(
    PlanningActions.horizontalGuideUpdate,
    (state, { guide: updatedGuide, rowId }) => ({
      ...state,
      uiStates: state.uiStates.map(uiState => ({
        ...uiState,
        panels: uiState.panels.map(panel => {
          if (panel.timeline) {
            return {
              ...panel,
              timeline: {
                ...panel.timeline,
                rows: panel.timeline.rows.map(row => {
                  if (row.id === rowId) {
                    const { horizontalGuides = [] } = row;
                    return {
                      ...row,
                      horizontalGuides: horizontalGuides.map(guide => {
                        if (updatedGuide.id === guide.id) {
                          return {
                            ...guide,
                            ...updatedGuide,
                          };
                        }
                        return guide;
                      }),
                    };
                  }
                  return row;
                }),
              },
            };
          }
          return panel;
        }),
      })),
    }),
  ),
  on(PlanningActions.restoreViewTimeRange, state => ({
    ...state,
    viewTimeRange: {
      end: getUnixEpochTime(state.selectedPlan.endTimestamp),
      start: getUnixEpochTime(state.selectedPlan.startTimestamp),
    },
  })),
  on(
    PlanningActions.runSimulationSuccess,
    (
      state,
      { simulationResponse: { activities = [], results, violations = [] } },
    ) => {
      const now = performance.now();
      return {
        ...state,
        activityInstances: {
          ...keyBy(activities, 'id'),
        },
        lastActivityInstanceUpdate: now,
        lastSimulationTime: now,
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
        violations: violations.map(violation => ({
          ...violation,
          windows: violation.windows.map(({ end, start }) => {
            const planStart = getUnixEpochTime(
              state.selectedPlan.startTimestamp,
            );
            return {
              end: planStart + end / 1000,
              start: planStart + start / 1000,
            };
          }),
        })),
      };
    },
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
        children: [],
      },
    },
    lastActivityInstanceUpdate: performance.now(),
  })),
  on(PlanningActions.updateAllUiStates, (state, { uiStates }) => ({
    ...state,
    selectedUiStateId: uiStates[0]?.id || null,
    uiStates,
  })),
  on(PlanningActions.updateDecompositionTreeState, (state, action) => ({
    ...state,
    decompositionTreeState: {
      ...state.decompositionTreeState,
      [action.formType]: {
        ...state.decompositionTreeState[action.formType],
        [action.formValue]: {
          ...state.decompositionTreeState[action.formType][action.formValue],
          [action.key]: action.value,
        },
      },
    },
  })),
  on(PlanningActions.updateRow, (state, { rowId, update }) => ({
    ...state,
    uiStates: state.uiStates.map(uiState => ({
      ...uiState,
      panels: uiState.panels.map(panel => {
        if (panel.timeline) {
          return {
            ...panel,
            timeline: {
              ...panel.timeline,
              rows: panel.timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    ...update,
                  };
                }
                return row;
              }),
            },
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
