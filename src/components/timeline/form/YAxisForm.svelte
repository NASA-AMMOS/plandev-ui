<script lang="ts">
  import Input from '../../../components/form/Input.svelte';
  import { selectedRow, selectedYAxis, viewUpdateYAxis } from '../../../stores/views';
  import { getTarget } from '../../../utilities/generic';
  import CssGrid from '../../ui/CssGrid.svelte';

  let axes: Axis[] = [];
  let idError: string | null = null;

  $: axes = $selectedRow?.yAxes || [];
  $: axesIdsMap = axes.reduce((ids: { [id: number]: number }, axis) => {
    ids[axis.id] = axis.id;
    return ids;
  }, {});

  function updateAxis(event: Event) {
    const { name: prop, value } = getTarget(event);
    viewUpdateYAxis(prop, value);
  }

  function updateId(event: Event) {
    const { value } = getTarget(event);

    if (!isNaN(value as number)) {
      if (value === $selectedYAxis.id) {
        idError = null;
      } else if (value === axesIdsMap[value]) {
        idError = `Y-Axis with id=${value} already exists`;
      } else {
        viewUpdateYAxis('id', value);
        idError = null;
      }
    } else {
      idError = 'Field is required';
    }
  }

  function updateLabel(event: Event) {
    const { name, value } = getTarget(event);
    const label: Label = { ...$selectedYAxis.label, [name]: value };
    viewUpdateYAxis('label', label);
  }

  function updateScaleDomain(event: Event) {
    const { name, value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;
    const scaleDomain = [...$selectedYAxis.scaleDomain];

    if (name === 'domainMin') {
      scaleDomain[0] = value;
      scaleDomain[1] = scaleDomain[1] ?? null;
    } else if (name === 'domainMax') {
      scaleDomain[0] = scaleDomain[0] ?? null;
      scaleDomain[1] = value;
    }

    const [min, max] = scaleDomain;
    if (min === null && max === null) {
      viewUpdateYAxis('scaleDomain', []);
    } else {
      viewUpdateYAxis('scaleDomain', scaleDomain);
    }
  }
</script>

{#if !$selectedYAxis}
  <div>No y-axis selected</div>
{:else}
  <CssGrid columns="1fr 1fr 1fr" gap="16px" padding="0px 0px 8px">
    <Input>
      <label class:error={idError !== null} for="id">Id</label>
      <input
        class="st-input w-100"
        class:error={idError !== null}
        name="id"
        type="number"
        value={$selectedYAxis.id}
        on:input|stopPropagation={updateId}
      />
    </Input>

    <Input>
      <label for="label">Label Text</label>
      <input
        class="st-input w-100"
        name="text"
        type="text"
        value={$selectedYAxis.label.text}
        on:input|stopPropagation={updateLabel}
      />
    </Input>

    <Input>
      <label for="color">Axis Color</label>
      <input
        class="w-100"
        name="color"
        type="color"
        value={$selectedYAxis.color}
        on:input|stopPropagation={updateAxis}
      />
    </Input>
  </CssGrid>

  <CssGrid columns="1fr 1fr 1fr" gap="16px">
    <Input>
      <label for="domainMin">Domain Min</label>
      <input
        class="st-input w-100"
        name="domainMin"
        type="number"
        value={$selectedYAxis.scaleDomain[0]}
        on:input|stopPropagation={updateScaleDomain}
      />
    </Input>

    <Input>
      <label for="domainMax">Domain Max</label>
      <input
        class="st-input w-100"
        name="domainMax"
        type="number"
        value={$selectedYAxis.scaleDomain[1]}
        on:input|stopPropagation={updateScaleDomain}
      />
    </Input>

    <Input>
      <label for="tickCount">Tick Count</label>
      <input
        class="st-input w-100"
        name="tickCount"
        type="number"
        value={$selectedYAxis.tickCount}
        on:input|stopPropagation={updateAxis}
      />
    </Input>
  </CssGrid>
{/if}
