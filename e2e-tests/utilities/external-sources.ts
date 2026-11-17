/**
 * Namespaced external-source test data.
 *
 * Source types, event types, derivation groups and sources are global in the backend, so suites that
 * share names race each other (one suite's cleanup deletes what another suite is still using). Every
 * fixture built here clones an existing e2e data file and suffixes all of its identities with a fresh
 * namespace, so each setup execution owns a disjoint set of records and cleanup can delete exactly
 * those records and nothing else.
 *
 * Building a fixture only generates payloads; nothing touches the backend until you seed it, so
 * UI-upload tests can use the payloads without pre-uploading them.
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import type { AerieApi } from './api.js';

export const EXAMPLE_SCHEMA_FILE = 'e2e-tests/data/Schema_Example_Source.json';
export const EXAMPLE_SOURCE_FILE = 'e2e-tests/data/example-external-source.json';
export const EMPTY_ATTR_SOURCE_FILE = 'e2e-tests/data/example-external-source_empty-attr.json';
export const NO_ATTR_SOURCE_FILE = 'e2e-tests/data/example-external-source_no-attr.json';
export const MDG_SCHEMA_FILE = 'e2e-tests/data/Schema_MDG_Source.json';
export const MDG_SOURCE_FILE = 'e2e-tests/data/mdg-external-source.json';

type SchemaMap = Record<string, { title?: string } & object>;

export type TypeSchemas = { event_types: SchemaMap; source_types: SchemaMap };

type ExternalSourceJson = {
  events: ({ event_type_name: string; key: string; start_time: string } & object)[];
  source: { derivation_group_name: string; key: string; source_type_name: string } & object;
};

/** In-memory file in the shape Playwright's `setInputFiles` accepts. */
export type UploadFile = { buffer: Buffer; mimeType: string; name: string };

export type ExternalSourceFixture = {
  derivationGroup: string;
  /** Every event type the source references: schema-defined and gateway-created alike. */
  eventTypes: string[];
  /** Name the source file is uploaded under. */
  fileName: string;
  namespace: string;
  /** Type schemas to upload first; absent when the gateway creates empty types during source upload. */
  schemas?: TypeSchemas;
  sourceJson: ExternalSourceJson;
  sourceKey: string;
  sourceType: string;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/**
 * Clone `sourceFile` (and optionally `schemaFile`) under a fresh namespace. Dates, durations,
 * attributes, relationships and schema bodies are preserved; only identities change.
 */
export function buildExternalSourceFixture(sourceFile: string, schemaFile?: string): ExternalSourceFixture {
  const namespace = randomUUID().slice(0, 8);
  const ns = (name: string) => `${name}_${namespace}`;
  const original = readJson<ExternalSourceJson>(sourceFile);

  const baseName = sourceFile
    .split('/')
    .at(-1)!
    .replace(/\.json$/, '');
  const fileName = `${baseName}_${namespace}.json`;
  const sourceKey = original.source.key.replace(/(\.json)?$/, `_${namespace}$1`);

  const sourceJson: ExternalSourceJson = {
    events: original.events.map(event => ({ ...event, event_type_name: ns(event.event_type_name) })),
    source: {
      ...original.source,
      derivation_group_name: ns(original.source.derivation_group_name),
      key: sourceKey,
      source_type_name: ns(original.source.source_type_name),
    },
  };

  let schemas: TypeSchemas | undefined;
  if (schemaFile) {
    const rename = (map: SchemaMap): SchemaMap =>
      Object.fromEntries(
        Object.entries(map).map(([name, schema]) => [
          ns(name),
          schema.title === name ? { ...schema, title: ns(name) } : schema,
        ]),
      );
    const originalSchemas = readJson<TypeSchemas>(schemaFile);
    schemas = { event_types: rename(originalSchemas.event_types), source_types: rename(originalSchemas.source_types) };
  }

  return {
    derivationGroup: sourceJson.source.derivation_group_name,
    eventTypes: [
      ...new Set([...Object.keys(schemas?.event_types ?? {}), ...sourceJson.events.map(e => e.event_type_name)]),
    ],
    fileName,
    namespace,
    schemas,
    sourceJson,
    sourceKey,
    sourceType: sourceJson.source.source_type_name,
  };
}

/** The source file as the UI upload form receives it. */
export function sourceUploadFile(fixture: ExternalSourceFixture): UploadFile {
  return {
    buffer: Buffer.from(JSON.stringify(fixture.sourceJson)),
    mimeType: 'application/json',
    name: fixture.fileName,
  };
}

/** The type-schema file as the UI "Type JSON Schema File" input receives it. */
export function schemaUploadFile(fixture: ExternalSourceFixture): UploadFile {
  if (!fixture.schemas) {
    throw new Error('This fixture was built without a schema file');
  }
  return {
    buffer: Buffer.from(JSON.stringify(fixture.schemas)),
    mimeType: 'application/json',
    name: `schema_${fixture.namespace}.json`,
  };
}

/** Create the fixture's types (when it has schemas) and upload its source, all through the API. */
export async function seedExternalSourceFixture(api: AerieApi, fixture: ExternalSourceFixture): Promise<void> {
  if (fixture.schemas) {
    await api.createExternalSourceEventTypes(fixture.schemas.source_types, fixture.schemas.event_types);
  }
  await api.uploadExternalSource(fixture.derivationGroup, fixture.sourceJson);
}

/**
 * Delete exactly the records the given fixtures own (sources -> groups -> source types -> event types).
 * Deleting something already gone is a no-op; any real failure is reported after every step has run.
 */
export async function cleanupExternalSourceFixtures(api: AerieApi, fixtures: ExternalSourceFixture[]): Promise<void> {
  const failures: string[] = [];
  const attempt = async (what: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (e) {
      failures.push(`${what}: ${(e as Error).message}`);
    }
  };

  for (const f of fixtures) {
    await attempt(`sources of ${f.derivationGroup}`, () => api.deleteExternalSources(f.derivationGroup, [f.sourceKey]));
    await attempt(`derivation group ${f.derivationGroup}`, () => api.deleteDerivationGroups([f.derivationGroup]));
    await attempt(`source type ${f.sourceType}`, () => api.deleteExternalSourceTypes([f.sourceType]));
    await attempt(`event types ${f.eventTypes.join(', ')}`, () => api.deleteExternalEventTypes(f.eventTypes));
  }

  if (failures.length > 0) {
    throw new Error(`External source cleanup failed:\n${failures.join('\n')}`);
  }
}
