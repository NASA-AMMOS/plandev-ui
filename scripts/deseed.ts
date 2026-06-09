#!/usr/bin/env npx tsx
/**
 * Aerie De-Seed Script
 *
 * Removes all data created by the seed script.
 * Run with: npm run deseed
 *
 * Identifies seeded items by their naming pattern: "Name (animal-suffix)"
 * Deletes in reverse order to respect foreign key constraints.
 *
 * WARNING: this is GLOBAL, not run-scoped. It deletes every item DB-wide that
 * matches the seed sentinels (" • <animal>" names, the Seed_ / BananaSupplySource_ /
 * BananaDelivery_ prefixes), regardless of which run created it — so a human-named
 * plan like "Foo • bar" would also be removed.
 */

import { AerieApi } from '../e2e-tests/utilities/api.js';

// Pattern to identify seeded items: name ends with " • animal-suffix".
// The bullet sentinel is paired with the seed script and is vanishingly
// unlikely to collide with organically created plan/model/etc. names.
const isSeedItem = (name: string): boolean => / • [a-z][a-z-]*$/.test(name);

// External type name prefixes from seed script (actual names have _suffix appended)
const SEED_EXTERNAL_SOURCE_TYPE_PREFIX = 'BananaSupplySource_';
const SEED_EXTERNAL_EVENT_TYPE_PREFIX = 'BananaDelivery_';
// Dictionary mission name prefix from seed script
const SEED_DICTIONARY_MISSION_PREFIX = 'Seed_';

