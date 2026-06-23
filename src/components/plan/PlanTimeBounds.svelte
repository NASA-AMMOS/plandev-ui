<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { Pencil } from 'lucide-svelte';
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { Plan, PlanSlim } from '../../types/plan';
  import { showChangePlanBoundsModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { convertDoyToYmd, convertUsToDurationString, formatDate, getIntervalInMs } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';

  export let plan: Plan | PlanSlim;
  export let user: User | null = null;
  export let hasUpdatePermission: boolean = false;
  export let permissionError: string = '';

  // Display values are read-only but selectable (the inputs are `readonly`, not `disabled`) so the
  // text remains copyable. Editing goes through ChangePlanBoundsModal, which edits both at once.
  $: startTimeString = formatDate(new Date(plan.start_time), $plugins.time.primary.format);
  $: endTimeYmd = convertDoyToYmd(plan.end_time_doy);
  $: endTimeString = endTimeYmd ? formatDate(new Date(endTimeYmd), $plugins.time.primary.format) : plan.end_time_doy;
  $: durationString = convertUsToDurationString(getIntervalInMs(plan.duration) * 1000) || 'None';

  function openChangePlanBoundsModal() {
    showChangePlanBoundsModal(plan, user);
  }
</script>

<Input layout="inline">
  <label use:tooltip={{ content: `Start Time (${$plugins.time.primary.label})`, placement: 'top' }} for="planStartTime">
    Start Time ({$plugins.time.primary.label})
  </label>
  <div class="flex gap-1">
    <input class="st-input w-full" id="planStartTime" name="planStartTime" readonly value={startTimeString} />
    <div
      use:permissionHandler={{ hasPermission: hasUpdatePermission, permissionError }}
      use:tooltip={{ content: 'Change Plan Time Range', placement: 'top' }}
    >
      <Button
        aria-label="Change plan time range"
        class="shrink-0"
        on:click={openChangePlanBoundsModal}
        size="icon"
        variant="outline"
      >
        <Pencil size={16} />
      </Button>
    </div>
  </div>
</Input>
<Input layout="inline">
  <label use:tooltip={{ content: `End Time (${$plugins.time.primary.label})`, placement: 'top' }} for="planEndTime">
    End Time ({$plugins.time.primary.label})
  </label>
  <input class="st-input w-full" id="planEndTime" name="planEndTime" readonly value={endTimeString} />
</Input>
<Input layout="inline">
  <label use:tooltip={{ content: 'Plan Duration', placement: 'top' }} for="planDuration">Plan Duration</label>
  <input class="st-input w-full" id="planDuration" name="planDuration" readonly value={durationString} />
</Input>
