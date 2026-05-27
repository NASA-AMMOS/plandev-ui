#!/usr/bin/env npx tsx
/**
 * Aerie Seed Script
 *
 * Populates Aerie with sample test data for development and testing.
 * Run with: npm run seed
 *
 * Creates:
 * - 1 model (banananation)
 * - 4 plans with varying durations and activity counts
 * - 5 tags with different colors
 * - 3 constraints
 * - 2 scheduling goals
 * - 1 scheduling condition
 * - 2 views with different layouts
 * - 1 external source with events
 * - 1 external dataset per plan (resource profiles)
 * - 1 command dictionary, 1 channel dictionary, 1 parameter dictionary
 * - 1 sequence adaptation
 * - 1 parcel bundling the dictionaries
 * - 3 expansion rules (one per activity type)
 * - 1 expansion set bundling the rules
 * - 2 workspaces using the parcel
 * - 10 workspace files in first workspace (sequences, text, binary, image, json, folders)
 * - ~1305 workspace items in second workspace (5 projects × 10 modules with deep nesting)
 * - 1 action definition in the first workspace
 * - 1 extension (demo plan analyzer, requires local extension server)
 */

import fs from 'fs';
import { animals, uniqueNamesGenerator } from 'unique-names-generator';
import { AerieApi } from '../e2e-tests/utilities/api.js';
import { ConstraintDefinitionType } from '../src/enums/constraint.js';
import { SchedulingDefinitionType } from '../src/enums/scheduling.js';
import type { ActivityDirectiveInsertInput } from '../src/types/activity.js';
import type { SchedulingConditionInsertInput } from '../src/types/scheduling.js';
import { ResourceType } from '../src/types/simulation.js';
import { getIntervalFromDoyRange, getUnixEpochTime } from '../src/utilities/time.js';
import { generateDefaultView } from '../src/utilities/view.js';

// Seed marker — embedded in human-readable names so deseed can identify
// seeded items unambiguously (a plain "(word)" suffix collides with organic names).
// The bullet acts as both visual separator and the seed sentinel.
const SEED_MARKER = '•';

// Generate unique suffix for this seed run
const uniqueSuffix = uniqueNamesGenerator({ dictionaries: [animals], separator: '-' });

// Suffix appended to human-readable names as `Name • animal`. ASCII-only
// `uniqueSuffix` is still used for filesystem paths, dictionary mission names,
// and external type names.
const seedNameSuffix = `${SEED_MARKER} ${uniqueSuffix}`;

// Banana-themed tags with colors
const TAGS = [
  { color: '#fbbf24', name: 'Ripe' },
  { color: '#84cc16', name: 'Unripe' },
  { color: '#7c3aed', name: 'Organic' },
  { color: '#f97316', name: 'Premium' },
  { color: '#64748b', name: 'Bruised' },
];

// Cluster centers for realistic activity distribution (as fraction of plan duration)
// Creates operational windows with gaps between them
const CLUSTER_CENTERS = [0.05, 0.15, 0.25, 0.4, 0.55, 0.7, 0.8, 0.92];

// Generate clustered offset - activities grouped around operational windows
function getClusteredOffset(index: number, totalCount: number, planDurationMinutes: number): number {
  // Assign activity to a cluster based on index
  const clusterIndex = index % CLUSTER_CENTERS.length;
  const clusterCenter = CLUSTER_CENTERS[clusterIndex];

  // Spread within cluster (tighter for more activities, wider for fewer)
  const spread = Math.min(0.08, 0.5 / Math.sqrt(totalCount));

  // Box-Muller transform for gaussian-like distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Position within cluster (clamped to 0-1 range)
  const position = Math.max(0, Math.min(1, clusterCenter + gaussian * spread));

  return Math.floor(position * planDurationMinutes * 0.95);
}

// Activity generators with realistic arguments
type ActivityGenerator = (
  planId: number,
  index: number,
  totalCount: number,
  planDurationMinutes: number,
) => ActivityDirectiveInsertInput;

const activityGenerators: Record<string, ActivityGenerator> = {
  BiteBanana: (planId, index, totalCount, planDurationMinutes) => {
    const biteSizes = [1, 2, 10, 100, 1000];
    const offsetMinutes = getClusteredOffset(index, totalCount, planDurationMinutes);
    return {
      anchor_id: null,
      anchored_to_start: true,
      arguments: { biteSize: biteSizes[index % biteSizes.length] },
      metadata: {},
      name: `Bite Banana #${index + 1}`,
      plan_id: planId,
      start_offset: formatOffset(offsetMinutes),
      type: 'BiteBanana',
    };
  },

  GrowBanana: (planId, index, totalCount, planDurationMinutes) => {
    const quantities = [1, 2, 10, 100, 1000];
    // Durations in microseconds: 1hr, 2hr, 4hr, 8hr
    const durationsUs = [3_600_000_000, 7_200_000_000, 14_400_000_000, 28_800_000_000];
    const offsetMinutes = getClusteredOffset(index, totalCount, planDurationMinutes);
    return {
      anchor_id: null,
      anchored_to_start: true,
      arguments: {
        growingDuration: durationsUs[index % durationsUs.length],
        quantity: quantities[index % quantities.length],
      },
      metadata: {},
      name: `Grow Batch #${index + 1}`,
      plan_id: planId,
      start_offset: formatOffset(offsetMinutes),
      type: 'GrowBanana',
    };
  },

  PeelBanana: (planId, index, totalCount, planDurationMinutes) => {
    const directions = ['fromStem', 'fromTip'];
    const offsetMinutes = getClusteredOffset(index, totalCount, planDurationMinutes);
    return {
      anchor_id: null,
      anchored_to_start: true,
      arguments: { peelDirection: directions[index % directions.length] },
      metadata: {},
      name: `Peel Banana #${index + 1}`,
      plan_id: planId,
      start_offset: formatOffset(offsetMinutes),
      type: 'PeelBanana',
    };
  },

  PickBanana: (planId, index, totalCount, planDurationMinutes) => {
    const quantities = [5, 10, 15, 20, 25, 50];
    const offsetMinutes = getClusteredOffset(index, totalCount, planDurationMinutes);
    return {
      anchor_id: null,
      anchored_to_start: true,
      arguments: { quantity: quantities[index % quantities.length] },
      metadata: {},
      name: `Harvest #${index + 1}`,
      plan_id: planId,
      start_offset: formatOffset(offsetMinutes),
      type: 'PickBanana',
    };
  },
};

