<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import Grid from '../../ui/Grid.svelte';
  import type { Axis, Label as AxisLabel } from '../../../types';
  import { getTarget } from '../../../utilities/generic';

  const dispatch = createEventDispatcher();

  export let axis: Axis;

  function updateAxis(event: Event) {
    const { name: prop, value } = getTarget(event);
    dispatch('update', { prop, value });
  }

  function updateLabel(event: Event) {
    const { name, value } = getTarget(event);
    const label: AxisLabel = { ...axis.label, [name]: value };
    dispatch('update', { prop: 'label', value: label });
  }

  function updateScaleDomain(event: Event) {
    const { name, value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;
    const scaleDomain = [...axis.scaleDomain];

    if (name === 'domainMin') {
      scaleDomain[0] = value;
      scaleDomain[1] = scaleDomain[1] ?? null;
    } else if (name === 'domainMax') {
      scaleDomain[0] = scaleDomain[0] ?? null;
      scaleDomain[1] = value;
    }

    const [min, max] = scaleDomain;
    if (min === null && max === null) {
      dispatch('update', { prop: 'scaleDomain', value: [] });
    } else {
      dispatch('update', { prop: 'scaleDomain', value: scaleDomain });
    }
  }
</script>

<Grid columns="33% 33% 33%">
  <Field>
    <Label for="id">Id</Label>
    <input
      class="st-input w-100"
      name="id"
      type="text"
      value={axis.id}
      on:input|stopPropagation={updateAxis}
    />
  </Field>
  <Field>
    <Label for="label">Label Text</Label>
    <input
      class="st-input w-100"
      name="text"
      type="text"
      value={axis.label.text}
      on:input|stopPropagation={updateLabel}
    />
  </Field>
  <Field>
    <Label for="color">Axis Color</Label>
    <input
      class="w-100"
      name="color"
      type="color"
      value={axis.color}
      on:input|stopPropagation={updateAxis}
    />
  </Field>
</Grid>

<Grid columns="33% 33% 33%">
  <Field>
    <Label for="domainMin">Domain Min</Label>
    <input
      class="st-input w-100"
      name="domainMin"
      type="number"
      value={axis.scaleDomain[0]}
      on:input|stopPropagation={updateScaleDomain}
    />
  </Field>
  <Field>
    <Label for="domainMax">Domain Max</Label>
    <input
      class="st-input w-100"
      name="domainMax"
      type="number"
      value={axis.scaleDomain[1]}
      on:input|stopPropagation={updateScaleDomain}
    />
  </Field>
  <Field>
    <Label for="tickCount">Tick Count</Label>
    <input
      class="st-input w-100"
      name="tickCount"
      type="number"
      value={axis.tickCount}
      on:input|stopPropagation={updateAxis}
    />
  </Field>
</Grid>
