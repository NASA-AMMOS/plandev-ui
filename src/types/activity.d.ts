type ActivityId = number;
type ActivityDirectiveId = number;
type ActivityUniqueId = string;

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
  childUniqueIds: ActivityUniqueId[];
  created_at: string;
  duration: string | null;
  id: ActivityId;
  last_modified_at: string;
  metadata: ActivityMetadata;
  name: string;
  parentUniqueId: ActivityUniqueId | null;
  parent_id: ActivityId | null;
  plan_id: number;
  simulated_activity_id: SpanId | null;
  source_scheduling_goal_id: number;
  start_time_doy: string;
  tags: string[];
  type: string;
  unfinished: boolean;
  uniqueId: ActivityUniqueId;
};

type ActivitiesMap = Record<ActivityUniqueId, Activity>;

type ActivityDirective = {
  arguments: ArgumentsMap;
  created_at: string;
  id: ActivityDirectiveId;
  last_modified_arguments_at: string;
  last_modified_at: string;
  metadata: ActivityMetadata;
  name: string;
  plan_id: number;
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
