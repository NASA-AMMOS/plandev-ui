<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import PlanLeftArrow from '@nasa-jpl/stellar/icons/plan_with_left_arrow.svg?component';
  import PlanRightArrow from '@nasa-jpl/stellar/icons/plan_with_right_arrow.svg?component';
  import { ChevronDown } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { activityArgumentDefaultsMap } from '../../stores/activities';
  import {
    closeDirectiveBuilder,
    directiveBuilderIsVisible,
    directiveBuilderWIP,
    updateDirectiveBuilder,
  } from '../../stores/directiveBuilder';
  import { field } from '../../stores/form';
  import { planModelActivityTypes } from '../../stores/plan';
  import { plugins } from '../../stores/plugins';
  import type { ActivityDirectiveInsertInput, ActivityType } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DropdownOption } from '../../types/dropdown';
  import type { FieldStore } from '../../types/form';
  import type { ArgumentsMap, FormParameter } from '../../types/parameter';
  import type { Plan } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { getFormParameters } from '../../utilities/parameters';
  import { convertDoyToYmd, formatDate, getDoyTime, getIntervalFromDoyRange } from '../../utilities/time';
  import { required } from '../../utilities/validators';
  import DatePickerField from '../form/DatePickerField.svelte';
  import Input from '../form/Input.svelte';
  import MenuHeader from '../menus/MenuHeader.svelte';
  import Parameters from '../parameters/Parameters.svelte';
  import Draggable from '../timeline/form/TimelineEditor/Draggable.svelte';
  import DatePickerActionButton from '../ui/DatePicker/DatePickerActionButton.svelte';
  import SearchableDropdown from '../ui/SearchableDropdown.svelte';

  export let builderWidth: number = 400;
  export let builderHeight: number = 700;
  export let plan: Plan | null = null;
  export let user: User | null = null;

  const dispatch = createEventDispatcher<{
    createActivityDirective: { directive: ActivityDirectiveInsertInput };
  }>();

  let currentActivityTypeFormParams: FormParameter[] = [];
  let currentlySelectedActivityType: ActivityType | undefined;
  let dirtyDirectiveErrorsMap: Record<string, string[]> = {};
  let dirtyDirective: ActivityDirectiveInsertInput = {
    anchor_id: null,
    anchored_to_start: true,
    arguments: {},
    metadata: {},
    name: $directiveBuilderWIP.name,
    plan_id: plan?.id ?? -1,
    start_offset: '',
    type: $directiveBuilderWIP.type,
  };
  let activityTypesOptions: DropdownOption[] = [];
  let manualInputWidth: number = 200;
  let planMinDate: Date | undefined;
  let planMaxDate: Date | undefined;
  let rootRef: HTMLDivElement;
  let startTimeField: FieldStore<string>;
  let startTime: string = $directiveBuilderWIP.startTime ?? plan?.start_time_doy ?? '';

  $: selectActivityType($directiveBuilderWIP.type);
  $: activityTypesOptions = $planModelActivityTypes.map(activityType => {
    return { display: activityType.name, value: activityType.name };
  });
  $: {
    startTimeField = field<string>(startTime, [required, $plugins.time.primary.validate]);
    startTimeField.validateAndSet(startTime);
  }
  $: if ($directiveBuilderWIP.startTime !== '') {
    startTime = $directiveBuilderWIP.startTime;
  }
  $: if (plan) {
    const startTimeDate = $plugins.time.primary.parse($startTimeField.value);
    if (startTimeDate) {
      const startTimeDoy = getDoyTime(startTimeDate);
      const startOffset = getIntervalFromDoyRange(plan.start_time_doy, startTimeDoy);
      dirtyDirective.start_offset = startOffset;
    }
  }
  $: if (plan) {
    planMinDate = $plugins.time.primary.parse(plan.start_time_doy) ?? undefined;
    planMaxDate = $plugins.time.primary.parse(plan.end_time_doy) ?? undefined;
  }
  $: if (currentlySelectedActivityType && currentlySelectedActivityType.parameters) {
    currentActivityTypeFormParams = refreshFormParameters(currentlySelectedActivityType, dirtyDirective.arguments);
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

  function selectActivityType(newType: string) {
    dirtyDirective.arguments = {};
    currentlySelectedActivityType = $planModelActivityTypes.find(activityType => activityType.name === newType);
    dirtyDirective.type = newType;
    getArgumentValidation();
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
      return currentActivityTypeFormParams;
    }
    return [];
  }

  function onDirectiveNameChange(event: Event) {
    const { value } = getTarget(event);
    dirtyDirective.name = value as string;
    updateDirectiveBuilder({ name: value as string });
  }

  function getDefaultPosition() {
    if (typeof document === 'undefined') {
      return { x: 0, y: 0 };
    }
    const padding = 16;
    const viewW = document.body.clientWidth;
    const viewH = document.body.clientHeight;
    const effW = Math.min(builderWidth, viewW - padding * 2);
    const effH = Math.min(builderHeight, viewH - padding * 2);
    return {
      x: Math.max(padding, (viewW - effW) / 2),
      y: Math.max(padding, (viewH - effH) / 2),
    };
  }

  function onResetFormParameters(event: CustomEvent<FormParameter>) {
    const { detail: formParameter } = event;
    const { [formParameter.name]: _, ...updatedArgs } = dirtyDirective.arguments;
    dirtyDirective.arguments = updatedArgs;

    currentActivityTypeFormParams = refreshFormParameters(currentlySelectedActivityType, dirtyDirective.arguments);
  }

  async function getArgumentValidation(): Promise<void> {
    if (plan && plan.model_id && user) {
      dirtyDirectiveErrorsMap = await effects.validateActivityArguments(
        dirtyDirective.type,
        undefined,
        plan?.model_id,
        dirtyDirective.arguments,
        user,
      );
    }
  }

  async function onPlanStartTimeClick() {
    if (plan) {
      startTimeField.validateAndSet(formatDate(new Date(plan.start_time), $plugins.time.primary.format));
    }
  }

  async function onPlanEndTimeClick() {
    if (plan) {
      const endTimeYmd = convertDoyToYmd(plan.end_time_doy);
      if (endTimeYmd) {
        startTimeField.validateAndSet(formatDate(new Date(endTimeYmd), $plugins.time.primary.format));
      }
    }
  }
