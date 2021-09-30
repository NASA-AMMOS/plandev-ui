<script lang="ts">
  import { tooltip } from '../../utilities/tooltip';

  export { className as class };
  export { styleName as style };
  export let message: string = '';
  export let visible: boolean = true;

  let className: string = '';
  let styleName: string = '';
</script>

{#if visible}
  <div
    class="alert-error {className}"
    style={styleName}
    use:tooltip={{
      content: message,
      maxWidth: 'none',
      placement: 'top',
      theme: 'error',
    }}
  >
    {message}
  </div>
{/if}

<style>
  .alert-error {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    color: #721c24;
    overflow: hidden;
    font-size: 0.8rem;
    padding: 0.3rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