async function deseed() {
  console.log('Starting Aerie de-seed...\n');

  const api = new AerieApi();

  // Login
  console.log('Logging in as test user...');
  await api.login('test', 'test');
  console.log('Logged in successfully.\n');

  // Get all items
  console.log('Querying for seeded items...');
  const [
    models,
    plans,
    tags,
    constraints,
    schedulingGoals,
    schedulingConditions,
    views,
    derivationGroups,
    externalSources,
    externalSourceTypes,
    externalEventTypes,
    parcels,
    sequenceAdaptations,
    workspaces,
    commandDictionaries,
    channelDictionaries,
    parameterDictionaries,
    expansionRules,
    expansionSets,
    actionDefinitions,
    extensions,
  ] = await Promise.all([
    api.getModels(),
    api.getPlans(),
    api.getTags(),
    api.getConstraints(),
    api.getSchedulingGoals(),
    api.getSchedulingConditions(),
    api.getViews(),
    api.getDerivationGroups(),
    api.getExternalSources(),
    api.getExternalSourceTypes(),
    api.getExternalEventTypes(),
    api.getParcels(),
    api.getSequenceAdaptations(),
    api.getWorkspaces(),
    api.getCommandDictionaries(),
    api.getChannelDictionaries(),
    api.getParameterDictionaries(),
    api.getExpansionRules(),
    api.getExpansionSets(),
    api.getActionDefinitions(),
    api.getExtensions(),
  ]);

  // Filter for seeded items
  const seededModels = models.filter(m => isSeedItem(m.name));
  const seededPlans = plans.filter(p => isSeedItem(p.name));
  const seededTags = tags.filter(t => isSeedItem(t.name));
  const seededConstraints = constraints.filter(c => isSeedItem(c.name));
  const seededGoals = schedulingGoals.filter(g => isSeedItem(g.name));
  const seededConditions = schedulingConditions.filter(c => isSeedItem(c.name));
  const seededViews = views.filter(v => isSeedItem(v.name));
  // Derivation groups are identified by their ASCII source_type_name (the seed
  // intentionally omits the unicode marker from the group's name so the bulk
  // `_in`-based delete mutation works — see seed.ts for details).
  const seededDerivationGroups = derivationGroups.filter(dg =>
    dg.source_type_name.startsWith(SEED_EXTERNAL_SOURCE_TYPE_PREFIX),
  );
  // External sources belong to seeded derivation groups
  const seededDerivationGroupNames = new Set(seededDerivationGroups.map(dg => dg.name));
  const seededExternalSources = externalSources.filter(s => seededDerivationGroupNames.has(s.derivation_group_name));
  // External types use underscore+suffix pattern instead of parentheses
  const seededSourceTypes = externalSourceTypes.filter(t => t.name.startsWith(SEED_EXTERNAL_SOURCE_TYPE_PREFIX));
  const seededEventTypes = externalEventTypes.filter(t => t.name.startsWith(SEED_EXTERNAL_EVENT_TYPE_PREFIX));
  const seededParcels = parcels.filter(p => isSeedItem(p.name));
  const seededAdaptations = sequenceAdaptations.filter(a => isSeedItem(a.name));
  const seededWorkspaces = workspaces.filter(w => isSeedItem(w.name));
  // Dictionaries use mission name with Seed_ prefix
  const seededCommandDicts = commandDictionaries.filter(d => d.mission.startsWith(SEED_DICTIONARY_MISSION_PREFIX));
  const seededChannelDicts = channelDictionaries.filter(d => d.mission.startsWith(SEED_DICTIONARY_MISSION_PREFIX));
  const seededParamDicts = parameterDictionaries.filter(d => d.mission.startsWith(SEED_DICTIONARY_MISSION_PREFIX));
  // Expansion rules and sets use parentheses pattern
  const seededExpansionRules = expansionRules.filter(r => isSeedItem(r.name));
  const seededExpansionSets = expansionSets.filter(s => isSeedItem(s.name));
  // Action definitions use parentheses pattern
  const seededActionDefinitions = actionDefinitions.filter(a => isSeedItem(a.name));
  // Extensions use parentheses pattern
  const seededExtensions = extensions.filter(e => isSeedItem(e.label));

  console.log(`Found ${seededModels.length} seeded models`);
  console.log(`Found ${seededPlans.length} seeded plans`);
  console.log(`Found ${seededTags.length} seeded tags`);
  console.log(`Found ${seededConstraints.length} seeded constraints`);
  console.log(`Found ${seededGoals.length} seeded scheduling goals`);
  console.log(`Found ${seededConditions.length} seeded scheduling conditions`);
  console.log(`Found ${seededViews.length} seeded views`);
  console.log(`Found ${seededDerivationGroups.length} seeded derivation groups`);
  console.log(`Found ${seededExternalSources.length} seeded external sources`);
  console.log(`Found ${seededSourceTypes.length} seeded external source types`);
  console.log(`Found ${seededEventTypes.length} seeded external event types`);
  console.log(`Found ${seededParcels.length} seeded parcels`);
  console.log(`Found ${seededAdaptations.length} seeded sequence adaptations`);
  console.log(`Found ${seededWorkspaces.length} seeded workspaces`);
  console.log(`Found ${seededCommandDicts.length} seeded command dictionaries`);
  console.log(`Found ${seededChannelDicts.length} seeded channel dictionaries`);
  console.log(`Found ${seededParamDicts.length} seeded parameter dictionaries`);
  console.log(`Found ${seededExpansionRules.length} seeded expansion rules`);
  console.log(`Found ${seededExpansionSets.length} seeded expansion sets`);
  console.log(`Found ${seededActionDefinitions.length} seeded action definitions`);
  console.log(`Found ${seededExtensions.length} seeded extensions\n`);

  const totalSeeded =
    seededModels.length +
    seededPlans.length +
    seededTags.length +
    seededConstraints.length +
    seededGoals.length +
    seededConditions.length +
    seededViews.length +
    seededDerivationGroups.length +
    seededExternalSources.length +
    seededSourceTypes.length +
    seededEventTypes.length +
    seededParcels.length +
    seededAdaptations.length +
    seededWorkspaces.length +
    seededCommandDicts.length +
    seededChannelDicts.length +
    seededParamDicts.length +
    seededExpansionRules.length +
    seededExpansionSets.length +
    seededActionDefinitions.length +
    seededExtensions.length;

  if (totalSeeded === 0) {
    console.log('No seeded items found. Nothing to clean up.');
    return;
  }

  // Delete in reverse order of creation to respect foreign keys

  // 1. Delete plans (they reference models)
  if (seededPlans.length > 0) {
    console.log('Deleting plans...');
    for (const plan of seededPlans) {
      try {
        await api.deletePlan(plan.id);
        console.log(`  - Deleted plan: ${plan.name} (ID: ${plan.id})`);
      } catch (e) {
        console.log(`  - Failed to delete plan: ${plan.name} (ID: ${plan.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 2. Delete models
  if (seededModels.length > 0) {
    console.log('Deleting models...');
    for (const model of seededModels) {
      try {
        await api.deleteModel(model.id);
        console.log(`  - Deleted model: ${model.name} (ID: ${model.id})`);
      } catch (e) {
        console.log(`  - Failed to delete model: ${model.name} (ID: ${model.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 3. Delete external sources (they contain events and reference derivation groups)
  if (seededExternalSources.length > 0) {
    console.log('Deleting external sources...');
    // Group sources by derivation group for deletion
    const sourcesByGroup = new Map<string, string[]>();
    for (const source of seededExternalSources) {
      const existing = sourcesByGroup.get(source.derivation_group_name) ?? [];
      existing.push(source.key);
      sourcesByGroup.set(source.derivation_group_name, existing);
    }
    for (const [groupName, sourceKeys] of sourcesByGroup) {
      try {
        await api.deleteExternalSources(groupName, sourceKeys);
        for (const key of sourceKeys) {
          console.log(`  - Deleted external source: ${key} (group: ${groupName})`);
        }
      } catch (e) {
        console.log(`  - Failed to delete external sources in ${groupName}: ${e}`);
      }
    }
    console.log('');
  }

  // 4. Delete derivation groups
  if (seededDerivationGroups.length > 0) {
    console.log('Deleting derivation groups...');
    try {
      const names = seededDerivationGroups.map(dg => dg.name);
      await api.deleteDerivationGroups(names);
      for (const dg of seededDerivationGroups) {
        console.log(`  - Deleted derivation group: ${dg.name}`);
      }
    } catch (e) {
      console.log(`  - Failed to delete derivation groups: ${e}`);
    }
    console.log('');
  }

  // 5. Delete external event types (after events are deleted with sources)
  if (seededEventTypes.length > 0) {
    console.log('Deleting external event types...');
    try {
      const names = seededEventTypes.map(t => t.name);
      await api.deleteExternalEventTypes(names);
      for (const eventType of seededEventTypes) {
        console.log(`  - Deleted external event type: ${eventType.name}`);
      }
    } catch (e) {
      console.log(`  - Failed to delete external event types: ${e}`);
    }
    console.log('');
  }

  // 6. Delete external source types (after derivation groups are deleted)
  if (seededSourceTypes.length > 0) {
    console.log('Deleting external source types...');
    try {
      const names = seededSourceTypes.map(t => t.name);
      await api.deleteExternalSourceTypes(names);
      for (const sourceType of seededSourceTypes) {
        console.log(`  - Deleted external source type: ${sourceType.name}`);
      }
    } catch (e) {
      console.log(`  - Failed to delete external source types: ${e}`);
    }
    console.log('');
  }

  // 7. Delete action definitions (they reference workspaces)
  if (seededActionDefinitions.length > 0) {
    console.log('Deleting action definitions...');
    for (const action of seededActionDefinitions) {
      try {
        await api.deleteActionDefinition(action.id);
        console.log(`  - Deleted action definition: ${action.name} (ID: ${action.id})`);
      } catch (e) {
        console.log(`  - Failed to delete action definition: ${action.name} (ID: ${action.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 8. Delete extensions (no foreign key dependencies)
  if (seededExtensions.length > 0) {
    console.log('Deleting extensions...');
    for (const ext of seededExtensions) {
      try {
        await api.deleteExtension(ext.id);
        console.log(`  - Deleted extension: ${ext.label} (ID: ${ext.id})`);
      } catch (e) {
        console.log(`  - Failed to delete extension: ${ext.label} (ID: ${ext.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 9. Delete workspaces (they reference parcels)
  if (seededWorkspaces.length > 0) {
    console.log('Deleting workspaces...');
    for (const workspace of seededWorkspaces) {
      try {
        await api.deleteWorkspace(workspace.id);
        console.log(`  - Deleted workspace: ${workspace.name} (ID: ${workspace.id})`);
      } catch (e) {
        console.log(`  - Failed to delete workspace: ${workspace.name} (ID: ${workspace.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 10. Delete expansion sets (they reference expansion rules)
  if (seededExpansionSets.length > 0) {
    console.log('Deleting expansion sets...');
    for (const set of seededExpansionSets) {
      try {
        await api.deleteExpansionSet(set.id);
        console.log(`  - Deleted expansion set: ${set.name} (ID: ${set.id})`);
      } catch (e) {
        console.log(`  - Failed to delete expansion set: ${set.name} (ID: ${set.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 11. Delete expansion rules (they reference parcels)
  if (seededExpansionRules.length > 0) {
    console.log('Deleting expansion rules...');
    for (const rule of seededExpansionRules) {
      try {
        await api.deleteExpansionRule(rule.id);
        console.log(`  - Deleted expansion rule: ${rule.name} (ID: ${rule.id})`);
      } catch (e) {
        console.log(`  - Failed to delete expansion rule: ${rule.name} (ID: ${rule.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 12. Delete parcels (they reference dictionaries and expansion rules reference them)
  if (seededParcels.length > 0) {
    console.log('Deleting parcels...');
    for (const parcel of seededParcels) {
      try {
        await api.deleteParcel(parcel.id);
        console.log(`  - Deleted parcel: ${parcel.name} (ID: ${parcel.id})`);
      } catch (e) {
        console.log(`  - Failed to delete parcel: ${parcel.name} (ID: ${parcel.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 13. Delete dictionaries (after parcels since parcels reference them)
  if (seededCommandDicts.length > 0) {
    console.log('Deleting command dictionaries...');
    for (const dict of seededCommandDicts) {
      try {
        await api.deleteCommandDictionary(dict.id);
        console.log(`  - Deleted command dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id})`);
      } catch (e) {
        console.log(
          `  - Failed to delete command dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id}) - ${e}`,
        );
      }
    }
    console.log('');
  }

  if (seededChannelDicts.length > 0) {
    console.log('Deleting channel dictionaries...');
    for (const dict of seededChannelDicts) {
      try {
        await api.deleteChannelDictionary(dict.id);
        console.log(`  - Deleted channel dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id})`);
      } catch (e) {
        console.log(
          `  - Failed to delete channel dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id}) - ${e}`,
        );
      }
    }
    console.log('');
  }

  if (seededParamDicts.length > 0) {
    console.log('Deleting parameter dictionaries...');
    for (const dict of seededParamDicts) {
      try {
        await api.deleteParameterDictionary(dict.id);
        console.log(`  - Deleted parameter dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id})`);
      } catch (e) {
        console.log(
          `  - Failed to delete parameter dictionary: ${dict.mission} v${dict.version} (ID: ${dict.id}) - ${e}`,
        );
      }
    }
    console.log('');
  }

  // 14. Delete sequence adaptations
  if (seededAdaptations.length > 0) {
    console.log('Deleting sequence adaptations...');
    for (const adaptation of seededAdaptations) {
      try {
        await api.deleteSequenceAdaptation(adaptation.id);
        console.log(`  - Deleted sequence adaptation: ${adaptation.name} (ID: ${adaptation.id})`);
      } catch (e) {
        console.log(`  - Failed to delete sequence adaptation: ${adaptation.name} (ID: ${adaptation.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 15. Delete views
  if (seededViews.length > 0) {
    console.log('Deleting views...');
    for (const view of seededViews) {
      try {
        await api.deleteView(view.id);
        console.log(`  - Deleted view: ${view.name} (ID: ${view.id})`);
      } catch (e) {
        console.log(`  - Failed to delete view: ${view.name} (ID: ${view.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 16. Delete scheduling conditions
  if (seededConditions.length > 0) {
    console.log('Deleting scheduling conditions...');
    for (const condition of seededConditions) {
      try {
        await api.deleteSchedulingCondition(condition.id);
        console.log(`  - Deleted scheduling condition: ${condition.name} (ID: ${condition.id})`);
      } catch (e) {
        console.log(`  - Failed to delete scheduling condition: ${condition.name} (ID: ${condition.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 17. Delete scheduling goals
  if (seededGoals.length > 0) {
    console.log('Deleting scheduling goals...');
    for (const goal of seededGoals) {
      try {
        await api.deleteSchedulingGoal(goal.id);
        console.log(`  - Deleted scheduling goal: ${goal.name} (ID: ${goal.id})`);
      } catch (e) {
        console.log(`  - Failed to delete scheduling goal: ${goal.name} (ID: ${goal.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 18. Delete constraints
  if (seededConstraints.length > 0) {
    console.log('Deleting constraints...');
    for (const constraint of seededConstraints) {
      try {
        await api.deleteConstraint(constraint.id);
        console.log(`  - Deleted constraint: ${constraint.name} (ID: ${constraint.id})`);
      } catch (e) {
        console.log(`  - Failed to delete constraint: ${constraint.name} (ID: ${constraint.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // 19. Delete tags
  if (seededTags.length > 0) {
    console.log('Deleting tags...');
    for (const tag of seededTags) {
      try {
        await api.deleteTag(tag.id);
        console.log(`  - Deleted tag: ${tag.name} (ID: ${tag.id})`);
      } catch (e) {
        console.log(`  - Failed to delete tag: ${tag.name} (ID: ${tag.id}) - ${e}`);
      }
    }
    console.log('');
  }

  // Print summary
  console.log('========================================');
  console.log('De-Seed Complete!');
  console.log('========================================\n');
  console.log('Deleted:');
  console.log(`  External Sources: ${seededExternalSources.length}`);
  console.log(`  Derivation Groups: ${seededDerivationGroups.length}`);
  console.log(`  External Event Types: ${seededEventTypes.length}`);
  console.log(`  External Source Types: ${seededSourceTypes.length}`);
  console.log(`  Action Definitions: ${seededActionDefinitions.length}`);
  console.log(`  Extensions: ${seededExtensions.length}`);
  console.log(`  Workspaces: ${seededWorkspaces.length}`);
  console.log(`  Expansion Sets: ${seededExpansionSets.length}`);
  console.log(`  Expansion Rules: ${seededExpansionRules.length}`);
  console.log(`  Parcels: ${seededParcels.length}`);
  console.log(`  Command Dictionaries: ${seededCommandDicts.length}`);
  console.log(`  Channel Dictionaries: ${seededChannelDicts.length}`);
  console.log(`  Parameter Dictionaries: ${seededParamDicts.length}`);
  console.log(`  Sequence Adaptations: ${seededAdaptations.length}`);
  console.log(`  Views: ${seededViews.length}`);
  console.log(`  Scheduling Conditions: ${seededConditions.length}`);
  console.log(`  Scheduling Goals: ${seededGoals.length}`);
  console.log(`  Constraints: ${seededConstraints.length}`);
  console.log(`  Plans: ${seededPlans.length}`);
  console.log(`  Models: ${seededModels.length}`);
  console.log(`  Tags: ${seededTags.length}`);
}

// Run the deseed script
try {
  await deseed();
} catch (error) {
  console.error('De-seed failed:', error);
  process.exit(1);
}
