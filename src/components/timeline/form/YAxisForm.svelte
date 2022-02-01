<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import type { Axis, Label as AxisLabel } from '../../../types';
  import { getTarget } from '../../../utilities/generic';

  const dispatch = createEventDispatcher();

  export let axes: Axis[] = [];
  export let axis: Axis;

  let idError: string | null = null;

  $: axesIdsMap = axes.reduce((ids: { [id: number]: number }, axis) => {
    ids[axis.id] = axis.id;
    return ids;
  }, {});

  function updateAxis(event: Event) {
    const { name: prop, value } = getTarget(event);
    dispatch('update', { prop, value });
  }

  function updateId(event: Event) {
    const { value } = getTarget(event);

    if (!isNaN(value as number)) {
      if (value === axis.id) {
        idError = null;
      } else if (value === axesIdsMap[value]) {
        idError = `Y-Axis with id=${value} already exists`;
      } else {
        dispatch('update', { prop: 'id', value });
        idError = null;
      }
    } else {
      idError = 'Field is required';
    }
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

<CssGrid columns="33% 33% 33%">
  <fieldset>
    <label class:error={idError !== null} for="id"> Id </label>
    <input
      class="st-input w-100"
      class:error={idError !== null}
      name="id"
      type="number"
      value={axis.id}
      on:input|stopPropagation={updateId}
    />
  </fieldset>

  <fieldset>
    <label for="label"> Label Text </label>
    <input
      class="st-input w-100"
      name="text"
      type="text"
      value={axis.label.text}
      on:input|stopPropagation={updateLabel}
    />
  </fieldset>

  <fieldset>
    <label for="color"> Axis Color </label>
    <input
      class="w-100"
      name="color"
      type="color"
      value={axis.color}
      on:input|stopPropagation={updateAxis}
    />
  </fieldset>
</CssGrid>

<CssGrid columns="33% 33% 33%">
  <fieldset>
    <label for="domainMin"> Domain Min </label>
    <input
      class="st-input w-100"
      name="domainMin"
      type="number"
      value={axis.scaleDomain[0]}
      on:input|stopPropagation={updateScaleDomain}
    />
  </fieldset>

  <fieldset>
    <label for="domainMax"> Domain Max </label>
    <input
      class="st-input w-100"
      name="domainMax"
      type="number"
      value={axis.scaleDomain[1]}
      on:input|stopPropagation={updateScaleDomain}
    />
  </fieldset>

  <fieldset>
    <label for="tickCount"> Tick Count </label>
    <input
      class="st-input w-100"
      name="tickCount"
      type="number"
      value={axis.tickCount}
      on:input|stopPropagation={updateAxis}
    />
  </fieldset>
</CssGrid>
