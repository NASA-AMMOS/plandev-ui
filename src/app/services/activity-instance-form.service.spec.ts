import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideMockStore } from '@ngrx/store/testing';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { ActivityInstanceFormService } from './activity-instance-form.service';

describe('activity-instance-form service', () => {
  let formService: ActivityInstanceFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApolloTestingModule],
      providers: [provideMockStore({ initialState: {} })],
    });
    formService = TestBed.inject(ActivityInstanceFormService);
  });

  it('getInvalidParameterValueError', () => {
    const invalid = 'Parameter is invalid';
    const group = new FormGroup({ value: new FormControl('Chris') });
    group.controls.value.setErrors({ invalid });
    const error = formService.getInvalidParameterValueError(group);
    expect(error).toEqual(invalid);
  });

  describe('reduceParameter', () => {
    it('double', () => {
      const parameter = { name: 'biteSize', type: 'double', value: '2.5' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe(2.5);
    });

    it('int', () => {
      const parameter = { name: 'biteSize', type: 'int', value: '2' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe(2);
    });

    it('bool - true', () => {
      const parameter = { name: 'canPeel', type: 'bool', value: 'true' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe(true);
    });

    it('bool - false', () => {
      const parameter = { name: 'canPeel', type: 'bool', value: 'false' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe(false);
    });

    it('bool - other', () => {
      const parameter = { name: 'canPeel', type: 'bool', value: 'abc' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe('abc');
    });

    it('any', () => {
      const parameter = { name: 'peelDirection', type: 'string', value: '🙈' };
      const { value } = formService.reduceParameter(parameter);
      expect(value).toBe('🙈');
    });
  });

  describe('reduceParameters', () => {
    it('remove empty string valued parameters', () => {
      const parameters = [{ name: 'biteSize', type: 'double', value: '' }];
      const res = formService.reduceParameters(parameters);
      expect(res).toEqual([]);
    });

    it('map reduce parameters', () => {
      const parameters = [
        { name: 'biteSize', type: 'double', value: '2.5' },
        { name: 'fruitSize', type: 'int', value: '2' },
        { name: 'canPeel', type: 'bool', value: 'false' },
        { name: 'bad', type: 'string', value: '' },
      ];
      const res = formService.reduceParameters(parameters);
      const expected = [
        { name: 'biteSize', value: 2.5 },
        { name: 'fruitSize', value: 2 },
        { name: 'canPeel', value: false },
      ];
      expect(res).toEqual(expected);
    });
  });
});
