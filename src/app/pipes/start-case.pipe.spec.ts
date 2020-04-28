import { StartCasePipe } from './start-case.pipe';

describe('StartCasePipe', () => {
  it('create an instance', () => {
    const pipe = new StartCasePipe();
    expect(pipe).toBeTruthy();
  });

  it('should transform a camel-case string to start case', () => {
    const pipe = new StartCasePipe();
    expect(pipe.transform('helloWorld')).toEqual('Hello World');
  });
});
