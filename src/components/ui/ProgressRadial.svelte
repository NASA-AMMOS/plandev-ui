<script lang="ts">
  export let progress: number = 0; // number between 0 and 100
  export let size: number = 16;

  $: radius = size / 2 - 2;
  $: circumference = radius * 2 * Math.PI;
</script>

<div class="radial-progress">
  <svg class="radial-progress-ring" width={size} height={size}>
    <circle
      class="radial-progress-ring-circle"
      stroke="white"
      stroke-width="2"
      stroke-dasharray={`${circumference} ${circumference}`}
      stroke-dashoffset={circumference - (progress / 100) * circumference}
      fill="transparent"
      r={radius}
      cx={size / 2}
      cy={size / 2}
    />
  </svg>
</div>

<style>
  .radial-progress {
    background-color: var(--st-utility-blue);
    border-radius: 50%;
    height: 16px;
    width: 16px;
  }
  .radial-progress-ring-circle {
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    transition: 0.35s stroke-dashoffset;
  }
</style>
