<script lang="ts">
  export { className as class };
  export { styleName as style };

  let className: string = '';
  let styleName: string = '';
</script>

<div class="card {className}" style={styleName}>
  <slot />
</div>

<style>
  .card {
    border: 1px solid rgba(0, 0, 0, 0.125);
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    min-width: 0;
    position: relative;
    word-wrap: break-word;
  }
</style>
