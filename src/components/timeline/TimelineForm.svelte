<svelte:options immutable={true} />

<script lang="ts">
  import Field from '../form/Field.svelte';
  import Panel from '../ui/Panel.svelte';
  import { selectedTimeline } from '../../routes/plans/_stores/views';
  import Card from '../ui/Card.svelte';
  import FieldInputText from '../form/FieldInputText.svelte';
  import { required } from '../../utilities/validators';
</script>

<Panel hideHeader hideFooter>
  <span slot="body">
    <Field>
      <details open>
        <summary>Timeline</summary>
        {#if $selectedTimeline !== null}
          <FieldInputText
            name="timeline-margin-left"
            type="number"
            value={$selectedTimeline.marginLeft}
            validators={[required]}
          >
            Margin Left
          </FieldInputText>

          <FieldInputText
            name="timeline-margin-right"
            type="number"
            value={$selectedTimeline.marginRight}
            validators={[required]}
          >
            Margin Right
          </FieldInputText>
        {:else}
          <Card class="p-1">No timeline selected</Card>
        {/if}
      </details>
    </Field>
  </span>
</Panel>
