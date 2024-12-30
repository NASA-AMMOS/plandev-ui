<script lang="ts">
  // NOTE: this does NOT refresh/clear/reset if the database is cleared or restarted! So stuff from the old database just lingers around...to clear it, just press dismiss

  import WarningIcon from 'bootstrap-icons/icons/exclamation-triangle.svg?component';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';
  import { createEventDispatcher } from 'svelte';

  export let disabled: boolean = true;
  export let externalSourceType: string | null = null;
  export let externalEventTypes: string[] | null = null;

  const dispatch = createEventDispatcher<{
    dismiss: void;
  }>();
</script>

{#if !disabled && (externalSourceType != null || externalEventTypes != null)}
  <div class="card st-typography-label card-border">
    <div class="card-row card-title-row card-background">
      <div class="card-title st-typography-medium">
        <div class="card-icon">
          <WarningIcon class="filter-search-icon" />
        </div>
        New Types Will Be Created
      </div>
      <slot name="right">
        <button class="st-button icon fs-6" on:click={() => dispatch('dismiss')}>
          <XIcon />
        </button>
      </slot>
    </div>
    <div class="card-source-content">
      <div class="card-row">
        <span class="st-typography-body">
          {#if externalSourceType}
            The following external source type does not exist, but will be created on submission of this source. It will
            not have any attributes.
            <ul>
              <li><b>{externalSourceType}</b></li>
            </ul>
          {/if}
          {#if externalEventTypes && externalEventTypes.length > 0}
            The following external event {externalEventTypes.length === 1 ? 'type does' : 'types do'} not exist, but will
            be created on submission of this source. They will not have any attributes.
            <ul>
              {#each externalEventTypes as eventType}
                <li><b>{eventType}</b></li>
              {/each}
            </ul>
          {/if}
        </span>
      </div>
      <div class="card-dismiss">
        <button class="st-button secondary hover-fix" on:click={() => dispatch('dismiss')}> Dismiss </button>
      </div>
      <slot />
    </div>
  </div>
{/if}

<style>
  .card {
    background: var(--bg-color, rgba(245, 245, 245, 0.35));
    border: 1px solid var(--border-color, rgba(152, 101, 35, 0.5));
    border-radius: 4px;
    color: var(--st-gray-70);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .card-dismiss {
    padding-top: 4px;
  }

  .card-dismiss > button {
    border: 0px;
    width: 100px;
  }

  .card-row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 24px;
    padding-top: 4px;
    width: 100%;
  }

  .card-title-row {
    background: var(--title-bg-color, rgb(254, 252, 234));
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    padding: 4px 0px;
  }

  .card-title {
    align-items: center;
    color: var(--st-gray-80);
    display: flex;
    gap: 5px;
    line-height: 24px;
    padding-left: 5px;
    width: 100%;
  }

  .card-source-content {
    padding: 4px 12px 12px;
  }

  .hover-fix {
    background-color: var(--st-gray-20);
  }

  .hover-fix:hover {
    background-color: var(--st-gray-30);
  }

  .card-background {
    background: rgb(254, 252, 234);
    display: flex;
  }

  .card-icon {
    color: rgba(152, 101, 35, 0.5);
  }

  .card-border {
    border-color: rgba(152, 101, 35, 0.5);
  }
</style>
