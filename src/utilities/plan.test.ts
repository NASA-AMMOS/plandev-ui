import { describe } from 'node:test';
import { expect, it, vi } from 'vitest';
import { mockUser } from '../tests/mocks/user/mockUser';
import type { ActivityDirective } from '../types/activity';
import type { Plan } from '../types/plan';
import type { Simulation } from '../types/simulation';
import effects from './effects';
import * as generic from './generic';
import * as plan from './plan';

vi.mock('./effects', () => ({
  default: {
    getActivitiesForPlan: vi.fn(),
    getEffectiveActivityArguments: vi.fn(),
    getPlanLatestSimulation: vi.fn(),
  },
}));

const getPlanLatestSimulationSpy = vi.spyOn(effects, 'getPlanLatestSimulation');
const getActivitiesForPlanSpy = vi.spyOn(effects, 'getActivitiesForPlan');
const getEffectiveActivityArgumentsSpy = vi.spyOn(effects, 'getEffectiveActivityArguments');

describe('Plan utility', () => {
  describe('getPlanForTransfer', () => {
    it('Should return a formatted plan object for downloading', async () => {
      getPlanLatestSimulationSpy.mockResolvedValueOnce({
        arguments: {
          test: 1,
        },
      } as unknown as Simulation);

      expect(
        await plan.getPlanForTransfer(
          {
            child_plans: [],
            collaborators: [],
            constraint_specification: [],
            created_at: '2024-01-01T00:00:00',
            duration: '1y',
            end_time_doy: '2025-001T00:00:00',
            id: 1,
            is_locked: false,
            model: {
              constraint_specification: [],
              created_at: '2024-01-01T00:00:00',
              id: 1,
              jar_id: 123,
              mission: 'Test',
              name: 'Test Model',
              owner: 'test',
              parameters: { parameters: {} },
              plans: [],
              refresh_activity_type_logs: [],
              refresh_model_parameter_logs: [],
              refresh_resource_type_logs: [],
              scheduling_specification_conditions: [],
              scheduling_specification_goals: [],
              version: '1.0.0',
              view: null,
            },
            model_id: 1,
            name: 'Foo plan',
            owner: 'test',
            parent_plan: null,
            revision: 1,
            scheduling_specification: null,
            simulations: [
              {
                id: 3,
                simulation_datasets: [
                  {
                    id: 1,
                    plan_revision: 1,
                  },
                ],
              },
            ],
            start_time: '2024-01-01T00:00:00+00:00',
            start_time_doy: '2024-001T00:00:00',
            tags: [
              {
                tag: {
                  color: '#fff',
                  created_at: '2024-01-01T00:00:00',
                  id: 0,
                  name: 'test tag',
                  owner: 'test',
                },
              },
            ],
            updated_at: '2024-01-01T00:00:00',
            updated_by: 'test',
          },
          mockUser,
          () => {},
          [
            {
              anchor_id: null,
              anchored_to_start: true,
              arguments: {
                numOfTests: 1,
              },
              created_at: '2024-01-01T00:00:00',
              created_by: 'test',
              id: 0,
              last_modified_arguments_at: '2024-01-01T00:00:00',
              last_modified_at: '2024-01-01T00:00:00',
              metadata: {},
              name: 'Test Activity',
              plan_id: 1,
              source_scheduling_goal_id: null,
              start_offset: '0:00:00',
              start_time_ms: 0,
              tags: [
                {
                  tag: {
                    color: '#ff0000',
                    created_at: '',
                    id: 1,
                    name: 'test tag',
                    owner: 'test',
                  },
                },
              ],
              type: 'TestActivity',
            },
          ],
        ),
      ).toEqual({
        activities: [
          {
            anchor_id: null,
            anchored_to_start: true,
            arguments: {
              numOfTests: 1,
            },
            id: 0,
            metadata: {},
            name: 'Test Activity',
            start_offset: '0:00:00',
            tags: [
              {
                tag: {
                  color: '#ff0000',
                  name: 'test tag',
                },
              },
            ],
            type: 'TestActivity',
          },
        ],
        duration: '1y',
        id: 1,
        model_id: 1,
        name: 'Foo plan',
        simulation_arguments: {
          test: 1,
        },
        start_time: '2024-01-01T00:00:00+00:00',
        tags: [
          {
            tag: {
              color: '#fff',
              name: 'test tag',
            },
          },
        ],
        version: '2',
      });
    });

    it('Should download all activities for a plan and return a formatted plan object for downloading', async () => {
      getPlanLatestSimulationSpy.mockResolvedValueOnce({
        arguments: {
          test: 1,
        },
      } as unknown as Simulation);
      getActivitiesForPlanSpy.mockResolvedValueOnce([
        {
          anchor_id: null,
          anchored_to_start: true,
          arguments: {},
          created_at: '2024-01-01T00:00:00',
          created_by: 'test',
          id: 0,
          last_modified_arguments_at: '2024-01-01T00:00:00',
          last_modified_at: '2024-01-01T00:00:00',
          metadata: {},
          name: 'Test Activity',
          plan_id: 1,
          source_scheduling_goal_id: null,
          start_offset: '0:00:00',
          start_time_ms: 0,
          tags: [
            {
              tag: {
                color: '#ff0000',
                created_at: '',
                id: 1,
                name: 'test tag',
                owner: 'test',
              },
            },
          ],
          type: 'TestActivity',
        },
      ] as ActivityDirective[]);
      getEffectiveActivityArgumentsSpy.mockResolvedValueOnce({
        arguments: {
          numOfTests: 1,
        },
        errors: {},
        success: true,
      });

      expect(
        await plan.getPlanForTransfer(
          {
            child_plans: [],
            collaborators: [],
            constraint_specification: [],
            created_at: '2024-01-01T00:00:00',
            duration: '1y',
            end_time_doy: '2025-001T00:00:00',
            id: 1,
            is_locked: false,
            model: {
              constraint_specification: [],
              created_at: '2024-01-01T00:00:00',
              id: 1,
              jar_id: 123,
              mission: 'Test',
              name: 'Test Model',
              owner: 'test',
              parameters: { parameters: {} },
              plans: [],
              refresh_activity_type_logs: [],
              refresh_model_parameter_logs: [],
              refresh_resource_type_logs: [],
              scheduling_specification_conditions: [],
              scheduling_specification_goals: [],
              version: '1.0.0',
              view: null,
            },
            model_id: 1,
            name: 'Foo plan',
            owner: 'test',
            parent_plan: null,
            revision: 1,
            scheduling_specification: null,
            simulations: [
              {
                id: 3,
                simulation_datasets: [
                  {
                    id: 1,
                    plan_revision: 1,
                  },
                ],
              },
            ],
            start_time: '2024-01-01T00:00:00+00:00',
            start_time_doy: '2024-001T00:00:00',
            tags: [
              {
                tag: {
                  color: '#fff',
                  created_at: '2024-01-01T00:00:00',
                  id: 0,
                  name: 'test tag',
                  owner: 'test',
                },
              },
            ],
            updated_at: '2024-01-01T00:00:00',
            updated_by: 'test',
          },
          mockUser,
          () => {},
        ),
      ).toEqual({
        activities: [
          {
            anchor_id: null,
            anchored_to_start: true,
            arguments: {
              numOfTests: 1,
            },
            id: 0,
            metadata: {},
            name: 'Test Activity',
            start_offset: '0:00:00',
            tags: [
              {
                tag: {
                  color: '#ff0000',
                  name: 'test tag',
                },
              },
            ],
            type: 'TestActivity',
          },
        ],
        duration: '1y',
        id: 1,
        model_id: 1,
        name: 'Foo plan',
        simulation_arguments: {
          test: 1,
        },
        start_time: '2024-01-01T00:00:00+00:00',
        tags: [
          {
            tag: {
              color: '#fff',
              name: 'test tag',
            },
          },
        ],
        version: '2',
      });
    });
  });

  describe('exportPlan', () => {
    const mockPlan: Plan = {
      child_plans: [],
      collaborators: [],
      constraint_specification: [],
      created_at: '2024-01-01T00:00:00',
      duration: '1y',
      end_time_doy: '2025-001T00:00:00',
      id: 1,
      is_locked: false,
      model: {
        constraint_specification: [],
        created_at: '2024-01-01T00:00:00',
        id: 1,
        jar_id: 123,
        mission: 'Test',
        name: 'Test Model',
        owner: 'test',
        parameters: { parameters: {} },
        plans: [],
        refresh_activity_type_logs: [],
        refresh_model_parameter_logs: [],
        refresh_resource_type_logs: [],
        scheduling_specification_conditions: [],
        scheduling_specification_goals: [],
        version: '1.0.0',
        view: null,
      },
      model_id: 1,
      name: 'Foo plan',
      owner: 'test',
      parent_plan: null,
      revision: 1,
      scheduling_specification: null,
      simulations: [
        {
          id: 3,
          simulation_datasets: [
            {
              id: 1,
              plan_revision: 1,
            },
          ],
        },
      ],
      start_time: '2024-01-01T00:00:00+00:00',
      start_time_doy: '2024-001T00:00:00',
      tags: [
        {
          tag: {
            color: '#fff',
            created_at: '2024-01-01T00:00:00',
            id: 0,
            name: 'test tag',
            owner: 'test',
          },
        },
      ],
      updated_at: '2024-01-01T00:00:00',
      updated_by: 'test',
    };

    const downloadSpy = vi.fn();
    vi.spyOn(generic, 'downloadJSON').mockImplementation(downloadSpy);

    plan.exportPlan(mockPlan, mockUser, () => {}, [
      {
        anchor_id: null,
        anchored_to_start: true,
        arguments: {
          numOfTests: 1,
        },
        created_at: '2024-01-01T00:00:00',
        created_by: 'test',
        id: 0,
        last_modified_arguments_at: '2024-01-01T00:00:00',
        last_modified_at: '2024-01-01T00:00:00',
        metadata: {},
        name: 'Test Activity',
        plan_id: 1,
        source_scheduling_goal_id: null,
        start_offset: '0:00:00',
        start_time_ms: 0,
        tags: [
          {
            tag: {
              color: '#ff0000',
              created_at: '',
              id: 1,
              name: 'test tag',
              owner: 'test',
            },
          },
        ],
        type: 'TestActivity',
      },
    ]);

    expect(downloadSpy).toHaveBeenCalledOnce();
  });
});
