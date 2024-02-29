/**
 * Want another example? https://github.com/statelyai/xstate-viz/blob/cd128a15486d9253edaaa360ee6c1b150f293f5c/public/ts-worker.js#L59
 * (this is basically the only example of this working on the internet!)
 */
import type { CommandDictionary } from '@nasa-jpl/aerie-ampcs';
import type { Diagnostic, TypeScriptWorker as InternalTsWorker } from '../types/monaco-internal';
import { generateCommandArgumentDiagnostics } from './diagnostics/commandArgumentsDiagnostics';
import { generateTimeDiagnostics } from './diagnostics/timeDiagnostics';
import { getModelName as getModelId } from './workerHelpers';

// Appease the TSC - this special window object is read by the Custom Worker implementation of Monaco
declare class TsWorkerOverride implements Partial<InternalTsWorker> {}

type Instantiable = { new (...args: any[]): any };

declare global {
  interface Window {
    customTSWorkerFactory: (tsw: InternalTsWorker & Instantiable) => typeof TsWorkerOverride;
  }
}

type ModelId = string;

type CreateModelData = {
  command_dict_str: string;
  model_id: ModelId;
  should_inject: boolean;
};

type ModelData = {
  command_dict: CommandDictionary;
  model_id: ModelId;
  should_inject: boolean;
};

/**
 * The first thing you need to do to add to the worker interface!
 * All type safety is derived from this, so don't mess up :P
 */
export interface WorkerOverrideProps {
  updateModelConfig(model_data: CreateModelData): Promise<void>;
}

// Partial is required here as we only need to provide some subclass methods
// However, we must implement all of our override methods, as there is no superclass implementation present!
export interface WorkerSubclass extends Partial<InternalTsWorker>, WorkerOverrideProps {}

/**
 * Main custom TypeScript worker.
 * Implement here whatever overrides we need.
 */
self.customTSWorkerFactory = tsw => {
  return class extends tsw implements WorkerSubclass {
    private model_configurations: Record<ModelId, ModelData>;

    constructor(...args: any) {
      super(...args);
      this.model_configurations = {};
    }

    /**
     * @warning Be very careful when overriding completions to make sure you
     * are not overriding default completions.
     */
    async getCompletionsAtPosition(fileName: string, position: number) {
      const completions = await super.getCompletionsAtPosition(fileName, position);
      return completions;
    }

    async getSemanticDiagnostics(fileName: string): Promise<Diagnostic[]> {
      const diagnostics = await super.getSemanticDiagnostics(fileName);
      const model_id = getModelId(fileName);
      const model_config: ModelData | null =
        model_id !== null && this.model_configurations[model_id] ? this.model_configurations[model_id] : null;

      if (model_config !== null && model_config.should_inject === true) {
        diagnostics.push(...generateTimeDiagnostics(fileName, this._languageService));
        diagnostics.push(
          ...generateCommandArgumentDiagnostics(fileName, this._languageService, model_config.command_dict),
        );
      }

      return diagnostics;
    }

    async getSuggestionDiagnostics(fileName: string): Promise<Diagnostic[]> {
      const diagnostics = await super.getSuggestionDiagnostics(fileName);
      return diagnostics;
    }

    async getSyntacticDiagnostics(fileName: string): Promise<Diagnostic[]> {
      const diagnostics = await super.getSyntacticDiagnostics(fileName);
      return diagnostics;
    }

    async updateModelConfig(model_data: CreateModelData): Promise<void> {
      this.model_configurations[model_data.model_id] = {
        command_dict: JSON.parse(model_data.command_dict_str),
        model_id: model_data.model_id,
        should_inject: model_data.should_inject,
      };
    }
  };
};
