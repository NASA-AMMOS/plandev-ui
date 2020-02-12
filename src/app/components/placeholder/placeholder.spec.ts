import { ElementRef, Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ngOnChanges } from 'src/app/functions';
import { PlaceholderComponent } from './placeholder.component';

@Injectable()
export class MockElementRef {
  nativeElement: {
    style: {
      '--color': '#000000';
      '--height': '0px';
      setProperty: () => {};
    };
  };
}

describe('PlaceholderComponent', () => {
  let comp: PlaceholderComponent;
  let fixture: ComponentFixture<PlaceholderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlaceholderComponent],
      providers: [{ provide: ElementRef, useClass: MockElementRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(PlaceholderComponent);
    comp = fixture.componentInstance;
  });

  it('should properly update color', () => {
    expect(comp.color).toEqual('#000000');
    const newColor = '#ffffff';
    ngOnChanges(comp, 'color', newColor);
    expect(comp.color).toEqual(newColor);
  });

  it('should properly update height', () => {
    expect(comp.height).toEqual(0);
    const newHeight = 10;
    ngOnChanges(comp, 'height', newHeight);
    expect(comp.height).toEqual(newHeight);
  });
});
