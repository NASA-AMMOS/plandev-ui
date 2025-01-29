<svelte:options immutable={true} />

<script lang="ts">
  export let columns: number = 8;
</script>

<div class="data-grid-skeleton ag-theme-stellar">
  <div class="data-grid-skeleton--header">
    <div class="data-grid-skeleton--row">
      {#each { length: columns } as _}
        <div class="animation-container">
          <div class="animate" style:width="100%" />
        </div>
      {/each}
    </div>
  </div>
  {#each { length: 10 } as _, i}
    {@const width = `${Math.random() * 50 + 50}%`}
    <div class="data-grid-skeleton--row" class:ag-row-odd={i % 2 === 1}>
      {#each { length: columns } as _}
        <div class="animation-container">
          <div class="animate" style:width />
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .data-grid-skeleton {
    border: var(--ag-borders) var(--ag-border-color);
    border-radius: var(--ag-wrapper-border-radius);
    height: 100%;
    overflow: hidden;
    width: 100%;
  }

  .data-grid-skeleton--header {
    background-color: var(--ag-header-background-color);
    border-bottom: var(--ag-borders-critical) var(--ag-border-color);
  }

  .data-grid-skeleton--header,
  .data-grid-skeleton--row {
    border-bottom: var(--ag-row-border-style) var(--ag-row-border-color) var(--ag-row-border-width);
    display: flex;
    height: 33px;
    width: 100%;
  }

  .data-grid-skeleton--row {
    animation: 1s delayVisibility;
  }

  .data-grid-skeleton--header .animate {
    background-color: rgb(196, 196, 196);
  }

  .animation-container {
    flex: 1;
    height: 33px;
    padding: 8px;
  }

  .animate {
    animation:
      loopingFade 1.5s ease-in-out 1.5s infinite,
      fadeIn 1s ease-in 1s;
    background: lightgray;
    background-color: var(--ag-row-loading-skeleton-effect-color);
    border-radius: 0.25rem;
    height: 16px;
    opacity: 0;
  }

  @keyframes delayVisibility {
    0% {
      visibility: hidden;
    }
    99% {
      visibility: hidden;
    }
    100% {
      visibility: visible;
    }
  }

  @keyframes loopingFade {
    0%,
    100% {
      opacity: 0.4;
    }

    50% {
      opacity: 1;
    }
  }

  @keyframes fadeIn {
    0% {
      opacity: 0;
    }

    100% {
      opacity: 1;
    }
  }
</style>
