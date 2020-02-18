import { ElementRef, Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ngOnChanges } from 'src/app/functions';
import { MaterialModule } from 'src/app/material';
import { ToolbarComponent } from './toolbar.component';

@Injectable()
export class MockElementRef {
  nativeElement: {
    style: {
      '--height': '0px';
      setProperty: () => {};
    };
  };
}

describe('ToolbarComponent', () => {
  let comp: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ToolbarComponent],
      imports: [MaterialModule],
      providers: [{ provide: ElementRef, useClass: MockElementRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(ToolbarComponent);
    comp = fixture.componentInstance;
  });

  it('setting the height should work properly', () => {
    expect(comp.height).toEqual(0);
    const newHeight = 10;
    ngOnChanges(comp, 'height', newHeight);
    expect(comp.height).toEqual(newHeight);
  });
});
