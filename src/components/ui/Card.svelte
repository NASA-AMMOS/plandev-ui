<script lang="ts">
  import { getTimeAgo } from '../../utilities/time';

  export let body: string = '';
  export let date: string = '';
  export let selected: boolean = false;
  export let title: string = '';
  export let user: string = '';

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  }
</script>

<button class="card st-typography-label" class:selected on:click>
  <div class="card--row card--title-row">
    <div class="card--title t-typography-medium">
      {title}
    </div>
    <slot name="right" />
  </div>
  {#if date || user}
    <div class="card--row">
      <div class="card--metadata-row">
        {#if date}
          <div class="card--date">
            <span class="st-typography-body">
              {formatDateTime(date)}
            </span>
            <span class="card--date-time-ago">
              {getTimeAgo(new Date(date), new Date(), Number.MAX_SAFE_INTEGER)}
            </span>
          </div>
        {/if}
        {#if user}
          <div class="card--user">
            @{user}
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if body}
    <div class="card--row card--body st-typography-body">
      {body}
    </div>
  {/if}
  <slot />
</button>

<style>
  .card {
    background: rgba(248, 248, 248, 0.48);
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    color: var(--st-gray-70);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    padding: 4px 14px 12px;
    text-align: left;
  }

  .card.selected {
    background: rgba(230, 230, 255, 0.24);
    border-color: var(--st-primary-70);
    opacity: 1;
  }

  .card--row {
    align-items: center;
    display: flex;
    justify-content: space-between;
    min-height: 24px;
    width: 100%;
  }

  .card--title-row {
    padding: 4px 0px;
  }

  .card--metadata-row {
    display: flex;
  }

  .card--title {
    color: var(--st-gray-80);
    line-height: 24px;
  }

  .card--user {
    margin-left: 8px;
  }

  .card--date {
    display: flex;
    gap: 20px;
  }

  .card--date-time-ago {
    color: var(--st-gray-50);
  }

  .card--body {
    color: var(--st-gray-70);
    padding: 4px 0px;
  }

  .card:hover:not(.selected) {
    border-color: var(--st-gray-30);
  }
</style>