function formatOffset(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
}

// Plan configurations - diverse scenarios
interface PlanConfig {
  activityMix: Record<string, number>; // activity type -> count
  description: string;
  endTime: string;
  name: string;
  startTime: string;
}

const PLANS: PlanConfig[] = [
  {
    // Short daily operations plan
    activityMix: { BiteBanana: 5, GrowBanana: 2, PeelBanana: 5, PickBanana: 3 },
    description: 'Daily operations with routine activities',
    endTime: '2024-002T00:00:00',
    name: 'Daily Ops',
    startTime: '2024-001T00:00:00',
  },
  {
    // Week-long harvest cycle
    activityMix: { BiteBanana: 15, GrowBanana: 10, PeelBanana: 15, PickBanana: 20 },
    description: 'Weekly harvest and processing cycle',
    endTime: '2024-008T00:00:00',
    name: 'Weekly Harvest',
    startTime: '2024-001T00:00:00',
  },
  {
    // Month-long production run (1K activities)
    activityMix: { BiteBanana: 250, GrowBanana: 200, PeelBanana: 250, PickBanana: 300 },
    description: 'Monthly production cycle with high throughput',
    endTime: '2024-032T00:00:00',
    name: 'Monthly Production',
    startTime: '2024-001T00:00:00',
  },
  {
    // Quarter-long mission (10K activities)
    activityMix: { BiteBanana: 2500, GrowBanana: 2000, PeelBanana: 2500, PickBanana: 3000 },
    description: 'Full quarterly mission with comprehensive operations',
    endTime: '2024-091T00:00:00',
    name: 'Q1 Mission',
    startTime: '2024-001T00:00:00',
  },
];

// Constraint definitions (EDSL format)
const CONSTRAINTS = [
  {
    definition: `export default function fruitAvailable(): Constraint { return Real.Resource('/fruit').greaterThanOrEqual(1); }`,
    description: 'Ensure fruit resource stays above minimum threshold',
    name: 'Fruit Availability',
  },
  {
    definition: `export default function peelConstraint(): Constraint { return Real.Resource('/peel').greaterThanOrEqual(0); }`,
    description: 'Peel count should never go negative',
    name: 'Peel Non-Negative',
  },
  {
    definition: `export default function producerCheck(): Constraint { return Real.Resource('/producer').lessThanOrEqual(100); }`,
    description: 'Producer resource should not exceed capacity',
    name: 'Producer Capacity',
  },
];

// Scheduling goal definitions
const SCHEDULING_GOALS = [
  {
    definition: `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.GrowBanana({ quantity: 10, growingDuration: 3600000000 }), interval: Temporal.Duration.from({ hours: 24 }) })`,
    description: 'Grow bananas daily to maintain supply',
    name: 'Daily Banana Growth',
  },
  {
    definition: `export default (): Goal => Goal.ActivityRecurrenceGoal({ activityTemplate: ActivityTemplates.PickBanana({ quantity: 5 }), interval: Temporal.Duration.from({ hours: 12 }) })`,
    description: 'Harvest bananas twice daily',
    name: 'Regular Harvest',
  },
];

// Scheduling condition definitions
const SCHEDULING_CONDITIONS: Array<Omit<SchedulingConditionInsertInput, 'tags' | 'versions'> & { definition: string }> =
  [
    {
      definition: `export default (): GlobalSchedulingCondition => GlobalSchedulingCondition.scheduleActivitiesOnlyWhen(Real.Resource("/fruit").greaterThan(5.0))`,
      description: 'Only schedule activities when fruit inventory is sufficient',
      name: 'Fruit Inventory Check',
      public: true,
    },
  ];

// View configurations - each with different grid layouts
const VIEW_CONFIGS = [
  {
    // Default mission view
    name: 'Mission Default',
  },
  {
    // Timeline-focused view with hidden sidebars
    grid: {
      columnSizes: '1fr',
      leftHidden: true,
      middleRowSizes: '1fr',
      middleSplit: false,
      rightHidden: true,
    },
    name: 'Timeline Focus',
  },
  {
    // Table-focused view with activity table prominent
    grid: {
      columnSizes: '3fr 3px 1fr',
      leftHidden: true,
      middleRowSizes: '1fr 3px 2fr',
      middleSplit: true,
      rightComponentBottom: 'ConstraintsPanel',
      rightComponentTop: 'ActivityFormPanel',
      rightHidden: false,
    },
    name: 'Table View',
  },
];

