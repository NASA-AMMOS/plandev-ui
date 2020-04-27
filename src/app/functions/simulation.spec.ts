import { simulationResults } from '../mocks';
import { simulationResultsToBands } from './simulation';

describe('simulation', () => {
  describe('simulationResultsToBands', () => {
    it('should return a non empty list of bands', () => {
      const bands = simulationResultsToBands(simulationResults);
      expect(bands.length).toEqual(5);
    });

    it('if all the y values are the same, the bands should still be output correctly', () => {
      const bands = simulationResultsToBands([
        {
          name: 'a',
          start: '2020-001T00:00:00',
          values: [
            { x: 10000000, y: 1 },
            { x: 15000000, y: 1 },
            { x: 30000000, y: 1 },
            { x: 45000000, y: 1 },
            { x: 55000000, y: 1 },
          ],
        },
      ]);
      expect(bands.length).toEqual(1);
    });
  });
});
