import { SafePipe } from './safe.pipe';

const mockDomSanitizer = {
  bypassSecurityTrustResourceUrl(url: string) {
    return `safe_${url}`;
  },
};

describe('SafePipe', () => {
  it('create an instance', () => {
    const pipe = new SafePipe(mockDomSanitizer as any);
    expect(pipe).toBeTruthy();
  });

  it('should return a safe URL', () => {
    const pipe = new SafePipe(mockDomSanitizer as any);
    const url = 'https://google.com';
    expect(pipe.transform(url)).toEqual(`safe_${url}`);
  });
});
