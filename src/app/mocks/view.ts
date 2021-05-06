import { View } from '../types';

export const view: View = {
  id: 'view0',
  meta: {
    owner: 'system',
    timeCreated: 1615235211527,
    timeUpdated: 1615235211527,
  },
  name: 'Example 0',
  sections: [
    {
      id: 'section0',
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
        marginLeft: 30,
        marginRight: 30,
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
    },
    {
      id: 'section1',
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
        marginLeft: 30,
        marginRight: 30,
        rows: [
          {
            height: 100,
            horizontalGuides: [],
            id: 'row1',
            layers: [
              {
                chartType: 'line',
                filter: {
                  resource: {
                    name: 'peel',
                  },
                },
                id: 'layer1',
                type: 'resource',
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
                  resource: {
                    name: 'fruit',
                  },
                },
                id: 'layer2',
                type: 'resource',
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
    },
    {
      id: 'section2',
      size: 30,
      table: {
        columns: ['select', 'type', 'startTimestamp'],
        type: 'activity',
      },
      title: 'Table',
      type: 'table',
    },
  ],
};
