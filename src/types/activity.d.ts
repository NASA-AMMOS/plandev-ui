type ActivityId = number;

type ActivityDirectiveId = number;

type ActivitySimulatedId = number;

type ActivityType = {
  computed_attributes_value_schema: ValueSchema;
  name: string;
  parameters: ParametersMap;
  required_parameters: string[];
};

type ActivityTypeExpansionRules = {
  expansion_rules: ExpansionRule[];
  name: ActivityType['name'];
};

type ActivityTypesMap = Record<string, ActivityType>;

type Activity = {
  arguments: ArgumentsMap;
  attributes: ActivitySimulatedAttributes | null;
  child_ids: ActivityId[];
  duration: string | null;
  id: ActivityId;
  parent_id: ActivityId | null;
  simulated_activity_id: ActivitySimulatedId | null;
  simulation_dataset_id: number | null;
  start_time: string;
  type: string;
  unfinished: boolean;
};

type ActivitiesForPlanResponse = {
  activity_directives: ActivityDirective[];
  simulations: [{ datasets: [{ simulated_activities: ActivitySimulated[] }] }];
  start_time: string;
};

type ActivitiesMap = Record<ActivityId, Activity>;

type ActivityDirective = {
  arguments: ArgumentsMap;
  id: ActivityDirectiveId;
  simulated_activities: [ActivitySimulated];
  start_offset: string;
  type: string;
};

type ActivityDirectiveInsertInput = {
  arguments: ArgumentsMap;
  plan_id: number;
  start_offset: string;
  type: string;
};

type ActivityDirectiveSetInput = Partial<ActivityDirectiveInsertInput>;

type ActivitySimulatedAttributes = {
  arguments: ArgumentsMap;
  computedAttributes: ArgumentsMap;
};

type ActivitySimulated = {
  activity_type_name: string;
  attributes: ActivitySimulatedAttributes;
  duration: string;
  id: ActivitySimulatedId;
  parent_id: number | null;
  simulation_dataset_id: number;
  start_offset: string;
};
