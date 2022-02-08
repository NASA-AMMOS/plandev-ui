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
  activityIds?: string[];
  resourceIds?: string[];
};

type ConstraintViolation = {
  associations: ConstraintViolationAssociations;
  constraint: Constraint;
  windows: TimeRange[];
};

type CreateConstraint = Omit<Constraint, 'id'>;

interface MouseOverViolations {
  e: MouseEvent;
  violations: ConstraintViolation[];
}
