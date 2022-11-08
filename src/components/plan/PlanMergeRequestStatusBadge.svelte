<svelte:options immutable={true} />

<script lang="ts">
  export let status: PlanMergeRequestStatus = 'withdrawn';

  const statusToColors: Record<PlanMergeRequestStatus, string> = {
    accepted: '#0EAF0A',
    'in-progress': '#2FCBED',
    pending: '#E5B300',
    rejected: '#AF0A32',
    withdrawn: '#A1A1A1',
  };

  $: dotColor = statusToColors[status];
</script>

<div class="plan-merge-request-status-badge">
  <span class="dot" style={`background: ${dotColor}`} />
  <div class="status">{status}</div>
</div>

<style>
  .plan-merge-request-status-badge {
    align-items: center;
    background: var(--st-gray-10);
    border-radius: 4px;
    color: var(--st-gray-60);
    display: flex;
    gap: 4px;
    padding: 4px 8px 4px 6px;
    white-space: nowrap;
  }

  .dot {
    border-radius: 16px;
    height: 8px;
    margin: 4px;
    width: 8px;
  }

  .status {
    text-transform: capitalize;
    user-select: none;
  }
</style>
