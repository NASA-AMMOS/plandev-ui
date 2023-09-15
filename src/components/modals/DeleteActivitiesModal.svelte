<svelte:options immutable={true} />

<script lang="ts">
  import ActivityAnchorIconSVG from '@nasa-jpl/stellar/icons/activity_anchor.svg?component';
  import { createEventDispatcher } from 'svelte';
  import DeleteAnchoredActivitiesIcon from '../../assets/delete-anchored-activities.svg?component';
  import ReanchorToNearestParentIcon from '../../assets/reanchor-to-nearest-parent.svg?component';
  import ReanchorToPlanStartIcon from '../../assets/reanchor-to-plan-start.svg?component';
  import { activityDirectivesList, activityDirectivesMap } from '../../stores/activities';
  import type {
    ActivityDirective,
    ActivityDirectiveDeletionMap,
    ActivityDirectiveId,
    AnchoredActivityDirectivesMap,
  } from '../../types/activity';
  import { ActivityDeletionAction } from '../../utilities/activities';
  import { getTarget } from '../../utilities/generic';
  import ActivityDirectiveIcon from '../ui/ActivityDirectiveIcon.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let width: number = 480;
  export let activityIds: ActivityDirectiveId[] = [];

  let anchoredActivitiesMap: AnchoredActivityDirectivesMap;
  let activityDirectiveDeletionMap: ActivityDirectiveDeletionMap = {};
  let activityDirectivesToDeleteMap: Record<ActivityDirectiveId, boolean> = {};
  let selectedAllAction: ActivityDeletionAction | 'custom' = 'custom';
  let isHelpOpen: boolean = false;
  let numberOfDependentActivities: number = 0;

  const dispatch = createEventDispatcher();

  $: if ($activityDirectivesList.length) {
    anchoredActivitiesMap = $activityDirectivesList.reduce(
      (previousValue: AnchoredActivityDirectivesMap, directive: ActivityDirective) => {
        if (!activityIds.includes(directive.id)) {
          if (directive.anchor_id !== null) {
            const { anchor_id: anchorId } = directive;
            if (!previousValue[anchorId]) {
              return {
                ...previousValue,
                [anchorId]: [directive],
              };
            }

            return {
              ...previousValue,
              [anchorId]: [...previousValue[anchorId], directive],
            };
          }
        }
        return previousValue;
      },
      {},
    );

    activityDirectiveDeletionMap = activityIds.reduce(
      (previousValue: ActivityDirectiveDeletionMap, activityId: ActivityDirectiveId) => {
        if (previousValue[activityId]) {
          return previousValue;
        }

        if (anchoredActivitiesMap[activityId]?.length) {
          return {
            [activityId]: ActivityDeletionAction.ANCHOR_ROOT,
            ...previousValue,
          };
        }

        return {
          [activityId]: ActivityDeletionAction.NORMAL,
          ...previousValue,
        };
      },
      activityDirectiveDeletionMap,
    );
  }
  $: {
    let tempNumberOfDependentActivities = 0;
    const tempActivityDirectivesToDeleteMap: Record<ActivityDirectiveId, boolean> = {};
    activityIds.forEach((activityId: ActivityDirectiveId) => {
      tempNumberOfDependentActivities += anchoredActivitiesMap[activityId]?.length ?? 0;
      tempActivityDirectivesToDeleteMap[activityId] = activityDirectivesToDeleteMap[activityId] ?? true;
    });
    numberOfDependentActivities = tempNumberOfDependentActivities;
    activityDirectivesToDeleteMap = tempActivityDirectivesToDeleteMap;
  }

  function confirmDelete() {
    activityDirectivesToDeleteMap;
    dispatch(
      'delete',
      Object.keys(activityDirectiveDeletionMap).reduce(
        (previousValue: ActivityDirectiveDeletionMap, directiveIdKey: string) => {
          const directiveId: number = parseInt(directiveIdKey);
          if (activityDirectivesToDeleteMap[directiveId]) {
            return {
              ...previousValue,
              [directiveId]: activityDirectiveDeletionMap[directiveId],
            };
          }

          return previousValue;
        },
        {} as ActivityDirectiveDeletionMap,
      ),
    );
  }

  function onAllChange(event: Event) {
    const { value } = getTarget(event);
    selectedAllAction = `${value}` as ActivityDeletionAction | 'custom';

    if (value !== 'custom') {
      activityDirectiveDeletionMap = activityIds.reduce(
        (previousValue: ActivityDirectiveDeletionMap, activityId: ActivityDirectiveId) => {
          return {
            [activityId]: `${value}` as ActivityDeletionAction,
            ...previousValue,
          };
        },
        {},
      );
    }
  }

  function onChange(event: Event) {
    const { name, value } = getTarget(event);
    activityDirectiveDeletionMap = {
      ...activityDirectiveDeletionMap,
      [name]: value,
    };
    selectedAllAction = 'custom';
  }

  function onToggleDelete(activityDirectiveId: ActivityDirectiveId) {
    activityDirectivesToDeleteMap = {
      ...activityDirectivesToDeleteMap,
      [activityDirectiveId]: !activityDirectivesToDeleteMap[activityDirectiveId],
    };
  }

  function onToggleHelp() {
    isHelpOpen = !isHelpOpen;
  }
</script>

