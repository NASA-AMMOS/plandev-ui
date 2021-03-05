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
  ConstraintViolationListState,
  DecompositionTreeState,
  HorizontalGuide,
  Plan,
  Row,
  SimulationResult,
  StringTMap,
  TimeRange,
  VerticalGuide,
  View,
} from '../types';

export interface PlanningState {
  activityInstances: StringTMap<ActivityInstance> | null;
  activityTypes: StringTMap<ActivityType> | null;
  adaptations: StringTMap<Adaptation> | null;
  constraintViolationListState: ConstraintViolationListState;
  constraintViolations: ConstraintViolation[] | null;
  decompositionTreeState: DecompositionTreeState;
  lastActivityInstanceUpdate: number;
  lastSimulationTime: number;
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  selectedViewId: string | null;
  simulationResults: SimulationResult[] | null;
  viewTimeRange: TimeRange;
  views: View[];
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptations: null,
  constraintViolationListState: { category: {}, constraint: {} },
  constraintViolations: null,
  decompositionTreeState: { instance: {} },
  lastActivityInstanceUpdate: 0,
  lastSimulationTime: 0,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  selectedViewId: null,
  simulationResults: null,
  viewTimeRange: { end: 0, start: 0 },
  views: [],
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
  on(PlanningActions.deleteRow, (state, { row: removedRow, timelineId }) => ({
    ...state,
    views: state.views.map(view => ({
      ...view,
      sections: view.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: (section.timeline.rows || []).filter(
                (row: Row) => removedRow.id !== row.id,
              ),
            },
          };
        }
        return section;
      }),
    })),
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
    views: state.views.map(view => ({
      ...view,
      sections: view.sections.map(section => {
        if (section.timeline) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
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
        return section;
      }),
    })),
  })),
  on(
    PlanningActions.horizontalGuideDelete,
    (state, { guide: removedGuide, rowId }) => ({
      ...state,
      views: state.views.map(view => ({
        ...view,
        sections: view.sections.map(section => {
          if (section.timeline) {
            return {
              ...section,
              timeline: {
                ...section.timeline,
                rows: section.timeline.rows.map(row => {
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
          return section;
        }),
      })),
    }),
  ),
  on(
    PlanningActions.horizontalGuideUpdate,
    (state, { guide: updatedGuide, rowId }) => ({
      ...state,
      views: state.views.map(view => ({
        ...view,
        sections: view.sections.map(section => {
          if (section.timeline) {
            return {
              ...section,
              timeline: {
                ...section.timeline,
                rows: section.timeline.rows.map(row => {
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
          return section;
        }),
      })),
    }),
  ),
  on(PlanningActions.layerUpdate, (state, { layer: updatedLayer, rowId }) => ({
    ...state,
    views: state.views.map(view => ({
      ...view,
      sections: view.sections.map(section => {
        if (section.timeline) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
                if (row.id === rowId) {
                  return {
                    ...row,
                    layers: (row.layers || []).map(layer => {
                      if (layer.id === updatedLayer.id) {
                        return {
                          ...layer,
                          ...updatedLayer,
                        };
                      }
                      return layer;
                    }),
                  };
                }
                return row;
              }),
            },
          };
        }
        return section;
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
        constraintViolationListState: {
          ...violations.reduce(
            (
              constraintViolationListState: ConstraintViolationListState,
              violation,
            ) => {
              const { constraint } = violation;
              const { category, name } = constraint;
              if (
                state.constraintViolationListState.category[category] ===
                undefined
              ) {
                constraintViolationListState.category[category] = {
                  expanded: true,
                  visible: true,
                };
              }
              if (
                state.constraintViolationListState.constraint[name] ===
                undefined
              ) {
                constraintViolationListState.constraint[name] = {
                  expanded: false,
                  visible: true,
                };
              }
              return constraintViolationListState;
            },
            {
              ...state.constraintViolationListState,
              category: { ...state.constraintViolationListState.category },
              constraint: { ...state.constraintViolationListState.constraint },
            },
          ),
        },
        constraintViolations: violations.map(violation => ({
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
        lastActivityInstanceUpdate: now,
        lastSimulationTime: now,
        simulationResults: results || [],
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
  on(PlanningActions.updateAllViews, (state, { views }) => ({
    ...state,
    selectedViewId: views[0]?.id || null,
    views,
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
    views: state.views.map(view => ({
      ...view,
      sections: view.sections.map(section => {
        if (section.timeline) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              rows: section.timeline.rows.map(row => {
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
        return section;
      }),
    })),
  })),
  on(PlanningActions.updateConstraintViolationListState, (state, action) => ({
    ...state,
    constraintViolationListState: {
      ...state.constraintViolationListState,
      [action.formType]: {
        ...state.constraintViolationListState[action.formType],
        [action.formValue]: {
          ...state.constraintViolationListState[action.formType][
            action.formValue
          ],
          [action.key]: action.value,
        },
      },
    },
  })),
  on(PlanningActions.updateSelectedViewId, (state, { id }) => ({
    ...state,
    selectedViewId: id,
  })),
  on(PlanningActions.updateView, (state, action) => ({
    ...state,
    views: state.views.map(view => {
      if (action.id === view.id) {
        return {
          ...view,
          ...action.view,
        };
      }
      return view;
    }),
  })),
  on(PlanningActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
  on(PlanningActions.verticalGuideCreate, (state, { guide, timelineId }) => ({
    ...state,
    views: state.views.map(view => ({
      ...view,
      sections: view.sections.map(section => {
        if (section.timeline && section.timeline.id === timelineId) {
          return {
            ...section,
            timeline: {
              ...section.timeline,
              verticalGuides: section.timeline.verticalGuides
                ? [...section.timeline.verticalGuides, guide]
                : [guide],
            },
          };
        }
        return section;
      }),
    })),
  })),
  on(
    PlanningActions.verticalGuideDelete,
    (state, { guide: removedGuide, timelineId }) => ({
      ...state,
      views: state.views.map(view => ({
        ...view,
        sections: view.sections.map(section => {
          if (section.timeline && section.timeline.id === timelineId) {
            return {
              ...section,
              timeline: {
                ...section.timeline,
                verticalGuides: (section.timeline.verticalGuides || []).filter(
                  (guide: VerticalGuide) => removedGuide.id !== guide.id,
                ),
              },
            };
          }
          return section;
        }),
      })),
    }),
  ),
  on(
    PlanningActions.verticalGuideUpdate,
    (state, { guide: updatedGuide, timelineId }) => ({
      ...state,
      views: state.views.map(view => ({
        ...view,
        sections: view.sections.map(section => {
          if (section.timeline && section.timeline.id === timelineId) {
            return {
              ...section,
              timeline: {
                ...section.timeline,
                verticalGuides: (section.timeline.verticalGuides || []).map(
                  guide => {
                    if (updatedGuide.id === guide.id) {
                      return {
                        ...guide,
                        ...updatedGuide,
                      };
                    }
                    return guide;
                  },
                ),
              },
            };
          }
          return section;
        }),
      })),
    }),
  ),
);
