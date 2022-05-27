import { writable, type Writable } from 'svelte/store';
import Toastify from 'toastify-js';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { getGqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activityTypeNames = getGqlSubscribable<Pick<ActivityType, 'name'>[]>(
  gql.SUB_ACTIVITY_TYPE_NAMES,
  { modelId: -1 },
  [],
);

export const dictionaries = getGqlSubscribable<CommandDictionary[]>(gql.SUB_COMMAND_DICTIONARIES, {}, []);

export const expansionRules = getGqlSubscribable<ExpansionRule[]>(gql.SUB_EXPANSION_RULES, {}, []);

export const expansionSets = getGqlSubscribable<ExpansionSet[]>(gql.SUB_EXPANSION_SETS, {}, []);

export const models = getGqlSubscribable<ModelInput[]>(gql.SUB_MODELS, {}, []);

export const sequences = getGqlSubscribable<ExpansionSet[]>(gql.SUB_SEQUENCES, {}, []);

/* Writeable. */

export const expansionRulesColumns: Writable<string> = writable('1fr 1px 1fr');

export const expansionSetsColumns: Writable<string> = writable('1fr 1px 1fr');

/* Action Functions. */

export const expansionActions = {
  async createExpansionRule(
    activity_type: string,
    expansion_logic: string,
    authoring_command_dict_id: number | null = null,
    authoring_mission_model_id: number | null = null,
  ): Promise<number | null> {
    const rule: ExpansionRuleInsertInput = {
      activity_type,
      authoring_command_dict_id,
      authoring_mission_model_id,
      expansion_logic,
    };
    const newRuleId = await req.createExpansionRule(rule);

    if (newRuleId !== null) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Created Successfully',
      }).showToast();
      return newRuleId;
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Create Failed',
      }).showToast();
      return null;
    }
  },

  async createExpansionSet(dictionaryId: number, modelId: number, expansionRuleIds: number[]): Promise<number | null> {
    const newSetId = await req.createExpansionSet(dictionaryId, modelId, expansionRuleIds);

    if (newSetId !== null) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Set Created Successfully',
      }).showToast();
      return newSetId;
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Set Create Failed',
      }).showToast();
      return null;
    }
  },

  async deleteExpansionRule(id: number): Promise<boolean> {
    const success = await req.deleteExpansionRule(id);

    if (success) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Deleted Successfully',
      }).showToast();
      return true;
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Delete Failed',
      }).showToast();
      return false;
    }
  },

  async deleteExpansionSet(id: number): Promise<boolean> {
    const success = await req.deleteExpansionSet(id);

    if (success) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Set Deleted Successfully',
      }).showToast();
      return true;
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Set Delete Failed',
      }).showToast();
      return false;
    }
  },

  async updateExpansionRule(id: number, rule: Partial<ExpansionRule>): Promise<boolean> {
    const success = await req.updateExpansionRule(id, rule);

    if (success) {
      Toastify({
        backgroundColor: '#2da44e',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Updated Successfully',
      }).showToast();
      return true;
    } else {
      Toastify({
        backgroundColor: '#a32a2a',
        duration: 3000,
        gravity: 'bottom',
        position: 'left',
        text: 'Expansion Rule Update Failed',
      }).showToast();
      return false;
    }
  },
};
