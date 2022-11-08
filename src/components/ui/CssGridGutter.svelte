<svelte:options immutable={true} />

<script lang="ts">
  export let track: number = 1; // Array index number in the children of CSSGrid
  export let type: 'column' | 'row' = 'column';
</script>

<div class="css-grid-gutter {type}" data-track={track} />

<style>
  .css-grid-gutter {
    background-color: #eee;
    background-position: 50%;
    background-repeat: no-repeat;
  }

  .css-grid-gutter.column {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    cursor: col-resize;
  }

  .css-grid-gutter.row {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
    cursor: row-resize;
  }
</style>
