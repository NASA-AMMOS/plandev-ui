<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { activityArgumentDefaultsMap } from '../../stores/activities';
  import { field } from '../../stores/form';
  import { plan, planModelActivityTypes } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import type { ActivityDirectiveInsertInput, ActivityType } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { FieldStore } from '../../types/form';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import { validateArguments } from '../../utilities/activities';
  import { getTarget, lowercase } from '../../utilities/generic';
  import { getFormParameters } from '../../utilities/parameters';
  import { convertDoyToYmd, formatDate, getDoyTime, getIntervalFromDoyRange } from '../../utilities/time';
  import { required } from '../../utilities/validators';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import MenuItem from '../menus/MenuItem.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Draggable from '../timeline/form/TimelineEditor/Draggable.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';

  export let width: number = 1000;
  export let height: number = 700;
  export let directiveName: string = '';
  export let currentActivityType: string = '';
  export let user: User | null = null;

  let currentActivityTypeFormParams: FormParameter[] = [];
  let currentlySelectedActivityType: ActivityType | undefined;
  let dirtyDirectiveErrorsMap: Record<string, string[]> = {};
  let dirtyDirective: ActivityDirectiveInsertInput = {
    anchor_id: null,
    anchored_to_start: true,
    arguments: {},
    metadata: {},
    name: '',
    plan_id: $plan?.id ?? -1,
    start_offset: '',
    type: '',
  };
  let manualInputOpen: boolean = false;
  let manualInputRef: HTMLInputElement;
  let manualInputWidth: number = 200;
  let manualMenu: Menu;
  let planMinDate: Date | undefined;
  let planMaxDate: Date | undefined;
  let rootRef: HTMLDivElement;
  let shown: boolean = false;
  let startTimeField: FieldStore<string>;
  let startTime: string = $plan?.start_time_doy ?? '';


  const dispatch = createEventDispatcher<{
    createActivityDirective: { directive: ActivityDirectiveInsertInput };
    directiveChange: { directive: object };
    rename: { name: string };
    visibilityChange: { isShown: boolean };
  }>();

  export function setCurrentActivityType(newType: string) {
    currentActivityType = newType;
    selectActivityType(currentActivityType);
  }

  export function setCurrentActivityStart(newStartTime: string) {
    startTime = newStartTime;
  }

  export function setActiveDirective(newDirective: ActivityDirectiveInsertInput) {
    dirtyDirective = newDirective;
  }

  export function toggle() {
    if (shown) {
      hide();
    } else {
      show();
    }
    dispatch('visibilityChange', { isShown: shown });
  }

  export function show() {
    shown = true;
    dispatch('visibilityChange', { isShown: shown });
  }

  export function hide() {
    shown = false;
    dispatch('visibilityChange', { isShown: shown });
  }

  function selectActivityType(newType: string) {
    dirtyDirective.arguments = {};
    currentlySelectedActivityType = $planModelActivityTypes.find(activityType => activityType.name === newType);
    dirtyDirective.type = newType;
    getArgumentValidation();
  }

  function onTypeSelected(newType: string) {
    selectActivityType(newType);
    if (manualMenu !== undefined) {
      manualMenu.hide();
    }
    manualInputRef.value = newType;
  }

  async function getArgumentValidation(): Promise<void> {
    if ($plan && $plan.model_id && user) {
      dirtyDirectiveErrorsMap = await validateArguments(
        undefined,
        dirtyDirective.type,
        dirtyDirective.arguments,
        $plan?.model_id,
        user,
      );
    }
  }

  function refreshFormParameters(
    activityType: ActivityType | undefined,
    activityArguments: ArgumentsMap,
  ): FormParameter[] {
    if (activityType) {
      currentActivityTypeFormParams = getFormParameters(
        activityType.parameters,
        activityArguments,
        activityType.required_parameters,
        undefined,
        $activityArgumentDefaultsMap[activityType.name || ''] ?? {},
      );
    }
    return [];
  }

  async function onPlanStartTimeClick() {
    if ($plan) {
      startTimeField.validateAndSet(formatDate(new Date($plan.start_time), $plugins.time.primary.format));
    }
  }

  async function onPlanEndTimeClick() {
    if ($plan) {
      const endTimeYmd = convertDoyToYmd($plan.end_time_doy);
      if (endTimeYmd) {
        startTimeField.validateAndSet(formatDate(new Date(endTimeYmd), $plugins.time.primary.format));
      }
    }
  }

  $: if (manualInputOpen) {
    manualMenu?.show();
  } else {
    manualMenu?.hide();
  }
  $: filteredActivityTypes = $planModelActivityTypes.filter(type => {
    if (!currentActivityType) {
      return true;
    }

    return lowercase(type.name).indexOf(lowercase(currentActivityType)) > -1;
  });
  $: startTimeField = field<string>(startTime, [required, $plugins.time.primary.validate]);
  $: startTimeField.validateAndSet(startTime);
  $: if ($plan) {
    const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
    if (startTimeDate) {
      const startTimeDoy = getDoyTime(startTimeDate);
      const startOffset = getIntervalFromDoyRange($plan.start_time_doy, startTimeDoy);
      dirtyDirective.start_offset = startOffset;
    }
  }
  $: if ($plan) {
    planMinDate = $plugins.time.primary.parse($plan.start_time_doy) ?? undefined;
    planMaxDate = $plugins.time.primary.parse($plan.end_time_doy) ?? undefined;
  }
  $: if (currentlySelectedActivityType && currentlySelectedActivityType.parameters) {
    currentActivityTypeFormParams = refreshFormParameters(
      currentlySelectedActivityType,
      dirtyDirective.arguments
    );
  }

  $: if (dirtyDirectiveErrorsMap) {
    currentActivityTypeFormParams = currentActivityTypeFormParams.map((formParameter: FormParameter) => {
      let errors = dirtyDirectiveErrorsMap[formParameter.name];
      if (formParameter.required && formParameter.value === null) {
        if (!errors) {
          errors = [];
        }
        errors.push('Parameter not explicitly set');
      }
      return { ...formParameter, errors: errors || null };
    });
  }

  function onDirectiveNameChange(event: Event) {
    const { value } = getTarget(event);
    dirtyDirective.name = value as string;
    dispatch('rename', { name: value as string });
  }

  function getDefaultPosition() {
    if (!rootRef) {
      return { x: 0, y: 0 };
    }
    const { x, y, width, height } = rootRef.getBoundingClientRect();
    let defaultX = 0;
    let defaultY = 0;
    const padding = 16;

    if (x - width > padding / 2) {
      defaultX = x - width - padding / 2;
    } else if (x + width + width < document.body.clientWidth - padding / 2) {
      defaultX = x + width + padding / 2;
    } else {
      defaultX = Math.max(0, document.body.clientWidth / 2 - width / 2);
    }

    if (y - height / 2 > padding && y + height < document.body.clientHeight - padding) {
      defaultY = y - height / 2;
    } else if (y + height < document.body.clientHeight - padding) {
      // Show below
      defaultY = y;
    } else if (y + height - height > padding) {
      // Show above
      defaultY = y + height - height;
    } else {
      defaultY = Math.max(0, document.body.clientHeight / 2 - height / 2);
    }

    return {
      x: defaultX,
      y: defaultY,
    };
  }
