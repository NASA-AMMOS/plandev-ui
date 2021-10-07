import type { Readable, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type {
  Parameter,
  ParameterMap,
  ParameterSchema,
  ParameterSchemaMap,
} from '../types';
import { keyBy } from '../utilities/generic';
import { reqUpdateModelArguments, reqUploadFiles } from '../utilities/requests';

/* Stores. */

export const modelParametersMap: Writable<ParameterSchemaMap> = writable({});
export const modelParameters = derived(
  modelParametersMap,
  $modelParametersMap => Object.values($modelParametersMap),
) as Readable<ParameterSchema[]>;

export const modelArgumentsMap: Writable<ParameterMap> = writable({});
export const modelArguments = derived(modelArgumentsMap, $modelArguments =>
  Object.values($modelArguments),
) as Readable<Parameter[]>;

/* Utility Functions. */

export async function updateModelArguments(
  planId: string,
  newModelArguments: Parameter[],
  newFiles: File[],
  authorization: string,
): Promise<void> {
  try {
    await reqUpdateModelArguments(planId, newModelArguments, authorization);
    await reqUploadFiles(newFiles, authorization);
    modelArgumentsMap.set(keyBy(newModelArguments, 'name'));
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Arguments Updated Successfully',
    }).showToast();
  } catch (e) {
    console.log(e);
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Arguments Update Failed',
    }).showToast();
  }
}
