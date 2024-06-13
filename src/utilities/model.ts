import type { ModelLog, ModelSlim, ModelStatus, ModelStatusRollup } from '../types/model';

export function getModelStatusRollup(
  model?: Partial<
    Pick<ModelSlim, 'refresh_activity_type_logs' | 'refresh_model_parameter_logs' | 'refresh_resource_type_logs'>
  >,
): ModelStatusRollup {
  let activityLog: ModelLog | null = null;
  let activityLogStatus: ModelStatus = 'none';
  let parameterLog: ModelLog | null = null;
  let parameterLogStatus: ModelStatus = 'none';
  let resourceLog: ModelLog | null = null;
  let resourceLogStatus: ModelStatus = 'none';
  let modelStatus: ModelStatus = 'none';

  if (model) {
    const {
      refresh_activity_type_logs: activityLogs,
      refresh_model_parameter_logs: parameterLogs,
      refresh_resource_type_logs: resourceLogs,
    } = model;

    if (activityLogs) {
      activityLog = activityLogs[0] ?? null;
      if (activityLog) {
        if (activityLog.success) {
          activityLogStatus = 'complete';
        } else {
          activityLogStatus = 'error';
        }
      } else {
        activityLogStatus = 'extracting';
      }
    }

    if (parameterLogs) {
      parameterLog = parameterLogs[0] ?? null;
      if (parameterLog) {
        if (parameterLog.success) {
          parameterLogStatus = 'complete';
        } else {
          parameterLogStatus = 'error';
        }
      } else {
        parameterLogStatus = 'extracting';
      }
    }

    if (resourceLogs) {
      resourceLog = resourceLogs[0] ?? null;
      if (resourceLog) {
        if (resourceLog.success) {
          resourceLogStatus = 'complete';
        } else {
          resourceLogStatus = 'error';
        }
      } else {
        resourceLogStatus = 'extracting';
      }
    }

    if (activityLogStatus === 'error' || parameterLogStatus === 'error' || resourceLogStatus === 'error') {
      modelStatus = 'error';
    } else if (
      activityLogStatus === 'complete' &&
      parameterLogStatus === 'complete' &&
      resourceLogStatus === 'complete'
    ) {
      modelStatus = 'complete';
    } else if (
      activityLogStatus === 'extracting' ||
      parameterLogStatus === 'extracting' ||
      resourceLogStatus === 'extracting'
    ) {
      modelStatus = 'extracting';
    }
  }

  return {
    activityLog,
    activityLogStatus,
    modelStatus,
    parameterLog,
    parameterLogStatus,
    resourceLog,
    resourceLogStatus,
  };
}
