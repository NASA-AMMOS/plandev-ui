import { describe, expect, test } from 'vitest';
import viewV0Migrated from '../tests/mocks/view/v0/view-migrated.json';
import viewV0 from '../tests/mocks/view/v0/view.json';
import viewV1 from '../tests/mocks/view/v1/view.json';
import viewV3 from '../tests/mocks/view/v3/view.json';
import {
  applyViewDefinitionMigrations,
  generateDefaultView,
  migrateViewDefinitionV0toV1,
  validateViewJSONAgainstSchema,
} from './view';

describe('generateDefaultView', () => {
  test('Should generate a valid view', async () => {
    const view = generateDefaultView([
      {
        name: 'resource1',
        schema: {
          metadata: { description: { value: 'resource1 description' } },
          type: 'boolean',
        },
      },
      {
        name: 'resource2',
        schema: {
          metadata: { description: { value: 'resource2 description' } },
          type: 'int',
        },
      },
      {
        name: 'resource3',
        schema: {
          items: {
            type: 'boolean',
          },
          metadata: { description: { value: 'resource3 description' } },
          type: 'series',
        },
      },
    ]);
    const { valid, errors } = validateViewJSONAgainstSchema(view.definition);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });
});

describe('generateDefaultViewWithEvents', () => {
  test('Should generate a valid view with events', async () => {
    const view = generateDefaultView(
      [],
      [
        { attribute_schema: {}, name: 'external-event-type_1' },
        { attribute_schema: {}, name: 'external-event-type_2' },
      ],
    );

    // validate against schema
    const { valid, errors } = validateViewJSONAgainstSchema(view.definition);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);

    // check fields
    const timelines = view.definition.plan.timelines;
    expect(timelines.length).toBe(1);
    expect(timelines[0].rows.length).toBe(2);
    expect(timelines[0].rows[1].name).toBe('External Events');

    const layers = timelines[0].rows[1].layers;
    expect(layers.length).toBe(1);
    expect(layers[0].filter.externalEvent).toBeDefined();
    expect(layers[0].filter.externalEvent?.static_types).toEqual(['external-event-type_1', 'external-event-type_2']);
  });
});

describe('validateViewJSONAgainstSchema - line layer area fill', () => {
  function getViewWithLineLayerProps(props: Record<string, unknown>) {
    const view = structuredClone(viewV3) as any;
    const row = view.plan.timelines
      .flatMap((timeline: any) => timeline.rows)
      .find((row: any) => row.layers.some((layer: any) => layer.chartType === 'line'));
    const layer = row.layers.find((layer: any) => layer.chartType === 'line');
    Object.assign(layer, props);
    return view;
  }

  test('Should accept line layers with area fill properties', async () => {
    const { valid, errors } = validateViewJSONAgainstSchema(
      getViewWithLineLayerProps({ fillColor: '#ff0000', fillOpacity: 0.25, showFill: true }),
    );
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test('Should reject a line layer fill color that is not a hex color', async () => {
    const { valid } = validateViewJSONAgainstSchema(getViewWithLineLayerProps({ fillColor: 'red', showFill: true }));
    expect(valid).toBe(false);
  });

  test('Should reject a line layer fill opacity outside of 0-1', async () => {
    expect(validateViewJSONAgainstSchema(getViewWithLineLayerProps({ fillOpacity: 1.5 })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(getViewWithLineLayerProps({ fillOpacity: -1 })).valid).toBe(false);
  });

  test('Should reject a null line layer fill opacity, the form a NaN takes once serialized', async () => {
    // JSON.stringify turns NaN into null, so an unsanitized number input would make a view
    // that can no longer be exported or re-imported
    const view = getViewWithLineLayerProps({ fillOpacity: NaN });
    expect(validateViewJSONAgainstSchema(JSON.parse(JSON.stringify(view))).valid).toBe(false);
  });
});

describe('applyViewDefinitionMigrations', () => {
  test('Should migrate a view from v0 -> v1', async () => {
    const migratedView = migrateViewDefinitionV0toV1(viewV0 as any);
    expect(migratedView).to.deep.eq(viewV0Migrated);
  });
});

describe('migrateViewDefinition', () => {
  test('Should apply view migrations to an old view', async () => {
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(viewV1 as any);
    expect(anyMigrationsApplied).toBeTruthy();
    expect(error).toBeNull();
    expect(migratedViewDefinition).to.deep.eq(viewV3);
  });
  test('Should apply no view migrations to a migration matching current version', async () => {
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(viewV3 as any);
    expect(anyMigrationsApplied).toBeFalsy();
    expect(error).toBeNull();
    expect(migratedViewDefinition).to.deep.eq(viewV3);
  });
  test('Should return errors if migration fails', async () => {
    const invalidView = structuredClone(viewV0);
    // @ts-expect-error forcing this to be invalid
    invalidView.plan.grid = null;
    const { anyMigrationsApplied, error, migratedViewDefinition } = applyViewDefinitionMigrations(invalidView as any);
    expect(anyMigrationsApplied).toBeFalsy();
    expect(error).not.toBeNull();
    expect(migratedViewDefinition).toBeNull();
  });
});

describe('y axis scale type validation', () => {
  function viewWithYAxisProps(props: Record<string, unknown>) {
    const view = structuredClone(viewV3) as any;
    const axis = view.plan.timelines[0].rows[1].yAxes[0];
    view.plan.timelines[0].rows[1].yAxes[0] = { ...axis, ...props };
    return view;
  }

  test.each(['linear', 'log'])('Should accept scaleType "%s"', scaleType => {
    const { valid, errors } = validateViewJSONAgainstSchema(viewWithYAxisProps({ scaleType }));
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test('Should reject an unknown scaleType', () => {
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ scaleType: 'logarithmic' })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ scaleType: 'log10' })).valid).toBe(false);
    // symlog was collapsed into 'log', which is symlog-backed, so it is no longer a separate option
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ scaleType: 'symlog' })).valid).toBe(false);
  });

  test('Should accept a logBase above 1 and reject anything at or below it', () => {
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logBase: 10 })).valid).toBe(true);
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logBase: 2 })).valid).toBe(true);
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logBase: 1 })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logBase: 0 })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logBase: -10 })).valid).toBe(false);
  });

  test('Should reject a derived field that must never be persisted', () => {
    // logConstant lives on ComputedAxis only; additionalProperties: false is what enforces that
    expect(validateViewJSONAgainstSchema(viewWithYAxisProps({ logConstant: 0.01 })).valid).toBe(false);
  });

  test('An axis saved before scaleType existed is still valid', () => {
    // The v3 mock carries no scaleType, so omitting it must remain legal
    const view = structuredClone(viewV3) as any;
    expect(view.plan.timelines[0].rows[1].yAxes[0].scaleType).toBeUndefined();
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);
  });
});

