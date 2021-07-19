import { getUnixEpochTime } from '@gov.nasa.jpl.aerie/time';
import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import omit from 'lodash-es/omit';
import { PlanningActions } from '../actions';
import {
  ActivityInstance,
  ActivityType,
  Adaptation,
  Constraint,
  ConstraintViolation,
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
  adaptationConstraints: StringTMap<Constraint> | null;
  constraintViolations: ConstraintViolation[] | null;
  decompositionTreeState: DecompositionTreeState;
  lastActivityInstanceUpdate: number;
  lastSimulationTime: number;
  planConstraints: StringTMap<Constraint> | null;
  plans: StringTMap<Plan> | null;
  selectedActivityInstanceId: string | null;
  selectedPlan: Plan | null;
  simulationResults: SimulationResult[] | null;
  view: View | null;
  viewTimeRange: TimeRange;
}

export const initialState: PlanningState = {
  activityInstances: null,
  activityTypes: null,
  adaptationConstraints: null,
  adaptations: null,
  constraintViolations: null,
  decompositionTreeState: { instance: {} },
  lastActivityInstanceUpdate: 0,
  lastSimulationTime: 0,
  planConstraints: null,
  plans: null,
  selectedActivityInstanceId: null,
  selectedPlan: null,
  simulationResults: null,
  view: null,
  viewTimeRange: { end: 0, start: 0 },
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
  on(PlanningActions.deleteConstraintSuccess, (state, { constraint }) => {
    if (constraint.association === 'adaptation') {
      return {
        ...state,
        adaptationConstraints: omit(
          state.adaptationConstraints,
          constraint.name,
        ),
      };
    }
    if (constraint.association === 'plan') {
      return {
        ...state,
        planConstraints: omit(state.planConstraints, constraint.name),
      };
    }
    return state;
  }),
  on(PlanningActions.deletePlanSuccess, (state, { id }) => ({
    ...state,
    plans: omit(state.plans, id),
  })),
  on(PlanningActions.deleteRow, (state, { row: removedRow, timelineId }) => ({
    ...state,
    view: {
      ...state.view,
      sections: state.view.sections.map(section => {
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
    },
  })),
  on(PlanningActions.getAdaptationsSuccess, (state, { adaptations }) => ({
    ...state,
    adaptations: keyBy(adaptations, 'id'),
  })),
  on(PlanningActions.getPlanDetailSuccess, (state, { plan }) => ({
    ...state,
    activityInstances: keyBy(plan.activityInstances, 'id'),
    activityTypes: keyBy(plan.adaptation?.activityTypes || [], 'name'),
    adaptationConstraints: keyBy(
      (plan.adaptation?.constraints || []).map(constraint => ({
        ...constraint,
        association: 'adaptation',
      })),
      'name',
    ),
    planConstraints: keyBy(
      (plan.constraints || []).map(constraint => ({
        ...constraint,
        association: 'plan',
      })),
      'name',
    ),
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
    view: {
      ...state.view,
      sections: state.view.sections.map(section => {
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
    },
  })),
  on(
    PlanningActions.horizontalGuideDelete,
    (state, { guide: removedGuide, rowId }) => ({
      ...state,
      view: {
        ...state.view,
        sections: state.view.sections.map(section => {
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
      },
    }),
  ),
  on(
    PlanningActions.horizontalGuideUpdate,
    (state, { guide: updatedGuide, rowId }) => ({
      ...state,
      view: {
        ...state.view,
        sections: state.view.sections.map(section => {
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
      },
    }),
  ),
  on(PlanningActions.layerUpdate, (state, { layer: updatedLayer, rowId }) => ({
    ...state,
    view: {
      ...state.view,
      sections: state.view.sections.map(section => {
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
    },
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
  on(PlanningActions.setView, (state, { view }) => ({
    ...state,
    view,
  })),
  on(PlanningActions.sortRows, (state, action) => {
    return {
      ...state,
      view: {
        ...state.view,
        sections: state.view.sections.map(section => {
          if (section.timeline && action.sortedRows[section.timeline.id]) {
            return {
              ...section,
              timeline: {
                ...section.timeline,
                rows: action.sortedRows[section.timeline.id],
              },
            };
          }
          return section;
        }),
      },
    };
  }),
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
  on(PlanningActions.updateConstraintSuccess, (state, { constraint }) => {
    if (constraint.association === 'adaptation') {
      return {
        ...state,
        adaptationConstraints: {
          ...state.adaptationConstraints,
          [constraint.name]: {
            ...state.adaptationConstraints[constraint.name],
            ...constraint,
          },
        },
      };
    }

    if (constraint.association === 'plan') {
      return {
        ...state,
        planConstraints: {
          ...state.planConstraints,
          [constraint.name]: {
            ...state.planConstraints[constraint.name],
            ...constraint,
          },
        },
      };
    }

    return state;
  }),
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
    view: {
      ...state.view,
      sections: state.view.sections.map(section => {
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
    },
  })),
  on(PlanningActions.updateSelectedViewId, (state, { id }) => ({
    ...state,
    selectedViewId: id,
  })),
  on(PlanningActions.updateView, (state, action) => ({
    ...state,
    view: {
      ...state.view,
      ...action.view,
    },
  })),
  on(PlanningActions.updateViewTimeRange, (state, { viewTimeRange }) => ({
    ...state,
    viewTimeRange,
  })),
  on(PlanningActions.verticalGuideCreate, (state, { guide, timelineId }) => ({
    ...state,
    views: {
      ...state.view,
      sections: state.view.sections.map(section => {
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
    },
  })),
  on(
    PlanningActions.verticalGuideDelete,
    (state, { guide: removedGuide, timelineId }) => ({
      ...state,
      views: {
        ...state.view,
        sections: state.view.sections.map(section => {
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
      },
    }),
  ),
  on(
    PlanningActions.verticalGuideUpdate,
    (state, { guide: updatedGuide, timelineId }) => ({
      ...state,
      view: {
        ...state.view,
        sections: state.view.sections.map(section => {
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
      },
    }),
  ),
);
