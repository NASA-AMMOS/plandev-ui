<script lang="ts">
  export let text: string = '';
</script>

<button class="date-picker-action-button st-button tertiary" on:click>
  <div class="action-icon">
    <slot />
  </div>
  <div class="action-label st-typography-body">{text}</div>
</button>

<style>
  .date-picker-action-button {
    border-radius: 4px;
    color: var(--st-gray-70);
    cursor: pointer;
    display: inline-flex;
    flex: 0;
    justify-content: flex-start;
    padding: 4px;
  }

  .date-picker-action-button .action-icon {
    color: inherit;
    display: flex;
    margin-right: 7px;
    text-align: right;
    width: 16px;
  }

  .date-picker-action-button .action-label {
    display: inline-block;
  }
</style>
