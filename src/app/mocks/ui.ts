import { UiState } from '../types';

export const uiStates: UiState[] = [
  {
    id: 'uiState0',
    name: 'Example 0',
    panels: [
      {
        id: 'panel0',
        menu: [
          {
            action: 'restore',
            icon: 'restore',
            title: 'Restore Time',
          },
        ],
        size: 35,
        timeline: {
          id: 'timeline0',
          rows: [
            {
              height: 200,
              id: 'row0',
              layers: [
                {
                  chartType: 'activity',
                  filter: {
                    activity: {
                      type: '.*',
                    },
                  },
                  id: 'layer0',
                  type: 'activity',
                },
              ],
            },
          ],
          verticalGuides: [
            {
              id: 'verticalGuide0',
              label: { text: 'Guide 0000000000000000000000' },
              timestamp: '2020-001T00:00:11',
            },
            {
              id: 'verticalGuide1',
              label: { text: 'Guide 1' },
              timestamp: '2020-001T00:00:23',
            },
          ],
        },
        title: 'Schedule',
        type: 'timeline',
        violations: [],
      },
      {
        id: 'panel1',
        menu: [
          {
            action: 'restore',
            icon: 'restore',
            title: 'Restore Time',
          },
          {
            action: 'simulate',
            icon: 'timeline',
            title: 'Run Simulation',
          },
        ],
        size: 35,
        timeline: {
          id: 'timeline1',
          rows: [
            {
              height: 100,
              horizontalGuides: [],
              id: 'row1',
              layers: [
                {
                  chartType: 'line',
                  filter: {
                    state: {
                      name: 'peel',
                    },
                  },
                  id: 'layer1',
                  type: 'state',
                },
              ],
              yAxes: [
                {
                  id: 'axis-layer1',
                  label: {
                    text: 'peel',
                  },
                },
              ],
            },
            {
              height: 100,
              id: 'row2',
              layers: [
                {
                  chartType: 'line',
                  filter: {
                    state: {
                      name: 'fruit',
                    },
                  },
                  id: 'layer2',
                  type: 'state',
                },
              ],
              yAxes: [
                {
                  id: 'axis-layer2',
                  label: {
                    text: 'fruit',
                  },
                },
              ],
            },
          ],
          verticalGuides: [
            {
              id: 'verticalGuide2',
              label: { text: 'Guide 2' },
              timestamp: '2020-001T00:00:42',
            },
            {
              id: 'verticalGuide3',
              label: { text: 'Guide 3' },
              timestamp: '2020-001T00:00:52',
            },
          ],
        },
        title: 'Simulation',
        type: 'timeline',
        violations: [],
      },
      {
        id: 'panel2',
        size: 30,
        table: {
          columns: ['select', 'type', 'startTimestamp'],
          type: 'activity',
        },
        title: 'Table',
        type: 'table',
      },
    ],
  },
];
