<svelte:options immutable={true} />

<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { indentService, syntaxTree } from '@codemirror/language';
  import { lintGutter, openLintPanel } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import { type ViewUpdate } from '@codemirror/view';
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type {
    ChannelDictionary,
    CommandDictionary,
    FswCommand,
    FswCommandArgument,
    FswCommandArgumentRepeat,
    ParameterDictionary,
  } from '@nasa-jpl/aerie-ampcs';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import {
    getGlobals,
    outputFormat,
    sequenceAdaptation,
    setSequenceAdaptation,
  } from '../../stores/sequence-adaptation';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcelToParameterDictionaries,
  } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import { type SequenceTemplate } from '../../types/sequence-template';
  import {
    type ArgTextDef,
    type IOutputFormat,
    type ISequenceAdaptation,
    type LibrarySequence,
    type LibrarySequenceMap,
    type Parcel,
    type TimeTagInfo,
  } from '../../types/sequencing';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import type { CommandInfoMapper } from '../../utilities/sequence-editor/command-info-mapper';
  import { getCustomArgDef, inputLinter, outputLinter } from '../../utilities/sequence-editor/extension-points';
  import { setupLanguageSupport } from '../../utilities/sequence-editor/languages/seq-n-handlebars/seq-n-handlebars';
  import {
    seqNHighlightBlock,
    seqqNBlockHighlighter,
  } from '../../utilities/sequence-editor/languages/seq-n/seq-n-highlighter';
  import { SeqNCommandInfoMapper } from '../../utilities/sequence-editor/languages/seq-n/seq-n-tree-utils';
  import {
    setupVmlLanguageSupport,
    vmlAdaptation,
    vmlBlockHighlighter,
    vmlHighlightBlock,
  } from '../../utilities/sequence-editor/languages/vml/vml';
  import { vmlAutoComplete } from '../../utilities/sequence-editor/languages/vml/vml-adaptation';
  import { librarySequenceToFswCommand } from '../../utilities/sequence-editor/languages/vml/vml-block-library';
  import { vmlFormat } from '../../utilities/sequence-editor/languages/vml/vml-formatter';
  import { vmlLinter } from '../../utilities/sequence-editor/languages/vml/vml-linter';
  import { vmlTooltip } from '../../utilities/sequence-editor/languages/vml/vml-tooltip';
  import { VmlCommandInfoMapper } from '../../utilities/sequence-editor/languages/vml/vml-tree-utils';
  import { seqNFormat } from '../../utilities/sequence-editor/sequence-autoindent';
  import { TOKEN_ERROR } from '../../utilities/sequence-editor/sequence-constants';
  import { sequenceTooltip } from '../../utilities/sequence-editor/sequence-tooltip';
  import { isFswCommandArgumentRepeat, unquoteUnescape } from '../../utilities/sequence-editor/sequence-utils';
  import { showFailureToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import CommandPanel from '../sequencing/CommandPanel/CommandPanel.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let parcel: Parcel | null;
  export let showCommandFormBuilder: boolean = false;
  export let readOnly: boolean = false;
  export let template: SequenceTemplate;
  export let sequenceOutput: string = '';
  export let title: string = 'Sequence Template - Editor';
  export let user: User | null;

  let sequenceName: string = '';
  let sequenceDefinition: string = '';

  $: sequenceName = template?.name ?? '';
  $: sequenceDefinition = template?.template_definition ?? '';

  const dispatch = createEventDispatcher<{
    templateChanged: { input: string; output: string };
  }>();

  const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);
  const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

  // TODO: Eventually, utilize these w. Sequence Adaptations - currently only utilizing the *default* adaptation
  const librarySequenceMap: LibrarySequenceMap = {};
  const librarySequences: LibrarySequence[] = [];

  let clientHeightGridRightBottom: number = 0;
  let clientHeightGridRightTop: number = 0;
  let compartmentSeqJsonLinter: Compartment;
  let compartmentSeqLanguage: Compartment;
  let compartmentSeqLinter: Compartment;
  let compartmentSeqTooltip: Compartment;
  let compartmentSeqAutocomplete: Compartment;
  let compartmentSeqHighlighter: Compartment;
  let channelDictionary: ChannelDictionary | null;
  let commandDictionary: CommandDictionary | null;
  let parameterDictionaries: ParameterDictionary[] = [];
  let commandFormBuilderGrid: string;
  let editorOutputDiv: HTMLDivElement;
  let editorOutputView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let outputFormats: IOutputFormat[] = [];
  let selectedNode: SyntaxNode | null;
  let currentTree: Tree;
  let commandInfoMapper: CommandInfoMapper = new SeqNCommandInfoMapper();
  let selectedOutputFormat: IOutputFormat | undefined;
  let isInVmlMode: boolean = false;
  let editorHeights: string = '1fr 3px';
  let columnsWithFormBuilder: string = '3fr 3px 1.5fr';
  let columnsWithNoFormBuilder: string = '3fr 3px';

  let argInfoArray: ArgTextDef[] = [];
  let commandNode: SyntaxNode | null = null;
  let commandNameNode: SyntaxNode | null = null;
  let commandName: string | null = null;
  let commandDef: FswCommand | null = null;
  let timeTagNode: TimeTagInfo = null;
  let variablesInScope: string[] = [];

  $: {
    loadSequenceAdaptation(parcel?.sequence_adaptation_id);
  }

  $: isInVmlMode = inVmlMode(sequenceName);

  $: {
    // Since this insertion will move the cursor back to position 0, test if the content actually changed first
    if (editorSequenceView && sequenceDefinition !== editorSequenceView.state.doc.toString()) {
      // insert sequence
      editorSequenceView.dispatch({
        changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
      });
    }
  }

  $: {
    if (compartmentSeqHighlighter && editorSequenceView) {
      if (isInVmlMode) {
        editorSequenceView.dispatch({
          effects: compartmentSeqHighlighter.reconfigure([
            EditorView.updateListener.of(debouncedVmlHighlightBlock),
            vmlBlockHighlighter,
          ]),
        });
      } else {
        editorSequenceView.dispatch({
          effects: compartmentSeqHighlighter.reconfigure([
            EditorView.updateListener.of(debouncedSeqNHighlightBlock),
            seqqNBlockHighlighter,
          ]),
        });
      }
    }
  }

  $: {
    commandFormBuilderGrid = showCommandFormBuilder ? columnsWithFormBuilder : columnsWithNoFormBuilder;
  }

  $: {
    const unparsedChannelDictionary = $channelDictionaries.find(cd => cd.id === parcel?.channel_dictionary_id);
    const unparsedCommandDictionary = $commandDictionaries.find(cd => cd.id === parcel?.command_dictionary_id);
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(pd => {
      const parameterDictionary = $parcelToParameterDictionaries.find(
        p => p.parameter_dictionary_id === pd.id && p.parcel_id === parcel?.id,
      );

      if (parameterDictionary) {
        return pd;
      }
    });

    if (unparsedCommandDictionary) {
      if (sequenceName && isInVmlMode) {
        getParsedCommandDictionary(unparsedCommandDictionary, user).then(parsedCommandDictionary => {
          commandDictionary = parsedCommandDictionary;
          editorSequenceView.dispatch({
            effects: compartmentSeqLanguage.reconfigure(
              setupVmlLanguageSupport(
                vmlAutoComplete(commandDictionary, $sequenceAdaptation.globals ?? [], librarySequenceMap),
              ),
            ),
          });
          editorSequenceView.dispatch({
            effects: compartmentSeqLinter.reconfigure(
              vmlLinter(commandDictionary, librarySequenceMap, $sequenceAdaptation.globals ?? []),
            ),
          });
          editorSequenceView.dispatch({
            effects: compartmentSeqTooltip.reconfigure(vmlTooltip(commandDictionary, librarySequenceMap)),
          });
        });
      } else {
        Promise.all([
          getParsedCommandDictionary(unparsedCommandDictionary, user),
          unparsedChannelDictionary ? getParsedChannelDictionary(unparsedChannelDictionary, user) : null,
          ...unparsedParameterDictionaries.map(unparsedParameterDictionary => {
            return getParsedParameterDictionary(unparsedParameterDictionary, user);
          }),
        ]).then(([parsedCommandDictionary, parsedChannelDictionary, ...parsedParameterDictionaries]) => {
          const nonNullParsedParameterDictionaries = parsedParameterDictionaries.filter(
            (pd): pd is ParameterDictionary => !!pd,
          );

          channelDictionary = parsedChannelDictionary;
          commandDictionary = parsedCommandDictionary;
          parameterDictionaries = nonNullParsedParameterDictionaries;

          // Reconfigure sequence editor.
          editorSequenceView.dispatch({
            effects: [
              // TODO: use librarySequenceMap here, requires a change to adaptations so defer until changing adaptation API
              compartmentSeqLanguage.reconfigure(
                setupLanguageSupport(
                  $sequenceAdaptation.autoComplete(
                    parsedChannelDictionary,
                    parsedCommandDictionary,
                    nonNullParsedParameterDictionaries,
                    librarySequences,
                  ),
                ),
              ),
              compartmentSeqLinter.reconfigure(
                inputLinter(
                  $sequenceAdaptation,
                  getGlobals(),
                  parsedChannelDictionary,
                  parsedCommandDictionary,
                  nonNullParsedParameterDictionaries,
                  librarySequences,
                ),
              ),
              compartmentSeqTooltip.reconfigure(
                sequenceTooltip(
                  $sequenceAdaptation,
                  parsedChannelDictionary,
                  parsedCommandDictionary,
                  nonNullParsedParameterDictionaries,
                ),
              ),
              ...($sequenceAdaptation.autoIndent
                ? [compartmentSeqAutocomplete.reconfigure(indentService.of($sequenceAdaptation.autoIndent()))]
                : []),
            ],
          });

          // Reconfigure seq JSON editor.
          editorOutputView.dispatch({
            effects: compartmentSeqJsonLinter.reconfigure(outputLinter(parsedCommandDictionary, selectedOutputFormat)),
          });
        });
      }
    } else {
      commandDictionary = null;
      channelDictionary = null;
      parameterDictionaries = [];
    }
  }

  $: commandNode = commandInfoMapper.getContainingCommand(selectedNode);
  $: commandNameNode = commandInfoMapper.getNameNode(commandNode);
  $: commandName =
    commandNameNode && unquoteUnescape(editorSequenceView.state.sliceDoc(commandNameNode.from, commandNameNode.to));
  $: commandDef = getCommandDef(commandDictionary, librarySequenceMap, commandName ?? '');
  $: timeTagNode = getTimeTagInfo(editorSequenceView, commandNode);
  $: argInfoArray = getArgumentInfo(
    commandInfoMapper,
    editorSequenceView,
    commandInfoMapper.getArgumentNodeContainer(commandNode),
    commandDef?.arguments,
    undefined,
    parameterDictionaries,
  );
  $: variablesInScope = getVariablesInScope(
    commandInfoMapper,
    editorSequenceView,
    $sequenceAdaptation,
    currentTree,
    commandNode?.from,
  );

  onMount(() => {
    compartmentSeqJsonLinter = new Compartment();
    compartmentSeqLanguage = new Compartment();
    compartmentSeqLinter = new Compartment();
    compartmentSeqTooltip = new Compartment();
    compartmentSeqAutocomplete = new Compartment();
    compartmentSeqHighlighter = new Compartment();

    editorSequenceView = new EditorView({
      doc: sequenceDefinition,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': `${clientHeightGridRightTop}px` } }),
        lintGutter(),
        compartmentSeqLanguage.of(setupLanguageSupport($sequenceAdaptation.autoComplete(null, null, [], []))),
        compartmentSeqLinter.of(inputLinter($sequenceAdaptation, getGlobals())),
        compartmentSeqTooltip.of(sequenceTooltip($sequenceAdaptation)),
        EditorView.updateListener.of(debounce(sequenceUpdateListener, 250)),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        blockTheme,
        compartmentSeqHighlighter.of([
          EditorView.updateListener.of(debouncedSeqNHighlightBlock),
          seqqNBlockHighlighter,
        ]),
        ...($sequenceAdaptation.autoIndent
          ? [compartmentSeqAutocomplete.of(indentService.of($sequenceAdaptation.autoIndent()))]
          : []),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorSequenceDiv,
    });

    editorOutputView = new EditorView({
      doc: sequenceOutput,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': `${clientHeightGridRightBottom}px` } }),
        EditorView.editable.of(false),
        lintGutter(),
        json(),
        compartmentSeqJsonLinter.of(outputLinter()),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorOutputDiv,
    });
  });

  onDestroy(() => {
    resetSequenceAdaptation();
  });

  async function loadSequenceAdaptation(id: number | null | undefined): Promise<void> {
    if (id) {
      const adaptation = await effects.getSequenceAdaptation(id, user);

      if (adaptation) {
        try {
          setSequenceAdaptation(eval(String(adaptation.adaptation)));
        } catch (e) {
          console.error(e);
          showFailureToast('Invalid sequence adaptation');
        }
      }
    } else if (isInVmlMode) {
      setSequenceAdaptation(vmlAdaptation);
    } else {
      resetSequenceAdaptation();
    }

    outputFormats = $outputFormat;
    selectedOutputFormat = outputFormats[0];
  }

  function resetSequenceAdaptation(): void {
    setSequenceAdaptation(undefined);
  }

  async function sequenceUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const sequence = viewUpdate.state.doc.toString();
    sequenceDefinition = sequence;
    const tree = syntaxTree(viewUpdate.state);
    let output = await selectedOutputFormat?.toOutputFormat?.(tree, sequence, commandDictionary, sequenceName);

    if ($sequenceAdaptation?.modifyOutput !== undefined && output !== undefined) {
      const modifiedOutput = $sequenceAdaptation.modifyOutput(output, parameterDictionaries, channelDictionary);
      if (modifiedOutput === null) {
        output = 'modifyOutput returned null. Verify your adaptation is correct';
      } else if (modifiedOutput === undefined) {
        output = 'modifyOutput returned undefined. Verify your adaptation is correct';
      } else if (typeof modifiedOutput === 'object') {
        output = JSON.stringify(modifiedOutput);
      } else {
        output = `${modifiedOutput}`;
      }
    }

    editorOutputView.dispatch({ changes: { from: 0, insert: output, to: editorOutputView.state.doc.length } });

    if (output !== undefined) {
      dispatch('templateChanged', { input: sequence, output });
    }
  }

  function selectedCommandUpdateListener(viewUpdate: ViewUpdate): void {
    // This is broken out into a different listener as debouncing this can cause cursor to move around
    const tree = syntaxTree(viewUpdate.state);
    // Command Node includes trailing newline and white space, move to next command
    const selectionLine = viewUpdate.state.doc.lineAt(viewUpdate.state.selection.asSingle().main.from);
    const leadingWhiteSpaceLength = selectionLine.text.length - selectionLine.text.trimStart().length;
    const updatedSelectionNode = tree.resolveInner(selectionLine.from + leadingWhiteSpaceLength, 1);
    // minimize triggering selected command view
    if (selectedNode !== updatedSelectionNode) {
      if (isInVmlMode) {
        commandInfoMapper = new VmlCommandInfoMapper();
      } else {
        commandInfoMapper = new SeqNCommandInfoMapper();
      }
      selectedNode = updatedSelectionNode;
      currentTree = tree;
    }
  }

  function showErrorPanel() {
    openLintPanel(editorSequenceView);
  }

  function formatDocument() {
    if (isInVmlMode) {
      vmlFormat(editorSequenceView);
    } else {
      seqNFormat(editorSequenceView);
    }
  }

  function saveSequenceTemplate() {
    effects.updateSequenceTemplate(sequenceDefinition, template, user);
  }

  function inVmlMode(sequenceName: string | undefined): boolean {
    return sequenceName !== undefined && sequenceName.endsWith('.vml');
  }

  function getTimeTagInfo(seqEditorView: EditorView, commandNode: SyntaxNode | null): TimeTagInfo {
    const node = commandNode?.getChild('TimeTag');

    return (
      node && {
        node,
        text: seqEditorView.state.sliceDoc(node.from, node.to) ?? '',
      }
    );
  }

  function getCommandDef(
    commandDictionary: CommandDictionary | null,
    librarySequenceMap: LibrarySequenceMap,
    stemName: string,
  ): FswCommand | null {
    const commandDefFromCommandDictionary = commandDictionary?.fswCommandMap[stemName];
    if (commandDefFromCommandDictionary) {
      return commandDefFromCommandDictionary;
    }

    const librarySeqDef = librarySequenceMap[stemName];
    if (librarySeqDef) {
      return librarySequenceToFswCommand(librarySeqDef);
    }
    return null;
  }

  function getVariablesInScope(
    infoMapper: CommandInfoMapper,
    seqEditorView: EditorView,
    adaptation: ISequenceAdaptation,
    tree: Tree | null,
    cursorPosition?: number,
  ): string[] {
    const globalNames = (adaptation.globals ?? []).map(globalVariable => globalVariable.name);
    if (tree && cursorPosition !== undefined) {
      const docText = seqEditorView.state.doc.toString();
      return [...globalNames, ...infoMapper.getVariables(docText, tree, cursorPosition)];
    }
    return globalNames;
  }

  function getArgumentInfo(
    infoMapper: CommandInfoMapper,
    seqEditorView: EditorView,
    args: SyntaxNode | null,
    argumentDefs: FswCommandArgument[] | undefined,
    parentArgDef: FswCommandArgumentRepeat | undefined,
    parameterDictionaries: ParameterDictionary[],
  ) {
    const argArray: ArgTextDef[] = [];
    const precedingArgValues: string[] = [];
    const parentRepeatLength = parentArgDef?.repeat?.arguments.length;

    if (args) {
      for (const node of infoMapper.getArgumentsFromContainer(args)) {
        if (node.name === TOKEN_ERROR) {
          continue;
        }

        let argDef: FswCommandArgument | undefined = undefined;
        if (argumentDefs) {
          let argDefIndex = argArray.length;
          if (parentRepeatLength !== undefined) {
            // for repeat args shift index
            argDefIndex %= parentRepeatLength;
          }
          argDef = argumentDefs[argDefIndex];
        }

        if (commandDef && argDef) {
          argDef = getCustomArgDef(
            commandDef?.stem,
            argDef,
            precedingArgValues,
            parameterDictionaries,
            channelDictionary,
          );
        }

        let children: ArgTextDef[] | undefined = undefined;
        if (!!argDef && isFswCommandArgumentRepeat(argDef)) {
          children = getArgumentInfo(
            infoMapper,
            seqEditorView,
            node,
            argDef.repeat?.arguments,
            argDef,
            parameterDictionaries,
          );
        }
        const argValue = seqEditorView.state.sliceDoc(node.from, node.to);
        argArray.push({
          argDef,
          children,
          node,
          parentArgDef,
          text: argValue,
        });
        precedingArgValues.push(argValue);
      }
    }
    // add entries for defined arguments missing from editor
    if (argumentDefs) {
      if (!parentArgDef) {
        argArray.push(...argumentDefs.slice(argArray.length).map(argDef => ({ argDef })));
      } else {
        const repeatArgs = parentArgDef?.repeat?.arguments;
        if (repeatArgs) {
          if (argArray.length % repeatArgs.length !== 0) {
            argArray.push(...argumentDefs.slice(argArray.length % repeatArgs.length).map(argDef => ({ argDef })));
          }
        }
      }
    }

    return argArray;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveSequenceTemplate();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={commandFormBuilderGrid} minHeight={'0'}>
  <CssGrid rows={editorHeights} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{title}</SectionTitle>
        <div class="right">
          <button
            use:tooltip={{ content: 'Show Error Panel', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={showErrorPanel}
          >
            Error Panel
          </button>

          <button
            use:tooltip={{ content: 'Format sequence whitespace', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={formatDocument}
          >
            Format
          </button>

          <button
            use:tooltip={{ content: 'Save sequence template', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click|stopPropagation={saveSequenceTemplate}
            disabled={template === null}
          >
            Save
          </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <div bind:this={editorSequenceDiv} />
      </svelte:fragment>
    </Panel>
  </CssGrid>

  {#if showCommandFormBuilder}
    <CssGridGutter track={1} type="column" />
    {#if commandDictionary !== null}
      <CommandPanel
        {argInfoArray}
        {commandDef}
        {commandDictionary}
        {commandInfoMapper}
        {commandName}
        {commandNameNode}
        {commandNode}
        {editorSequenceView}
        {timeTagNode}
        {variablesInScope}
      />
    {:else}
      <Panel overflowYBody="hidden" padBody={true}>
        <svelte:fragment slot="header">
          <SectionTitle><span class="command-title">Selected Command</span></SectionTitle>
        </svelte:fragment>

        <svelte:fragment slot="body">
          <div class="st-typography-body no-selected-parcel">Select a parcel to enable the Selected Command panel.</div>
        </svelte:fragment>
      </Panel>
    {/if}
  {/if}
</CssGrid>

<style>
  .no-selected-parcel {
    padding: 8px;
  }

  .right {
    align-items: center;
    display: flex;
    justify-content: space-around;
  }

  .icon-button {
    align-items: center;
    column-gap: 5px;
    display: flex;
    margin: 2px;
  }

  .command-title {
    padding: 8px;
  }
</style>