</script>

<div bind:this={rootRef} class="w-full" style:display="grid">
  {#if $directiveBuilderIsVisible}
    <Draggable
      className="st-menu activity-directive-builder"
      initialWidth={builderWidth}
      initialHeight={builderHeight}
      dragOptions={{ defaultPosition: getDefaultPosition() }}
    >
      <div slot="handle">
        <MenuHeader title="Activity Directive Builder">
          <button on:click|stopPropagation={closeDirectiveBuilder} class="st-button icon" aria-label="close">
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
                    value={$directiveBuilderWIP.name}
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
                <SearchableDropdown
                  allowMultiple={false}
                  options={activityTypesOptions}
                  loading={false}
                  on:change={e => {
                    const v = e.detail[0];
                    // $activeDirectiveType = v;
                    updateDirectiveBuilder({ type: v });
                  }}
                  selectedOptionValues={$directiveBuilderWIP.type === '' ? [] : [$directiveBuilderWIP.type]}
                >
                  <ChevronDown slot="icon" />
                </SearchableDropdown>
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
                hideTodayButton={true}
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
                        dirtyDirective.arguments,
                      );
                    }
                    getArgumentValidation();
                  }}
                  on:reset={onResetFormParameters}
                />
                {#if !currentActivityTypeFormParams || currentActivityTypeFormParams.length === 0}
                  <div class="st-typography-label">No Parameters Found</div>
                {/if}
              </div>
            </div>
          </div>
          <slot name="footer" />
          <button
            class="st-button primary mt-auto min-h-6"
            disabled={!currentlySelectedActivityType}
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

  :global(.activity-directive-grid) {
    width: 100%;
  }
</style>