<Modal height="auto" {width}>
  <ModalHeader on:close>Delete Activity {activityIds.length > 1 ? 'Directives' : 'Directive'}</ModalHeader>
  <ModalContent>
    <div class="message">
      You have selected {activityIds.length}
      {activityIds.length > 1 ? 'activities' : 'activity'} to delete.
      {#if numberOfDependentActivities > 0}
        {numberOfDependentActivities} of these activities have dependent activities. Select how you'd like to proceed.
      {/if}
    </div>
    {#if numberOfDependentActivities > 0}
      <div class="anchor-help">
        <div class="anchor-help-toggle" role="none" on:click={onToggleHelp}>
          {#if isHelpOpen}
            Hide help
          {:else}
            Show help on selection options
          {/if}
        </div>
        <div class="global-action">
          <div>Apply to all</div>
          <select class="st-select" name="all" value={selectedAllAction} on:change={onAllChange}>
            <option value={'custom'}>Custom</option>
            <option value={ActivityDeletionAction.ANCHOR_PLAN}>To Plan Start</option>
            <option value={ActivityDeletionAction.ANCHOR_ROOT}>To Nearest Parent</option>
            <option value={ActivityDeletionAction.DELETE_CHAIN}>Delete Chain</option>
          </select>
        </div>
        {#if isHelpOpen}
          <div class="help-choices">
            <div class="help-choice">
              <div>
                <div class="help-choice-title">Anchor to plan start</div>
                <div class="help-choice-description">
                  Leave dependent activities in place and link them to the plan start.
                </div>
              </div>
              <div><ReanchorToPlanStartIcon /></div>
            </div>
            <div class="help-choice">
              <div>
                <div class="help-choice-title">Anchor to nearest parent</div>
                <div class="help-choice-description">
                  Leave dependent activities in place and look for a relevant parent to link to. If none exists, link to
                  plan start.
                </div>
              </div>
              <div><ReanchorToNearestParentIcon /></div>
            </div>
            <div class="help-choice">
              <div>
                <div class="help-choice-title">Delete all linked activities</div>
                <div class="help-choice-description">
                  Delete all anchored activity directives. Simulated activities will remain in place until next plan
                  simulation.
                </div>
              </div>
              <div><DeleteAnchoredActivitiesIcon /></div>
            </div>
          </div>
        {/if}
      </div>
      <div class="anchored-form">
        {#each activityIds as activityId}
          {#if anchoredActivitiesMap[activityId]?.length}
            <div class="anchor-item">
              <div class="directive">
                <div class="directive-to-delete" class:ignored={!activityDirectivesToDeleteMap[activityId]}>
                  <div class="directive-name">
                    <ActivityDirectiveIcon label={`${activityId} - ${$activityDirectivesMap[activityId]?.name}`} />
                  </div>
                  <div class="delete-checkbox">
                    <label>
                      <span class="delete-label">Delete</span>
                      <input
                        type="checkbox"
                        checked={activityDirectivesToDeleteMap[activityId]}
                        on:change={() => onToggleDelete(activityId)}
                      />
                    </label>
                  </div>
                </div>
                <div class="dependent-directives" class:ignored={!activityDirectivesToDeleteMap[activityId]}>
                  {#each anchoredActivitiesMap[activityId] as activityDirective}
                    <div class="dependent-directive">
                      <span class="anchor-icon"><ActivityAnchorIconSVG /></span>
                      <ActivityDirectiveIcon label={`${activityDirective.id} - ${activityDirective.name}`} />
                    </div>
                  {/each}
                </div>
              </div>
              <div class="choices">
                <select
                  class="st-select"
                  name={`${activityId}`}
                  value={activityDirectiveDeletionMap[activityId]}
                  on:change={onChange}
                >
                  <option value={ActivityDeletionAction.ANCHOR_ROOT}>To Nearest Parent</option>
                  <option value={ActivityDeletionAction.ANCHOR_PLAN}>To Plan Start</option>
                  <option value={ActivityDeletionAction.DELETE_CHAIN}>Delete Chain</option>
                </select>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={confirmDelete}> Confirm </button>
  </ModalFooter>
</Modal>

<style>
  .message {
    font-weight: 500;
  }

  .anchor-help {
    margin: 1rem 0 0;
  }

  .anchor-help-toggle {
    color: var(--st-utility-blue);
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .anchor-help-toggle:hover {
    text-decoration: underline;
  }

  .help-choices {
    display: grid;
    grid-template-rows: repeat(3, min-content);
    row-gap: 1rem;
  }

  .help-choice {
    border: 1px solid var(--st-gray-20);
    border-radius: 5px;
    column-gap: 5px;
    display: grid;
    grid-template-columns: auto min-content;
    padding: 8px;
  }

  .help-choice-title,
  .help-choice-description {
    color: var(--st-gray-60);
    font-weight: 500;
  }

  .help-choice-description {
    margin-top: 8px;
    opacity: 0.7;
  }

  .global-action {
    display: grid;
    grid-template-columns: auto 150px;
    margin-bottom: 1rem;
  }

  .anchored-form {
    max-height: 500px;
    overflow: auto;
  }

  .anchor-item {
    border-top: 1px solid var(--st-gray-20);
    column-gap: 5px;
    display: grid;
    grid-template-columns: auto 150px;
    overflow-y: hidden;
    padding: 0.5rem 0;
  }

  .anchor-icon {
    padding: 5px;
    vertical-align: top;
  }

  .directive-to-delete {
    align-items: center;
    background-color: #db513914;
    display: grid;
    grid-template-columns: auto 65px;
    padding: 5px;
  }

  .directive-to-delete.ignored {
    background-color: #f8f8f8;
  }
  .directive-name {
    align-items: center;
    display: grid;
    grid-template-columns: 200px min-content;
  }

  .dependent-directives.ignored {
    opacity: 0.5;
  }

  .dependent-directive {
    margin-top: 5px;
  }

  input[type='checkbox'],
  .delete-label {
    vertical-align: middle;
  }

  .choices {
    padding: 2px 0;
  }

  .choices select {
    width: 100%;
  }
</style>
