<script lang="ts">
  export let progress: number = 0; // number between 0 and 100
  export let color: string = 'var(--st-utility-blue)';
</script>

<div class="linear-progress">
  <div class="linear-progress-fill" style={`width: ${progress}%; background: ${color}`} />
</div>

<style>
  .linear-progress {
    align-items: center;
    background: var(--st-gray-20);
    border-radius: 8px;
    display: flex;
    flex: 1;
    height: 4px;
    overflow: hidden;
  }

  .linear-progress-fill {
    height: inherit;
    transition: width 250ms;
  }
</style>