describe('line layer style validation', () => {
  /**
   * Returns the v3 mock view with the given properties merged into its first line layer. The mock's
   * line layer carries none of the style fields, so it doubles as the "view saved before these
   * options existed" case.
   */
  function viewWithLineLayerProps(props: Record<string, unknown>) {
    const view = structuredClone(viewV3) as any;
    const layer = view.plan.timelines[0].rows[1].layers[0];
    view.plan.timelines[0].rows[1].layers[0] = { ...layer, ...props };
    return view;
  }

  /** Merges the given properties into the discreteOptions of the mock view's activity row. */
  function viewWithDiscreteOptions(props: Record<string, unknown>) {
    const view = structuredClone(viewV3) as any;
    const row = view.plan.timelines[0].rows[0];
    row.discreteOptions = { ...row.discreteOptions, ...props };
    return view;
  }

  function viewWithXRangeLayerProps(props: Record<string, unknown>) {
    const view = structuredClone(viewV3) as any;
    const layer = view.plan.timelines[0].rows[2].layers[0];
    view.plan.timelines[0].rows[2].layers[0] = { ...layer, ...props };
    return view;
  }

  test('A view saved before the style options existed is still valid', () => {
    const { valid, errors } = validateViewJSONAgainstSchema(viewV3 as any);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test('Should accept every style option', () => {
    const { valid, errors } = validateViewJSONAgainstSchema(
      viewWithLineLayerProps({
        interpolation: 'linear',
        lineStyle: 'dashed',
        opacity: 0.5,
        pointShape: 'diamond',
        showPoints: 'always',
      }),
    );
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test.each(['step', 'linear', 'smooth'])('Should accept interpolation "%s"', mode => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ interpolation: mode })).valid).toBe(true);
  });

  test.each(['line', 'dot', 'diamond'])('Should accept a row directiveMarker of "%s"', style => {
    const { valid, errors } = validateViewJSONAgainstSchema(viewWithDiscreteOptions({ directiveMarker: style }));
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test.each(['line', 'dot', 'diamond'])('Should accept a row zeroDurationMarker of "%s"', style => {
    const { valid, errors } = validateViewJSONAgainstSchema(viewWithDiscreteOptions({ zeroDurationMarker: style }));
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  // The two are independent on purpose: turning zero-duration spans into milestones must not also put
  // a diamond on every directive in the plan
  test('Should accept the two markers set differently', () => {
    const { valid, errors } = validateViewJSONAgainstSchema(
      viewWithDiscreteOptions({ directiveMarker: 'line', zeroDurationMarker: 'diamond' }),
    );
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);
  });

  test('Should accept a stacked y axis, and reject a non-boolean stack', () => {
    const view = structuredClone(viewV3) as any;
    const axis = view.plan.timelines[0].rows[1].yAxes[0];
    expect(axis.stack).toBeUndefined(); // saved before stacking existed
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);
    axis.stack = true;
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);
    axis.stack = 'yes';
    expect(validateViewJSONAgainstSchema(view).valid).toBe(false);
  });

  test('Should accept a banded horizontal guide and reject a non-numeric y2', () => {
    const view = structuredClone(viewV3) as any;
    const row = view.plan.timelines[0].rows[1];
    row.horizontalGuides = [{ id: 0, label: { text: 'nominal' }, y: 10, y2: 90, yAxisId: row.yAxes[0].id }];
    const { valid, errors } = validateViewJSONAgainstSchema(view);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);

    // A guide with no y2 is an ordinary line guide and must stay valid
    delete row.horizontalGuides[0].y2;
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);

    row.horizontalGuides[0].y2 = 'top';
    expect(validateViewJSONAgainstSchema(view).valid).toBe(false);
  });

  test('Should accept a banded vertical guide and reject a non-string timestamp2', () => {
    const view = structuredClone(viewV3) as any;
    const timeline = view.plan.timelines[0];
    timeline.verticalGuides = [
      { id: 0, label: { text: 'eclipse' }, timestamp: '2022-001T00:00:00', timestamp2: '2022-001T06:00:00' },
    ];
    const { valid, errors } = validateViewJSONAgainstSchema(view);
    expect(errors).to.deep.equal([]);
    expect(valid).toBe(true);

    // A guide with no timestamp2 is an ordinary line guide and must stay valid
    delete timeline.verticalGuides[0].timestamp2;
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);

    timeline.verticalGuides[0].timestamp2 = 12345;
    expect(validateViewJSONAgainstSchema(view).valid).toBe(false);
  });

  test('Should reject an unknown marker style', () => {
    expect(validateViewJSONAgainstSchema(viewWithDiscreteOptions({ directiveMarker: 'triangle' })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithDiscreteOptions({ zeroDurationMarker: 'triangle' })).valid).toBe(
      false,
    );
    // The pre-split field name must no longer validate
    expect(validateViewJSONAgainstSchema(viewWithDiscreteOptions({ instantStyle: 'dot' })).valid).toBe(false);
  });

  // The mock's rows carry neither marker field, so this is also the "row saved before markers existed"
  // case -- it has to keep validating and fall back to 'line' at render time.
  test('A row with no marker fields is still valid', () => {
    const view = structuredClone(viewV3) as any;
    expect(view.plan.timelines[0].rows[0].discreteOptions.directiveMarker).toBeUndefined();
    expect(view.plan.timelines[0].rows[0].discreteOptions.zeroDurationMarker).toBeUndefined();
    expect(validateViewJSONAgainstSchema(view).valid).toBe(true);
  });

  test.each(['solid', 'dashed', 'dotted'])('Should accept lineStyle "%s"', style => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ lineStyle: style })).valid).toBe(true);
  });

  test.each(['circle', 'square', 'diamond', 'triangle', 'cross'])('Should accept pointShape "%s"', shape => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ pointShape: shape })).valid).toBe(true);
  });

  test.each(['auto', 'always', 'never'])('Should accept showPoints "%s"', mode => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ showPoints: mode })).valid).toBe(true);
  });

  test('Should accept a pointColor and reject a malformed one', () => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ pointColor: '#ff0000' })).valid).toBe(true);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ pointColor: 'red' })).valid).toBe(false);
  });

  test('Should reject unknown enum values', () => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ interpolation: 'stepBefore' })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ lineStyle: 'squiggly' })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ pointShape: 'hexagon' })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ showPoints: 'sometimes' })).valid).toBe(false);
  });

  test('Should reject a opacity outside 0-1', () => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ opacity: -0.5 })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ opacity: 1.5 })).valid).toBe(false);
  });

  test('Should reject a negative lineWidth or pointRadius', () => {
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ lineWidth: -1 })).valid).toBe(false);
    expect(validateViewJSONAgainstSchema(viewWithLineLayerProps({ pointRadius: -1 })).valid).toBe(false);
  });

  test('Should reject an x-range opacity outside 0-1', () => {
    expect(validateViewJSONAgainstSchema(viewWithXRangeLayerProps({ opacity: 1.5 })).valid).toBe(false);
  });

  test('Should reject a NaN opacity, which serializes to null rather than a number', () => {
    // A cleared number input yields NaN, and JSON.stringify turns NaN into null, so an unsanitized
    // form value makes the whole view unexportable rather than just rendering oddly.
    const view = JSON.parse(JSON.stringify(viewWithLineLayerProps({ opacity: NaN })));
    expect(view.plan.timelines[0].rows[1].layers[0].opacity).toBeNull();
    expect(validateViewJSONAgainstSchema(view).valid).toBe(false);
  });
});
