type Constraint = {
  definition: string;
  description: string;
  id: number;
  modelId: number | null;
  name: string;
  planId: number | null;
  summary: string;
};

type ConstraintViolationAssociations = {
  activityIds?: number[];
  resourceIds?: string[];
};

type ConstraintViolation = {
  associations: ConstraintViolationAssociations;
  constraint: Pick<Constraint, 'name'>;
  windows: TimeRange[];
};

type CreateConstraint = Omit<Constraint, 'id'>;

type MouseOverViolations = {
  e: MouseEvent;
  violations: ConstraintViolation[];
};
