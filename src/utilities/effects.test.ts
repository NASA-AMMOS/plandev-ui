import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Errors from '../stores/errors';
import { mockUser } from '../tests/mocks/user/mockUser';
import type { ExternalEventTypeInsertInput } from '../types/external-event';
import type { DerivationGroupInsertInput, ExternalSourceTypeInsertInput } from '../types/external-source';
import type { Model } from '../types/model';
import type { ArgumentsMap, ParametersMap } from '../types/parameter';
import type { Plan } from '../types/plan';
import type { SequenceTemplate } from '../types/sequence-template';
import type { ActivityLayerFilter } from '../types/timeline';
import effects, { replacePaths } from './effects';
import * as Modals from './modal';
import * as Requests from './requests';

const mockPlanStore = await vi.hoisted(() => import('../stores/__mocks__/plan.mock'));

vi.mock('$env/dynamic/public', () => {
  return {
    env: {
      PUBLIC_COMMAND_EXPANSION_MODE: 'typescript',
    },
  };
}); // https://github.com/sveltejs/kit/issues/8180

vi.mock('./toast', () => ({
  showFailureToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const catchErrorSpy = vi.fn();

describe('Handle modal and requests in effects', () => {
  beforeAll(() => {
    vi.mock('../stores/plan', () => ({
      ...mockPlanStore,
    }));
  });

  beforeEach(() => {
    vi.resetAllMocks();
    catchErrorSpy.mockReset();
  });

  describe('applyPresetToActivity', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        apply_preset_to_activity: null,
      });

      vi.spyOn(Modals, 'showConfirmModal').mockResolvedValueOnce({ confirm: true });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.applyPresetToActivity(
        {
          arguments: {},
          associated_activity_type: 'foo',
          id: 1,
          model_id: 1,
          name: 'Foo preset',
          owner: 'test',
        },
        2,
        {
          collaborators: [
            {
              collaborator: 'test',
            },
          ],
          id: 3,
          model: {
            id: 1,
            owner: 'test',
          } as Model,
          owner: 'test',
        } as Plan,
        4,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Preset Unable To Be Applied To Activity',
        Error('Unable to apply preset with ID: "1" to directive with ID: "2"'),
      );
    });
  });

  describe('applyTemplateToSimulation', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        updateSimulation: null,
      });

      vi.spyOn(Modals, 'showConfirmModal').mockResolvedValueOnce({ confirm: true });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.applyTemplateToSimulation(
        {
          arguments: {},
          description: '',
          id: 1,
          owner: 'test',
        },
        {
          arguments: {},
          id: 1,
          revision: 1,
          simulation_end_time: '',
          simulation_start_time: '',
          template: null,
        },
        {
          id: 1,
          owner: 'test',
        } as Plan,
        3,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Simulation Update Failed',
        Error('Unable to update simulation with ID: "1"'),
      );
    });
  });

  describe('checkConstraints', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        checkConstraintsResponse: null,
      });

      vi.spyOn(Modals, 'showConfirmModal').mockResolvedValueOnce({ confirm: true });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.checkConstraints(
        {
          id: 1,
          owner: 'test',
        } as Plan,
        mockUser,
        false,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Check Constraints Failed',
        Error('Unable to check constraints for plan with ID: "1"'),
      );
    });
  });

  describe('insertDerivationGroupForPlan', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        planExternalSourceLink: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.insertDerivationGroupForPlan(
        'Default',
        {
          id: 1,
          owner: 'test',
        } as Plan,
        mockUser,
      );

      expect(catchErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('deleteDerivationGroupForPlan', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        id: 1,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.deleteDerivationGroupForPlan(
        'Default',
        {
          id: 1,
          owner: 'test',
        } as Plan,
        mockUser,
      );

      expect(catchErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('createDerivationGroup', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        createDerivationGroup: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createDerivationGroup(
        {
          name: 'test',
          source_type_name: 'Example Source',
        } as DerivationGroupInsertInput,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Derivation Group Create Failed',
        Error('Unable to create derivation group'),
      );
    });
  });

  describe('deleteDerivationGroup', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        deleteDerivationGroup: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.deleteDerivationGroup(
        {
          derived_event_total: 0,
          name: 'Default',
          owner: 'userA',
          source_type_name: 'Example',
          sources: new Map(),
        },
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Derivation Group Deletion Failed',
        Error('Unable to delete derivation group'),
      );
    });
  });

  describe('createExternalSourceType', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        createExternalSourceType: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createExternalSourceType(
        {
          name: 'SourceTypeA',
        } as ExternalSourceTypeInsertInput,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'External Source Type Create Failed',
        Error('Unable to create external source type'),
      );
    });
  });

  describe('createExternalEventType', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        createExternalEventType: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createExternalEventType(
        {
          name: 'EventTypeA',
        } as ExternalEventTypeInsertInput,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'External Event Type Create Failed',
        Error('Unable to create external event type'),
      );
    });
  });

  describe('createExternalSource', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        createExternalSource: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createExternalSource(
        'Example Source',
        'Example Source Default',
        '2024-001T00:00:00',
        '2024-007T00:00:00',
        [],
        'ExampleSource.json',
        '2024-001T00:00:00',
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'External Source Create Failed',
        Error('Unable to create external source'),
      );
    });
  });

  describe('getExternalEvents', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        external_event: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.getExternalEvents('test', 'test', mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Failed to retrieve external events.',
        Error("Unable to get external events for external source 'test' (derivation group: 'test')."),
      );
    });
  });

  describe('getExternalEventTypesBySource', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        external_event_type_ids: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.getExternalEventTypesBySource('test', 'test', mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(Error('Unable to retrieve external event types for source'));
    });
  });

  describe('getExternalEventTypes', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        plan_derivation_group: null,
      });
      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.getExternalEventTypes(1, mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(Error('Unable to gather all external event types for the source'));
    });
  });

  // TODO: 'Metadata' will be included for external sources in the future
  // describe('getExternalSourceMetadata', () => {
  //   it('should correctly handle null responses', async () => {
  //     vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
  //       external_source: null,
  //     });
  //     vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

  //     await effects.getExternalSourceMetadata('test', 'test', mockUser);

  //     expect(catchErrorSpy).toHaveBeenCalledWith(
  //       Error(
  //         "Unable to get external source metadata for external source 'test' (derivation group: 'test'). Source may not exist.",
  //       ),
  //     );
  //   });
  // });

  describe('createActivityDirective', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        insert_activity_directive_one: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createActivityDirective(
        {},
        '2020-100T00:00:00',
        '',
        'foo',
        {},
        {
          id: 1,
          owner: 'test',
        } as Plan,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Activity Directive Create Failed',
        Error('Unable to create activity directive "foo" on plan with ID 1'),
      );
    });
  });

  describe('createActivityDirectiveTags', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        insert_activity_directive_tags: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createActivityDirectiveTags([], mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Create Activity Directive Tags Failed',
        Error('Unable to create activity directive tags'),
      );
    });

    it('should correctly handle empty array responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        insert_activity_directive_tags: {
          affected_rows: 0,
        },
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createActivityDirectiveTags(
        [
          {
            directive_id: 1,
            plan_id: 0,
            tag_id: 1,
          },
        ],
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledOnce();
      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Create Activity Directive Tags Failed',
        Error('Some activity directive tags were not successfully created'),
      );
    });
  });

  describe('createSequenceTemplate', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        insert_sequence_template_one: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createSequenceTemplate('', '', 0, '', 0, '', mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Create Sequence Template Failed',
        Error('Create Sequence Template Failed'),
      );
    });
  });

  describe('deleteSequenceTemplate', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        delete_sequence_template_by_pk: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);
      vi.spyOn(Modals, 'showConfirmModal').mockResolvedValueOnce({ confirm: true });

      await effects.deleteSequenceTemplate(
        {
          activity_type: 'Example',
          id: 0,
          language: '',
          model_id: 0,
          name: 'Example Sequence',
          owner: 'user',
          parcel_id: 0,
          template_definition: 'definition',
        } as SequenceTemplate,
        mockUser,
      );

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Sequence Template Deletion Failed',
        Error('Unable to delete sequence template with ID: "0"'),
      );
    });
  });

  describe('createSequenceFilter', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        createSequenceFilter: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.createSequenceFilter({} as ActivityLayerFilter, '', 0, mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Create Sequence Filter Failed',
        Error('Create Sequence Filter Failed'),
      );
    });
  });

  describe('deleteSequenceFilters', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        delete_sequence_filter: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);
      vi.spyOn(Modals, 'showConfirmModal').mockResolvedValueOnce({ confirm: true });

      await effects.deleteSequenceFilters([1, 2, 3], mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith(
        'Sequence Filter Delete Failed',
        Error('Unable to delete sequence filters with IDs: "1,2,3"'),
      );
    });
  });

  describe('expandTemplates', () => {
    it('should correctly handle null responses', async () => {
      vi.spyOn(Requests, 'reqHasura').mockResolvedValue({
        expandAllTemplates: null,
      });

      vi.spyOn(Errors, 'catchError').mockImplementationOnce(catchErrorSpy);

      await effects.expandTemplates([], 0, 0, mockUser);

      expect(catchErrorSpy).toHaveBeenCalledWith('Sequence Templating Failed', Error('Sequence Templating Failed'));
    });
  });

  describe('replacePaths', () => {
    it('should find and replace all matching paths in sim config', async () => {
      const modelParameters: ParametersMap = {
        parameter0: { order: 0, schema: { type: 'int' } },
        parameter1: { order: 1, schema: { type: 'path' } },
        parameter2: { order: 2, schema: { items: { x: { type: 'boolean' }, y: { type: 'path' } }, type: 'struct' } },
        parameter3: {
          order: 3,
          schema: { items: { type: 'variant', variants: [{ key: 'A', label: 'A' }] }, type: 'series' },
        },
        parameter4: { order: 4, schema: { items: { type: 'path' }, type: 'series' } },
      };
      const simArgs: ArgumentsMap = {
        parameter0: 1,
        parameter1: 'abcdefg',
        parameter2: {
          x: true,
          y: 'hijklmnop',
        },
        parameter3: ['A'],
        parameter4: ['qrstuvwxyz', 'zyxwvut'],
      };
      const filenames = {
        abcdefg: 'path1',
        hijklmnop: 'path2',
        qrstuvwxyz: 'path3',
        zyxwvut: 'path4',
      };

      const res = replacePaths(modelParameters, simArgs, filenames);

      expect(res).toEqual({
        parameter0: 1,
        parameter1: 'path1',
        parameter2: {
          x: true,
          y: 'path2',
        },
        parameter3: ['A'],
        parameter4: ['path3', 'path4'],
      });
    });
  });
});
