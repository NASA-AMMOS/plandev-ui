import { describe } from 'node:test';
import { expect, it } from 'vitest';
import { getPlanForTransfer } from './plan';

describe('Plan utility', () => {
  describe('getPlanForTransfer', () => {
    it('Should return a formatted plan object for downloading', () => {
      expect(
        getPlanForTransfer(
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
              tags: [],
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
            type: 'TestActivity',
          },
        ],
        end_time: '2025-01-01T00:00:00+00:00',
        id: 1,
        model_id: 1,
        name: 'Foo plan',
        sim_id: 3,
        start_time: '2024-01-01T00:00:00+00:00',
        tags: [
          {
            tag: {
              id: 0,
              name: 'test tag',
            },
          },
        ],
      });
    });
  });
});