</script>

<div bind:this={rootRef} class="w-full" style:display="grid">
  <slot name="trigger" />
  {#if shown}
    <Draggable
      className="st-menu activity-directive-builder"
      initialWidth={width}
      initialHeight={height}
      dragOptions={{ defaultPosition: getDefaultPosition() }}
    >
      <div slot="handle">
        <MenuHeader title="Activity Directive Builder">
          <button on:click|stopPropagation={hide} class="st-button icon" aria-label="close">
            <CloseIcon />
          </button>
        </MenuHeader>
      </div>
      <div class="body">
        <div class="filters w-full">
          <div class="directive-section" aria-label="directive-name">
            <div class="directive-section-header st-typography-medium">
              <div class="directive-section-title">Directive Name</div>
            </div>
            <div class="directive-section-content directive-section-content-bordered">
              <div bind:clientWidth={manualInputWidth}>
                <Input>
                  <input
                    name="manual-types-filter-input"
                    value={directiveName}
                    class="st-input w-full"
                    aria-label="directive-name"
                    placeholder="Enter a name for this directive..."
                    on:input={onDirectiveNameChange}
                  />
                </Input>
              </div>
            </div>
          </div>
          <div class="directive-section" aria-label="manual-types">
            <div class="directive-section-header st-typography-medium">
              <div class="directive-section-title">Activity Type</div>
            </div>
            <div class="directive-section-content directive-section-content-bordered">
              <div bind:clientWidth={manualInputWidth}>
                <Input>
                  <div class="search-icon" slot="left"><SearchIcon /></div>
                  <input
                    autocomplete="off"
                    bind:this={manualInputRef}
                    name="manual-types-filter-input"
                    class="st-input manual-types-filter-input w-full"
                    placeholder="Select type"
                    bind:value={currentActivityType}
                    on:click={() => {
                      requestAnimationFrame(() => {
                        if (!manualInputOpen) {
                          manualInputOpen = true;
                        }
                      });
                    }}
                  />
                </Input>
              </div>
              <div style:position="relative" style:width="0px">
                <Menu
                  width={manualInputWidth}
                  hideAfterClick={true}
                  placement="right-start"
                  bind:this={manualMenu}
                  on:hide={() => (manualInputOpen = false)}
                >
                  <div class="manual-types-menu">
                    {#if filteredActivityTypes.length > 0}
                      {#each filteredActivityTypes as type}
                        <MenuItem on:click={() => onTypeSelected(type.name)}>
                          <div class="st-typography-body">{type.name}</div>
                        </MenuItem>
                      {/each}
                    {:else}
                      <MenuItem disabled>No activities matching your filter</MenuItem>
                    {/if}
                  </div>
                </Menu>
              </div>
            </div>
          </div>
          <div class="directive-section" aria-label="start-time">
            <div class="directive-section-header st-typography-medium">
              <div class="directive-section-title">
                Start Time
                <div class="hint st-typography-body">
                  ({$plugins.time.primary.label})
                </div>
              </div>
            </div>
            <div class="directive-section-content directive-section-content-bordered">
              <DatePickerField
                minDate={planMinDate}
                maxDate={planMaxDate}
                useFallback={!$plugins.time.enableDatePicker}
                field={startTimeField}
                hideToday={true}
              >
                <DatePickerActionButton on:click={onPlanStartTimeClick} text="Plan Start">
                  <PlanLeftArrow />
                </DatePickerActionButton>
                <DatePickerActionButton on:click={onPlanEndTimeClick} text="Plan End">
                  <PlanRightArrow />
                </DatePickerActionButton>
              </DatePickerField>
            </div>
          </div>
          <div class="directive-section" aria-label="other-filters">
            <div class="directive-section-header st-typography-medium">
              <div class="directive-section-title">Arguments</div>
            </div>
            <div class="directive-section-content directive-section-content-bordered">
              <div class="activity-preset">
                <Parameters
                  disabled={false}
                  formParameters={currentActivityTypeFormParams}
                  on:change={event => {
                    const { name, value } = event.detail;
                    dirtyDirective.arguments = { ...dirtyDirective.arguments, [name]: value };
                    if (currentlySelectedActivityType) {
                      currentActivityTypeFormParams = refreshFormParameters(
                        currentlySelectedActivityType,
                        dirtyDirective.arguments
                      );
                    }
                    getArgumentValidation();
                  }}
                />
                {#if !currentActivityTypeFormParams || currentActivityTypeFormParams.length === 0}
                  <div class="st-typography-label">No Parameters Found</div>
                {/if}
              </div>
            </div>
          </div>
          <slot name="footer" />
          <button
            class="st-button primary min-h-6"
            on:click={() => {
              dispatch('createActivityDirective', { directive: dirtyDirective });
            }}>Create Activity Directive</button
          >
        </div>
      </div>
    </Draggable>
  {/if}
</div>

<style>
  :global(.activity-directive-builder) {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 90vh;
    max-width: 95vw;
    min-height: 400px;
    min-width: 600px;
    width: 100%;
  }

  :global(.activity-directive-builder .header) {
    cursor: inherit;
  }

  .body {
    background: #f7f7f8; /* TODO: color not in design system */
    display: flex;
    flex: 1;
    height: inherit;
    overflow: hidden;
  }

  .directive-section {
    background: white;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
  }

  .directive-section-header {
    align-items: center;
    display: flex;
    height: 40px;
    justify-content: space-between;
    padding: 16px 8px;
  }

  .directive-section-title {
    display: flex;
    gap: 8px;
    user-select: none;
  }

  .directive-section-title .hint {
    opacity: 0.5;
  }

  .directive-section-content {
    padding: 0px 8px 8px;
  }

  .directive-section-content-bordered {
    border-top: 1px solid var(--st-gray-20);
    padding: 8px;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding: 8px;
  }

  .manual-types-menu {
    --aerie-menu-item-padding: 8px;
    cursor: pointer;
    max-height: 320px;
    overflow: auto;
    width: 100%;
  }

  .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  :global(.activity-directive-grid) {
    width: 100%;
  }
</style>
