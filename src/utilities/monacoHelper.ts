import type { CancellationToken, editor as Editor, languages, Range } from 'monaco-editor/esm/vs/editor/editor.api';
import { CustomErrorCodes } from '../workers/customCodes';

export const sequenceProvideCodeActions = (
  model: Editor.ITextModel,
  _range: Range,
  context: languages.CodeActionContext,
  _token: CancellationToken,
): languages.ProviderResult<languages.CodeActionList> => {
  // create quick-action to convert unbalanced time to balanced time.
  const codeActions = context.markers
    .filter(error => error.code === String(CustomErrorCodes.Type.UNBALANCED))
    .map(unbalancedTime => {
      const match = unbalancedTime.message.match(/Suggestion:\s*(.*)/);
      if (match) {
        const extractSuggestedTime = match[1].replace(/\s+|[\\[|\]]/g, '');
        return generateQuickFixAction('Convert Unbalanced Time', extractSuggestedTime, unbalancedTime, model);
      }
      return undefined; // Return undefined when the match fails
    })
    .filter(action => action !== undefined) as languages.CodeAction[]; // Filter out undefined values

  // Add custom code actions like unit conversion or time conversion
  return {
    actions: codeActions,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    dispose: () => {},
  };
};

function generateQuickFixAction(
  title: string,
  replaceText: string,
  diagnostics: Editor.IMarkerData,
  model: Editor.ITextModel,
): languages.CodeAction {
  return {
    diagnostics: [diagnostics],
    edit: {
      // Define the edits needed to fix the issue
      edits: [
        {
          resource: model.uri,
          textEdit: {
            range: {
              endColumn: diagnostics.endColumn - 1,
              endLineNumber: diagnostics.endLineNumber,
              startColumn: diagnostics.startColumn + 2,
              startLineNumber: diagnostics.startLineNumber,
            },
            text: replaceText,
          },
          versionId: model.getVersionId(),
        },
      ],
    },
    isPreferred: true,
    kind: 'quickfix',
    title: title,
  };
}
