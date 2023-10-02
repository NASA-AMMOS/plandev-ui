<svelte:options immutable={true} />

<script lang="ts">
  import { SearchParameters } from '../../enums/searchParameters';
  import { planSnapshotId, planSnapshotsWithSimulations } from '../../stores/planSnapshots';
  import type { User } from '../../types/app';
  import type { Plan } from '../../types/plan';
  import type { PlanTagsInsertInput, Tag, TagsChangeEvent } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { getShortISOForDate } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import CardList from '../ui/CardList.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import PlanSnapshot from './PlanSnapshot.svelte';

  export let plan: Plan | null;
  export let planTags: Tag[];
  export let tags: Tag[] = [];
  export let user: User | null;

  let hasPermission: boolean = false;
  let permissionError = 'You do not have permission to edit this plan.';

  $: {
    if (plan && user) {
      hasPermission = featurePermissions.plan.canUpdate(user, plan);
    } else {
      hasPermission = false;
    }
  }

  async function onTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      await effects.deletePlanTags([tag.id], user);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      const newPlanTags: PlanTagsInsertInput[] = tagsToAdd.map(({ id: tag_id }) => ({
        plan_id: plan?.id || -1,
        tag_id,
      }));
      await effects.createPlanTags(newPlanTags, user, false);
    }
  }

  function onCreatePlanSnapshot(event: MouseEvent) {
    event.stopPropagation();
    if (plan) {
      effects.createPlanSnapshot(plan, user);
    }
  }
</script>

<div class="plan-form">
  {#if plan}
    <fieldset>
      <Collapse title="Details">
        <Input layout="inline">
          <label use:tooltip={{ content: 'Name', placement: 'top' }} for="name">Plan Name</label>
          <input class="st-input w-100" disabled name="name" value={plan.name} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'ID', placement: 'top' }} for="id">Plan ID</label>
          <input class="st-input w-100" disabled name="id" value={plan.id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Name', placement: 'top' }} for="modelName">Model Name</label>
          <input class="st-input w-100" disabled name="modelName" value={plan.model.name} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model ID', placement: 'top' }} for="modelId">Model ID</label>
          <input class="st-input w-100" disabled name="modelId" value={plan.model_id} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Model Version', placement: 'top' }} for="modelVersion">Model Version</label>
          <input class="st-input w-100" disabled name="modelVersion" value={plan.model.version} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Start Time', placement: 'top' }} for="startTime">Start Time</label>
          <input class="st-input w-100" disabled name="startTime" value={plan.start_time_doy} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'End Time', placement: 'top' }} for="endTime">End Time</label>
          <input class="st-input w-100" disabled name="endTime" value={plan.end_time_doy} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Owner', placement: 'top' }} for="owner">Owner</label>
          <input class="st-input w-100" disabled name="owner" value={plan.owner} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Date Created', placement: 'top' }} for="createdAt">Date Created</label>
          <input
            class="st-input w-100"
            disabled
            name="createdAt"
            value={getShortISOForDate(new Date(plan.created_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated At', placement: 'top' }} for="updatedAt">Updated At</label>
          <input
            class="st-input w-100"
            disabled
            name="updatedAt"
            value={getShortISOForDate(new Date(plan.updated_at))}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Updated By', placement: 'top' }} for="updatedBy">Updated By</label>
          <input class="st-input w-100" disabled name="updatedBy" value={plan.updated_by} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Revision', placement: 'top' }} for="revision">Revision</label>
          <input class="st-input w-100" disabled name="revision" value={plan.revision} />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Collaborators', placement: 'top' }} for="collaborators">Collaborators</label>
          <input
            class="st-input w-100"
            disabled
            name="collaborators"
            value={plan.collaborators.map(c => c.collaborator).join(', ')}
          />
        </Input>
        <Input layout="inline">
          <label use:tooltip={{ content: 'Tags', placement: 'top' }} for="tags">Tags</label>
          <TagsInput
            use={[
              [
                permissionHandler,
                {
                  hasPermission,
                  permissionError,
                },
              ],
            ]}
            options={tags}
            selected={planTags}
            on:change={onTagsInputChange}
          />
        </Input>
      </Collapse>
    </fieldset>
    <fieldset>
      <Collapse title="Snapshots" padContent={false}>
        <button class="st-button secondary" slot="right" on:click={onCreatePlanSnapshot}>Take Snapshot</button>
        <div style="margin-top: 8px">
          <CardList>
            {#each $planSnapshotsWithSimulations as planSnapshot (planSnapshot.snapshot_id)}
              <PlanSnapshot
                activePlanSnapshotId={$planSnapshotId}
                {planSnapshot}
                on:click={() => setQueryParam(SearchParameters.SNAPSHOT_ID, `${planSnapshot.snapshot_id}`, 'PUSH')}
                on:restore={() => effects.restorePlanSnapshot(planSnapshot, user)}
                on:delete={() => effects.deletePlanSnapshot(planSnapshot, user)}
              />
            {/each}
            {#if $planSnapshotsWithSimulations.length < 1}
              <div class="st-typography-label">No Plan Snapshots Found</div>
            {/if}
          </CardList>
        </div>
      </Collapse>
    </fieldset>
  {/if}
</div>

<style>
  .plan-form fieldset:last-child {
    padding-bottom: 16px;
  }
</style>
