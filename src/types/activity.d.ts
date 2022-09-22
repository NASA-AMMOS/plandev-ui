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
  created_at: string;
  duration: string | null;
  id: ActivityId;
  last_modified_at: string;
  metadata: ActivityMetadata;
  name: string;
  parent_id: ActivityId | null;
  simulated_activity_id: ActivitySimulatedId | null;
  simulation_dataset_id: number | null;
  source_scheduling_goal_id: number;
  start_time: string;
  tags: string[];
  type: string;
  unfinished: boolean;
};

type ActivitiesMap = Record<ActivityId, Activity>;

type ActivityDirective = {
  arguments: ArgumentsMap;
  created_at: string;
  id: ActivityDirectiveId;
  last_modified_at: string;
  metadata: ActivityMetadata;
  name: string;
  simulated_activities: [ActivitySimulated];
  source_scheduling_goal_id: number;
  start_offset: string;
  tags: string[];
  type: string;
};

type ActivityDirectiveInsertInput = {
  arguments: ArgumentsMap;
  metadata: ActivityMetadata;
  name: string;
  plan_id: number;
  start_offset: string;
  tags: string; // Hasura does not accept arrays so this must be in the form of "{1,2,3,...,n}"
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

type SubActivitiesResponse = {
  activity_directives: ActivityDirective[];
  simulations: [{ simulation_datasets: [{ simulated_activities: ActivitySimulated[] }] }];
  start_time: string;
};
