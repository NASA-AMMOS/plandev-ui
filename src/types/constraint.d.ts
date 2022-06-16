type Constraint = {
  definition: string;
  description: string;
  id: number;
  model_id: number | null;
  name: string;
  plan_id: number | null;
  summary: string;
};

type ConstraintInsertInput = Omit<Constraint, 'id'>;

type ConstraintType = 'model' | 'plan';

type ConstraintViolationAssociations = {
  activityInstanceIds: number[];
  resourceIds: string[];
};

type ConstraintViolation = {
  associations: ConstraintViolationAssociations;
  constraintName: Constraint['name'];
  windows: TimeRange[];
};

type ConstraintViolationsMap = Record<Constraint['name'], Omit<ConstraintViolation, 'constraintName'>[]>;

type MouseOverViolations = {
  e: MouseEvent;
  violations: ConstraintViolation[];
};
