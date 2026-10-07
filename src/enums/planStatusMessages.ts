export enum PlanStatusMessages {
  READ_ONLY = 'This plan is read only.',
}

export enum PlanImportStatus {
  IMPORTING_PLAN = 'importing_plan',
  EXTRACTING_MODEL = 'extracting_model',
  IMPORTING_DATASET = 'importing_dataset',
  COMPLETE = 'complete', // This one is currently not needed for the UI as it is being filtered out
  FAILED = 'failed',
}
