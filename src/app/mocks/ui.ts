import { UiState } from '../types';

export const uiStates: UiState[] = [
  {
    id: 'uiState0',
    name: 'Example 0',
    panels: [
      {
        bands: [
          {
            height: 200,
            id: 'band0',
            subBands: [
              {
                chartType: 'activity',
                filter: {
                  activity: {
                    type: '.*',
                  },
                },
                id: 'subBand0',
                type: 'activity',
              },
            ],
          },
        ],
        constraintViolations: [],
        id: 'panel0',
        menu: [
          {
            action: 'restore',
            icon: 'restore',
            title: 'Restore Time',
          },
        ],
        size: 35,
        title: 'Schedule',
        type: 'timeline',
        verticalGuides: [
          {
            id: 'verticalGuide0',
            label: { text: 'Guide 0000000000000000000000' },
            timestamp: '2020-001T00:00:11',
            type: 'vertical',
          },
          {
            id: 'verticalGuide1',
            label: { text: 'Guide 1' },
            timestamp: '2020-001T00:00:23',
            type: 'vertical',
          },
        ],
      },
      {
        bands: [
          {
            height: 100,
            horizontalGuides: [],
            id: 'band1',
            subBands: [
              {
                chartType: 'line',
                filter: {
                  state: {
                    name: 'peel',
                  },
                },
                id: 'subBand1',
                type: 'state',
              },
            ],
            yAxes: [
              {
                id: 'axis-subBand1',
                label: {
                  text: 'peel',
                },
              },
            ],
          },
          {
            height: 100,
            id: 'band2',
            subBands: [
              {
                chartType: 'line',
                filter: {
                  state: {
                    name: 'fruit',
                  },
                },
                id: 'subBand2',
                type: 'state',
              },
            ],
            yAxes: [
              {
                id: 'axis-subBand2',
                label: {
                  text: 'fruit',
                },
              },
            ],
          },
        ],
        constraintViolations: [],
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
        title: 'Simulation',
        type: 'timeline',
        verticalGuides: [
          {
            id: 'verticalGuide2',
            label: { text: 'Guide 2' },
            timestamp: '2020-001T00:00:42',
            type: 'vertical',
          },
          {
            id: 'verticalGuide3',
            label: { text: 'Guide 3' },
            timestamp: '2020-001T00:00:52',
            type: 'vertical',
          },
        ],
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
