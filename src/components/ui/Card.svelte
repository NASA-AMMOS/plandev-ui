<script lang="ts">
  export { className as class };
  export { styleName as style };

  let className: string = '';
  let styleName: string = '';
</script>

<div class="st-card {className}" style={styleName}>
  <slot />
</div>