// External source/event configuration
const EXTERNAL_SOURCE_TYPE = 'BananaSupplySource';
const EXTERNAL_EVENT_TYPE = 'BananaDelivery';

const EXTERNAL_EVENTS = [
  {
    attributes: { quantity: 100, supplier: 'Tropical Farms' },
    duration: '01:00:00',
    key: 'delivery-001',
    start_time: '2024-001T08:00:00',
  },
  {
    attributes: { quantity: 250, supplier: 'Island Growers' },
    duration: '02:00:00',
    key: 'delivery-002',
    start_time: '2024-003T10:00:00',
  },
  {
    attributes: { quantity: 150, supplier: 'Tropical Farms' },
    duration: '01:30:00',
    key: 'delivery-003',
    start_time: '2024-005T14:00:00',
  },
];

// External dataset (resource profiles) configuration
// Duration is in microseconds: 1 minute = 60,000,000 µs
const MINUTE_US = 60_000_000;

// Generate external dataset profiles with semi-random data and gaps
function generateExternalDataset(startTime: string, durationHours: number) {
  // Scale segment duration based on plan length to keep total segments reasonable
  // Target ~150 segments per profile regardless of plan duration
  const targetSegments = 150;
  const segmentMinutes = Math.max(10, Math.ceil((durationHours * 60) / targetSegments));
  const segmentCount = Math.floor((durationHours * 60) / segmentMinutes);

  const ripenessStates = ['green', 'yellow-green', 'yellow', 'spotted', 'brown', 'overripe'];
  const segments: Array<{ duration: number; dynamics?: unknown }> = [];

  for (let i = 0; i < segmentCount; i++) {
    const duration = Math.round((segmentMinutes + Math.random() * 10) * MINUTE_US);
    if (Math.random() < 0.15) {
      segments.push({ duration });
    } else {
      segments.push({ duration, dynamics: ripenessStates[i % ripenessStates.length] });
    }
  }

  // Battery: random initial/rate values
  const batterySegments: Array<{ duration: number; dynamics?: unknown }> = [];
  for (let i = 0; i < segmentCount; i++) {
    const duration = Math.round((segmentMinutes + Math.random() * 10) * MINUTE_US);
    if (Math.random() < 0.15) {
      batterySegments.push({ duration });
    } else {
      batterySegments.push({
        duration,
        dynamics: { initial: 20 + Math.random() * 80, rate: -3 + Math.random() * 6 },
      });
    }
  }

  // Temperature: random values 12-16
  const tempSegments: Array<{ duration: number; dynamics?: unknown }> = [];
  for (let i = 0; i < segmentCount; i++) {
    const duration = Math.round((segmentMinutes + Math.random() * 10) * MINUTE_US);
    if (Math.random() < 0.15) {
      tempSegments.push({ duration });
    } else {
      tempSegments.push({ duration, dynamics: Math.round((12 + Math.random() * 4) * 10) / 10 });
    }
  }

  return {
    datasetStart: startTime,
    profileSet: {
      '/bananaRipeness': {
        schema: { type: 'string' },
        segments,
        type: 'discrete' as const,
      },
      '/batteryEnergy': {
        schema: {
          items: { initial: { type: 'real' }, rate: { type: 'real' } },
          type: 'struct',
        },
        segments: batterySegments,
        type: 'real' as const,
      },
      '/storageTemp': {
        schema: { type: 'real' },
        segments: tempSegments,
        type: 'discrete' as const,
      },
    },
  };
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function seed() {
  const seedStart = performance.now();
  console.log(`Starting Aerie seed ${seedNameSuffix}...\n`);

  const api = new AerieApi();

  // Login
  console.log('Logging in as test user...');
  await api.login('test', 'test');
  console.log('Logged in successfully.\n');

  // Upload JAR
  console.log('Uploading banananation JAR...');
  const jarId = await api.uploadFile('e2e-tests/data/banananation-develop.jar');
  console.log(`JAR uploaded with ID: ${jarId}\n`);

  // Create model
  const modelName = `Banananation ${seedNameSuffix}`;
  console.log('Creating model...');
  const model = await api.createModel({
    description: 'Seeded model for development and testing',
    jar_id: jarId,
    mission: 'Banananation',
    name: modelName,
    version: '1.0.0',
  });
  console.log(`Model created with ID: ${model.id}`);

  // Create tags
  console.log('Creating tags...');
  const createdTags: Array<{ id: number; name: string }> = [];
  for (const tag of TAGS) {
    const tagName = `${tag.name} ${seedNameSuffix}`;
    const created = await api.createTag(tagName, tag.color);
    createdTags.push({ id: created.id, name: tagName });
    console.log(`  - Created tag: ${tagName} (ID: ${created.id})`);
  }
  console.log('');

  // Create plans and activities
  console.log('Creating plans and activities...');
  const createdPlans: Array<{
    activityCount: number;
    durationHours: number;
    id: number;
    name: string;
    startTime: string;
  }> = [];

  for (const planConfig of PLANS) {
    // Create plan with unique name
    const planName = `${planConfig.name} ${seedNameSuffix}`;
    const plan = await api.createPlan({
      duration: getIntervalFromDoyRange(planConfig.startTime, planConfig.endTime),
      model_id: model.id,
      name: planName,
      start_time: planConfig.startTime,
    });

    const totalActivities = Object.values(planConfig.activityMix).reduce((a, b) => a + b, 0);
    console.log(`  - Created plan: ${planName} (ID: ${plan.id})`);
    console.log(`    ${planConfig.description}`);
    console.log(`    Creating ${totalActivities} activities...`);

    // Calculate plan duration in minutes for activity spacing
    const startMs = getUnixEpochTime(planConfig.startTime);
    const endMs = getUnixEpochTime(planConfig.endTime);
    const planDurationMinutes = Math.floor((endMs - startMs) / (1000 * 60));

    // Build activities for each type
    const activities: ActivityDirectiveInsertInput[] = [];
    for (const [activityType, count] of Object.entries(planConfig.activityMix)) {
      const generator = activityGenerators[activityType];
      for (let i = 0; i < count; i++) {
        activities.push(generator(plan.id, i, count, planDurationMinutes));
      }
    }

    // Shuffle activities to interleave types (more realistic)
    for (let i = activities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activities[i], activities[j]] = [activities[j], activities[i]];
    }

    // Sort by start_offset for cleaner timeline
    activities.sort((a, b) => {
      const parseOffset = (offset: string) => {
        const [h, m] = offset.split(':').map(Number);
        return h * 60 + m;
      };
      return parseOffset(a.start_offset) - parseOffset(b.start_offset);
    });

    // Bulk insert in batches of 1000
    const BATCH_SIZE = 1000;
    const planInsertStart = performance.now();
    const batchTimings: number[] = [];
    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
      const batch = activities.slice(i, i + BATCH_SIZE);
      const batchStart = performance.now();
      await api.createActivityDirectives(batch);
      const batchMs = performance.now() - batchStart;
      batchTimings.push(batchMs);
      const done = Math.min(i + BATCH_SIZE, totalActivities);
      const rate = Math.round(batch.length / (batchMs / 1000));
      console.log(`      Progress: ${done}/${totalActivities} (batch=${fmtMs(batchMs)}, ${rate} rows/s)`);
    }
    const planInsertMs = performance.now() - planInsertStart;
    const overallRate = Math.round(totalActivities / (planInsertMs / 1000));
    const avgBatch = batchTimings.reduce((a, b) => a + b, 0) / batchTimings.length;
    const minBatch = Math.min(...batchTimings);
    const maxBatch = Math.max(...batchTimings);
    console.log(
      `    Created ${totalActivities} activities in ${fmtMs(planInsertMs)} (${overallRate} rows/s, ` +
        `batch avg=${fmtMs(avgBatch)} min=${fmtMs(minBatch)} max=${fmtMs(maxBatch)})`,
    );

    const durationHours = planDurationMinutes / 60;
    createdPlans.push({
      activityCount: totalActivities,
      durationHours,
      id: plan.id,
      name: planName,
      startTime: planConfig.startTime,
    });
  }

  // Create constraints
  console.log('\nCreating constraints...');
  const createdConstraints: Array<{ id: number; name: string }> = [];
  for (const constraint of CONSTRAINTS) {
    const constraintName = `${constraint.name} ${seedNameSuffix}`;
    const created = await api.createConstraint({
      description: constraint.description,
      name: constraintName,
      public: true,
      tags: { data: [] },
      versions: {
        data: [
          {
            definition: constraint.definition,
            tags: { data: [] },
            type: ConstraintDefinitionType.EDSL,
            uploaded_jar_id: null,
          },
        ],
      },
    });
    createdConstraints.push({ id: created.id, name: constraintName });
    console.log(`  - Created constraint: ${constraintName} (ID: ${created.id})`);
  }

  // Create scheduling goals
  console.log('\nCreating scheduling goals...');
  const createdGoals: Array<{ id: number; name: string }> = [];
  for (const goal of SCHEDULING_GOALS) {
    const goalName = `${goal.name} ${seedNameSuffix}`;
    const created = await api.createSchedulingGoal({
      description: goal.description,
      name: goalName,
      public: true,
      tags: { data: [] },
      versions: {
        data: [
          {
            definition: goal.definition,
            tags: { data: [] },
            type: SchedulingDefinitionType.EDSL,
            uploaded_jar_id: null,
          },
        ],
      },
    });
    createdGoals.push({ id: created.id, name: goalName });
    console.log(`  - Created scheduling goal: ${goalName} (ID: ${created.id})`);
  }

  // Create scheduling conditions
  console.log('\nCreating scheduling conditions...');
  const createdConditions: Array<{ id: number; name: string }> = [];
  for (const condition of SCHEDULING_CONDITIONS) {
    const conditionName = `${condition.name} ${seedNameSuffix}`;
    const created = await api.createSchedulingCondition({
      description: condition.description,
      name: conditionName,
      public: true,
      tags: { data: [] },
      versions: {
        data: [
          {
            definition: condition.definition,
            tags: { data: [] },
          },
        ],
      },
    });
    createdConditions.push({ id: created.id, name: conditionName });
    console.log(`  - Created scheduling condition: ${conditionName} (ID: ${created.id})`);
  }

  // Associate constraints, goals, and conditions with the model
  console.log('\nAssociating library items with model...');
  await api.addConstraintModelSpecifications(
    model.id,
    createdConstraints.map(c => ({ constraintId: c.id })),
  );
  console.log(`  - Associated ${createdConstraints.length} constraints with model`);

  await api.addSchedulingGoalModelSpecifications(
    model.id,
    createdGoals.map((g, index) => ({ goalId: g.id, priority: index })),
  );
  console.log(`  - Associated ${createdGoals.length} scheduling goals with model`);

  await api.addSchedulingConditionModelSpecifications(
    model.id,
    createdConditions.map(c => ({ conditionId: c.id })),
  );
  console.log(`  - Associated ${createdConditions.length} scheduling conditions with model`);

  // Create external source and event types first (needed for views)
  console.log('\nCreating external source types...');
  // Derivation group name is intentionally ASCII-only (no marker): we identify
  // seeded ones in deseed via their ASCII source_type_name, which lets the
  // bulk `_in`-based delete mutation work (Hasura's `_in` silently no-ops on
  // strings containing non-ASCII characters).
  const derivationGroupName = `Banana Supply ${uniqueSuffix}`;
  const sourceTypeName = `${EXTERNAL_SOURCE_TYPE}_${uniqueSuffix.replace(/-/g, '_')}`;
  const eventTypeName = `${EXTERNAL_EVENT_TYPE}_${uniqueSuffix.replace(/-/g, '_')}`;
  const eventTypeSchema = {
    properties: { quantity: { type: 'number' }, supplier: { type: 'string' } },
    required: [],
    type: 'object',
  };

  await api.createExternalSourceEventTypes(
    { [sourceTypeName]: { properties: {}, required: [], type: 'object' } },
    { [eventTypeName]: eventTypeSchema },
  );
  console.log(`  - Created external source type: ${sourceTypeName}`);
  console.log(`  - Created external event type: ${eventTypeName}`);

  // Create derivation group and upload sources
  console.log('\nCreating external sources...');

  // Create derivation group
  await api.createDerivationGroup({
    name: derivationGroupName,
    source_type_name: sourceTypeName,
  });
  console.log(`  - Created derivation group: ${derivationGroupName}`);

  // Upload external source with events
  const sourceKey = `supply-source-${uniqueSuffix}`;
  await api.uploadExternalSource(derivationGroupName, {
    events: EXTERNAL_EVENTS.map(e => ({
      attributes: e.attributes,
      duration: e.duration,
      event_type_name: eventTypeName,
      key: e.key,
      start_time: e.start_time,
    })),
    source: {
      attributes: {},
      key: sourceKey,
      period: { end_time: '2024-010T00:00:00', start_time: '2024-001T00:00:00' },
      source_type_name: sourceTypeName,
      valid_at: '2024-001T00:00:00',
    },
  });
  console.log(`  - Uploaded external source: ${sourceKey} with ${EXTERNAL_EVENTS.length} events`);

  // Associate the derivation group with each plan
  for (const plan of createdPlans) {
    await api.createPlanDerivationGroup(plan.id, derivationGroupName);
    console.log(`  - Associated derivation group with plan: ${plan.name}`);
  }

  // Create external dataset (resource profiles) for each plan
  console.log('\nCreating external datasets...');
  const createdDatasets: Array<{ id: number; planName: string }> = [];

  // Generate first dataset to derive profile schemas for view generation
  const firstDataset = generateExternalDataset(createdPlans[0].startTime, createdPlans[0].durationHours);
  const externalDatasetProfiles: ResourceType[] = Object.entries(firstDataset.profileSet).map(([name, profile]) => ({
    name,
    schema: profile.schema as ResourceType[][number]['schema'],
  }));
  const profileNames = externalDatasetProfiles.map(p => p.name);

  for (const plan of createdPlans) {
    const dataset = generateExternalDataset(plan.startTime, plan.durationHours);
    const datasetId = await api.createExternalDataset(plan.id, dataset);
    createdDatasets.push({ id: datasetId, planName: plan.name });
    console.log(`  - Created external dataset (ID: ${datasetId}) on plan ${plan.name} (${plan.durationHours}h)`);
  }
  console.log(`    Profiles: ${profileNames.join(', ')}`);

  // Fetch resource types for view generation
  const resourceTypes = await api.getResourceTypes(model.id);
  console.log(`Fetched ${resourceTypes.length} resource types from model\n`);

  // Create views with different configurations (using resource types and external event types)
  console.log('\nCreating views...');
  const externalEventTypes = [{ attribute_schema: eventTypeSchema, name: eventTypeName }];
  const allResourceTypes = [...resourceTypes, ...externalDatasetProfiles];

  const createdViews: Array<{ id: number; name: string }> = [];
  for (const viewConfig of VIEW_CONFIGS) {
    const viewName = `${viewConfig.name} ${seedNameSuffix}`;
    const defaultView = generateDefaultView(allResourceTypes, externalEventTypes);
    Object.assign(defaultView.definition.plan.grid, viewConfig.grid);
    const created = await api.createView({
      definition: defaultView.definition,
      name: viewName,
    });
    createdViews.push({ id: created.id, name: viewName });
    console.log(`  - Created view: ${viewName} (ID: ${created.id})`);
  }

  // Set the "Mission Default" view as the model's default view
  const missionDefaultView = createdViews.find(v => v.name.includes('Mission Default'));
  if (missionDefaultView) {
    await api.updateModel(model.id, { default_view_id: missionDefaultView.id });
    console.log(`  - Set model default view to: ${missionDefaultView.name} (ID: ${missionDefaultView.id})`);
  }

  // Create dictionaries and parcel
  console.log('\nCreating dictionaries and parcel...');

  // Mission name for dictionaries - use suffix to make them identifiable as seeded
  const missionName = `Seed_${uniqueSuffix}`;

  // Read and upload command dictionary with customized mission name
  const commandDictXml = fs
    .readFileSync('e2e-tests/data/command-dictionary.xml', 'utf-8')
    .replace('mission_name="GENERIC"', `mission_name="${missionName}"`);
  const commandDictResult = await api.createDictionary(commandDictXml);
  const commandDictId = commandDictResult.command?.id;
  if (commandDictId == null) {
    throw new Error('Command dictionary creation failed: no command ID returned');
  }
  console.log(`  - Created command dictionary (ID: ${commandDictId}, mission: ${missionName})`);

  // Read and upload channel dictionary with customized mission name
  const channelDictXml = fs
    .readFileSync('e2e-tests/data/channel-dictionary.xml', 'utf-8')
    .replace('mission_name="GENERIC"', `mission_name="${missionName}"`);
  const channelDictResult = await api.createDictionary(channelDictXml);
  const channelDictId = channelDictResult.channel?.id;
  console.log(`  - Created channel dictionary (ID: ${channelDictId}, mission: ${missionName})`);

  // Read and upload parameter dictionary with customized mission name
  const paramDictXml = fs
    .readFileSync('e2e-tests/data/parameter-dictionary.xml', 'utf-8')
    .replace('mission_name="GENERIC"', `mission_name="${missionName}"`);
  const paramDictResult = await api.createDictionary(paramDictXml);
  const paramDictId = paramDictResult.parameter?.id;
  console.log(`  - Created parameter dictionary (ID: ${paramDictId}, mission: ${missionName})`);

  // Read and upload sequence adaptation
  const adaptationCode = fs.readFileSync('e2e-tests/data/sequence-adaptation.js', 'utf-8');
  const adaptationName = `Seed Adaptation ${seedNameSuffix}`;
  const adaptationResult = await api.createSequenceAdaptation({
    adaptation: adaptationCode,
    name: adaptationName,
  });
  console.log(`  - Created sequence adaptation: ${adaptationResult.name}`);

  // Create parcel bundling the dictionaries
  const parcelName = `Seed Parcel ${seedNameSuffix}`;
  const parcel = await api.createParcel({
    channel_dictionary_id: channelDictId ?? null,
    command_dictionary_id: commandDictId,
    name: parcelName,
    sequence_adaptation_id: null, // Adaptations are linked separately
  });
  console.log(`  - Created parcel: ${parcelName} (ID: ${parcel.id})`);

  // Create expansion rules and set
  console.log('\nCreating expansion rules and set...');
  const expansionRules = [
    {
      activity_type: 'BiteBanana',
      description: 'Expands BiteBanana activity to bite commands',
      expansion_logic: `export default function({ activityInstance: ActivityType }): ExpansionReturn {
  return [
    C.FSW_CMD_0({
      enum_arg_0: "ON",
      boolean_arg_0: true,
      float_arg_0: 0.5
    })
  ];
}`,
      name: `BiteBanana Expansion ${seedNameSuffix}`,
    },
    {
      activity_type: 'PeelBanana',
      description: 'Expands PeelBanana activity to peel commands',
      expansion_logic: `export default function({ activityInstance: ActivityType }): ExpansionReturn {
  return [
    C.FSW_CMD_1({
      float_arg_0: 1.0,
      integer_arg_0: 10,
      time_arg_0: "2024-001T00:00:00",
      unsigned_arg_0: 100,
      var_string_arg_0: "0000"
    })
  ];
}`,
      name: `PeelBanana Expansion ${seedNameSuffix}`,
    },
    {
      activity_type: 'PickBanana',
      description: 'Expands PickBanana activity to FSW commands',
      expansion_logic: `export default function({ activityInstance: ActivityType }): ExpansionReturn {
  return [
    C.FSW_CMD_0({
      enum_arg_0: "OFF",
      boolean_arg_0: false,
      float_arg_0: 1.0
    })
  ];
}`,
      name: `PickBanana Expansion ${seedNameSuffix}`,
    },
  ];

  const createdExpansionRules: Array<{ id: number; name: string }> = [];
  for (const rule of expansionRules) {
    const created = await api.createExpansionRule({
      activity_type: rule.activity_type,
      authoring_mission_model_id: model.id,
      description: rule.description,
      expansion_logic: rule.expansion_logic,
      name: rule.name,
      parcel_id: parcel.id,
    });
    createdExpansionRules.push({ id: created.id, name: rule.name });
    console.log(`  - Created expansion rule: ${rule.name} (ID: ${created.id})`);
  }

  // Create expansion set bundling all rules
  const expansionSetName = `Seed Expansion Set ${seedNameSuffix}`;
  const expansionSet = await api.createExpansionSet(
    parcel.id,
    model.id,
    createdExpansionRules.map(r => r.id),
    expansionSetName,
    'Expansion set containing all seeded expansion rules',
  );
  console.log(`  - Created expansion set: ${expansionSetName} (ID: ${expansionSet.id})`);

  // Create workspace using the parcel
  console.log('\nCreating workspace...');
  const workspaceName = `Seed Workspace ${seedNameSuffix}`;
  const workspaceLocation = `seed_workspace_${uniqueSuffix}`;
  const workspaceId = await api.createWorkspace(workspaceLocation, parcel.id, workspaceName);
  console.log(`  - Created workspace: ${workspaceName} (ID: ${workspaceId}, location: ${workspaceLocation})`);

  // Create action definition in the workspace
  console.log('\nCreating action...');
  const actionName = `Seed Action ${seedNameSuffix}`;
  const actionDescription = 'Demo action that fetches data from GitHub API';
  const action = await api.createActionDefinition(
    workspaceId,
    actionName,
    actionDescription,
    'e2e-tests/data/aerie-action-demo.js',
  );
  console.log(`  - Created action: ${actionName} (ID: ${action.id})`);

  // Create extension
  // Extensions receive POST with { planId, selectedActivityDirectiveId, simulationDatasetId, gateway, hasura }
  // and must return { success: boolean, message: string, url: string }
  console.log('\nCreating extension...');
  const extensionName = `Plan Analyzer ${seedNameSuffix}`;
  const extensionDescription =
    'Demo extension - analyzes plan data and opens results (requires local extension server)';
  const extensionUrl = 'http://localhost:8000/analyze';
  const extension = await api.createExtension(extensionName, extensionUrl, extensionDescription, ['aerie_admin']);
  console.log(`  - Created extension: ${extensionName} (ID: ${extension.id})`);

  // Create workspace files
  console.log('\nCreating workspace files...');

  // Reusable content
  const sequenceContent = `@ID "seed_sequence"\n\nC FSW_CMD_0 "ON" true 0.5\nC FSW_CMD_1 1.0 10 "2024-001T00:00:00" 100 "0000"\n`;
  const textContent = `Seed Workspace Notes\n====================\n\nCreated by seed script. Suffix: ${uniqueSuffix}\n`;
  const jsonContent = JSON.stringify({ seeded_json: uniqueSuffix }, null, 2);
  const binaryContent = new Uint8Array(256).map(() => Math.floor(Math.random() * 256));
  // Minimal valid JPEG (1x1 pixel)
  // prettier-ignore
  const jpegContent = new Uint8Array([
    0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,0x00,0x01,0x00,0x00,
    0xff,0xdb,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,0x07,0x07,0x07,0x09,0x09,0x08,0x0a,0x0c,
    0x14,0x0d,0x0c,0x0b,0x0b,0x0c,0x19,0x12,0x13,0x0f,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,0x1c,0x1c,0x20,
    0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,
    0x39,0x3d,0x38,0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0x00,0x0b,0x08,0x00,0x01,0x00,0x01,0x01,0x01,
    0x11,0x00,0xff,0xc4,0x00,0x1f,0x00,0x00,0x01,0x05,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,0x09,0x0a,0x0b,0xff,0xc4,0x00,0xb5,0x10,
    0x00,0x02,0x01,0x03,0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7d,0x01,0x02,0x03,0x00,
    0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,
    0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,
    0x25,0x26,0x27,0x28,0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
    0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6a,0x73,0x74,0x75,
    0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,
    0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,
    0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
    0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9,0xfa,0xff,0xda,
    0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0xfb,0xd5,0xdb,0x20,0xa8,0xf1,0x45,0x14,0x00,0xff,0xd9,
  ]);

  // Define workspace structure: { path, content? } - undefined content = folder
  const workspaceItems: Array<{ content?: string | Uint8Array; path: string }> = [
    { content: sequenceContent, path: 'seed_sequence.seq' },
    { content: textContent, path: 'seed_notes.txt' },
    { content: binaryContent, path: 'seed_data.bin' },
    { content: jpegContent, path: 'seed_image.jpg' },
    { content: jsonContent, path: 'seed_data.json' },
    { path: 'seed_folder' }, // folder
    { content: sequenceContent, path: 'seed_folder/folder_sequence.seq' },
    { content: binaryContent, path: 'seed_folder/folder_data.bin' },
    { path: 'seed_folder/nested' }, // nested folder
    { content: sequenceContent, path: 'seed_folder/nested/nested_sequence.seq' },
  ];

  for (const item of workspaceItems) {
    await api.createWorkspaceItem(workspaceId, item.path, item.content);
    const isFolder = item.content === undefined;
    console.log(`  - Created ${item.path}${isFolder ? '/' : ''}`);
  }

  // Create second workspace with thousands of files for performance testing
  console.log('\nCreating large workspace...');
  const largeWorkspaceName = `Large Workspace ${seedNameSuffix}`;
  const largeWorkspaceLocation = `large_workspace_${uniqueSuffix}`;
  const largeWorkspaceId = await api.createWorkspace(largeWorkspaceLocation, parcel.id, largeWorkspaceName);
  console.log(`  - Created workspace: ${largeWorkspaceName} (ID: ${largeWorkspaceId})`);

  // Generate thousands of files with deep nesting
  const projects = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const fileMap: Record<string, Uint8Array<ArrayBuffer> | string> = {
    '.bin': binaryContent,
    '.json': jsonContent,
    '.seq': sequenceContent,
    '.txt': textContent,
  };
  const fileTypes = Object.keys(fileMap);
  let largeWorkspaceItemCount = 0;

  for (const project of projects) {
    // Create project folder (must exist before children)
    await api.createWorkspaceItem(largeWorkspaceId, `project_${project}`);
    largeWorkspaceItemCount++;

    for (let m = 1; m <= 10; m++) {
      const modulePath = `project_${project}/module_${m.toString().padStart(2, '0')}`;
      // Create module folder
      await api.createWorkspaceItem(largeWorkspaceId, modulePath);
      largeWorkspaceItemCount++;

      // Create regular files in module in parallel
      const filePromises: Promise<void>[] = [];
      for (let f = 1; f <= 15; f++) {
        const ext = fileTypes[(f - 1) % fileTypes.length];
        const filePath = `${modulePath}/file_${f.toString().padStart(3, '0')}${ext}`;
        const content = fileMap[ext];
        filePromises.push(api.createWorkspaceItem(largeWorkspaceId, filePath, content));
        largeWorkspaceItemCount++;
      }
      await Promise.all(filePromises);

      // Add deep nesting for every other module (up to 7 levels deep)
      if (m % 2 === 1) {
        const depths = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];
        let currentPath = modulePath;
        for (const depth of depths) {
          currentPath = `${currentPath}/${depth}`;
          // Create nested folder (must exist before children)
          await api.createWorkspaceItem(largeWorkspaceId, currentPath);
          largeWorkspaceItemCount++;
          // Create files at this level in parallel
          const nestedFilePromises: Promise<void>[] = [];
          for (let f = 1; f <= 3; f++) {
            const ext = fileTypes[(f - 1) % fileTypes.length];
            const content = fileMap[ext];
            nestedFilePromises.push(
              api.createWorkspaceItem(largeWorkspaceId, `${currentPath}/nested_${f}${ext}`, content),
            );
            largeWorkspaceItemCount++;
          }
          await Promise.all(nestedFilePromises);
        }
      }
    }
    console.log(`    - Created project_${project}/ with nested folders`);
  }
  console.log(`  - Total: ${largeWorkspaceItemCount} items`);

  // Print summary
  console.log('\n========================================');
  console.log('Seed Complete!');
  console.log('========================================\n');
  console.log(`Unique suffix: ${uniqueSuffix}`);
  console.log('Created resources:');
  console.log(`  Model: ${model.id} (${modelName})`);
  console.log(`  Tags: ${createdTags.length}`);
  for (const tag of createdTags) {
    console.log(`    - ${tag.name} (ID: ${tag.id})`);
  }
  console.log(`  Plans: ${createdPlans.length}`);
  for (const plan of createdPlans) {
    console.log(`    - ${plan.name} (ID: ${plan.id}, ${plan.activityCount} activities)`);
  }
  console.log(`  Constraints: ${createdConstraints.length}`);
  for (const constraint of createdConstraints) {
    console.log(`    - ${constraint.name} (ID: ${constraint.id})`);
  }
  console.log(`  Scheduling Goals: ${createdGoals.length}`);
  for (const goal of createdGoals) {
    console.log(`    - ${goal.name} (ID: ${goal.id})`);
  }
  console.log(`  Scheduling Conditions: ${createdConditions.length}`);
  for (const condition of createdConditions) {
    console.log(`    - ${condition.name} (ID: ${condition.id})`);
  }
  console.log(`  Views: ${createdViews.length}`);
  for (const view of createdViews) {
    console.log(`    - ${view.name} (ID: ${view.id})`);
  }
  console.log(`  External Sources: 1 derivation group with ${EXTERNAL_EVENTS.length} events`);
  console.log(
    `  External Datasets: ${createdDatasets.length} (one per plan, each with ${profileNames.length} profiles)`,
  );
  console.log(`  Dictionaries (mission: ${missionName}):`);
  console.log(`    - Command Dictionary (ID: ${commandDictId})`);
  console.log(`    - Channel Dictionary (ID: ${channelDictId})`);
  console.log(`    - Parameter Dictionary (ID: ${paramDictId})`);
  console.log(`  Sequence Adaptation: ${adaptationName}`);
  console.log(`  Parcel: ${parcelName} (ID: ${parcel.id})`);
  console.log(`  Expansion Rules: ${createdExpansionRules.length}`);
  for (const rule of createdExpansionRules) {
    console.log(`    - ${rule.name} (ID: ${rule.id})`);
  }
  console.log(`  Expansion Set: ${expansionSetName} (ID: ${expansionSet.id})`);
  console.log(`  Workspaces: 2`);
  console.log(`    - ${workspaceName} (ID: ${workspaceId}, ${workspaceItems.length} items)`);
  console.log(`    - ${largeWorkspaceName} (ID: ${largeWorkspaceId}, ${largeWorkspaceItemCount} items)`);
  console.log(`  Action: ${actionName} (ID: ${action.id})`);
  console.log(`  Extension: ${extensionName} (ID: ${extension.id})`);
  console.log('\nYou can now view these in the Aerie UI at http://localhost:3000');

  const totalMs = performance.now() - seedStart;
  console.log(`\nTotal seed time: ${fmtMs(totalMs)}`);
}

// Run the seed script
seed().catch(error => {
  console.error('Seed failed:', error);
  process.exit(1);
});
