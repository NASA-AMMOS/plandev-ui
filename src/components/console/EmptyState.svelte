<script lang="ts">
  export let title: string = 'No reported errors';
</script>

<div
  class="m-4 flex w-full flex-1 items-center justify-center rounded border border-dashed border-muted bg-background/50"
>
  <div class="text-center">
    <span class="select-none text-xs font-medium text-muted-foreground">{title}</span>
  </div>
</div>
