<script lang="ts">
  export let visible: boolean = true;
</script>

{#if visible}
  <i class="spinner bi bi-arrow-repeat" />
{/if}

<style>
  .spinner {
    animation: rotation 2s infinite linear;
    display: block;
  }

  @keyframes rotation {
    to {
      transform: rotate(360deg);
    }
  }
</style>
