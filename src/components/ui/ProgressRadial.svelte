<script lang="ts">
  export let progress: number = 0; // number between 0 and 100
  export let size: number = 16;
  export let strokeWidth: number = 2;
  export let useBackground: boolean = true;

  $: radius = size / 2 - 2;
  $: circumference = radius * 2 * Math.PI;
</script>

<div
  class="radial-progress"
  class:radial-progress-background={useBackground}
  class:indeterminate-progress={!progress}
  style={`width:${size}px; height:${size}px`}
>
  <svg class="radial-progress-ring" width={size} height={size}>
    <circle
      class="radial-progress-ring-circle"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-dasharray={`${circumference} ${circumference}`}
      stroke-dashoffset={circumference - ((progress || 80) / 100) * circumference}
      fill="transparent"
      r={radius}
      cx={size / 2}
      cy={size / 2}
    />
  </svg>
</div>

<style>
  .radial-progress {
    display: flex;
  }

  .radial-progress-background {
    background-color: var(--progress-radial-background, var(--st-utility-blue));
    border-radius: 50%;
  }

  .radial-progress-ring-circle {
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    transition: 0.35s stroke-dashoffset;
  }

  .indeterminate-progress .radial-progress-ring {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
