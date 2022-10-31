<script lang="ts">
  export { styleName as style };

  let styleName: string = '';
</script>

<div class="modal-content" style={styleName}>
  <slot />
</div>

<style>
  .modal-content {
    flex: 1;
    padding: 1rem;
  }
</style>
