import { ElementRef, Injectable, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ngOnChanges } from 'src/app/functions';
import { TimeAxisGlobalComponent } from './time-axis-global.component';

@Injectable()
export class MockElementRef {
  nativeElement: {
    style: {
      '--height': '0px';
      setProperty: () => {};
    };
  };
}

describe('TimeAxisGlobalComponent', () => {
  let comp: TimeAxisGlobalComponent;
  let fixture: ComponentFixture<TimeAxisGlobalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TimeAxisGlobalComponent],
      providers: [{ provide: ElementRef, useClass: MockElementRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(TimeAxisGlobalComponent);
    comp = fixture.componentInstance;
  });

  it('calling ngOnChanges should set the draw bounds when any Input changes', () => {
    const setDrawBoundsSpy = spyOn(comp, 'setDrawBounds');
    ngOnChanges(comp, 'marginTop', 20);
    expect(setDrawBoundsSpy).toHaveBeenCalledTimes(1);
  });

  it('calling ngOnChanges with a maxTimeRange and a viewTimeRange should trigger a redraw', () => {
    comp.maxTimeRange = { start: 0, end: 1000 };
    comp.viewTimeRange = { start: 20, end: 30 };
    const change = {
      maxTimeRange: new SimpleChange(null, comp.maxTimeRange, false),
      viewTimeRange: new SimpleChange(null, comp.viewTimeRange, false),
    };
    const redrawSpy = spyOn(comp, 'redraw');
    comp.ngOnChanges(change);
    expect(redrawSpy).toHaveBeenCalledTimes(1);
  });

  it('calling ngAfterViewInit should set the appropriate component events', () => {
    comp.ngAfterViewInit();
    // TODO.
    expect(true).toBe(true);
  });

  it('calling drawBrush should draw the brush', () => {
    comp.drawBrush();
    // TODO.
    expect(true).toBe(true);
  });

  it('calling onWindowResize should trigger a resize()', () => {
    const resizeSpy = spyOn(comp, 'resize');
    comp.onWindowResize();
    expect(resizeSpy).toHaveBeenCalled();
  });

  it('calling resize should trigger a redraw()', () => {
    const redrawSpy = spyOn(comp, 'redraw');
    comp.resize();
    expect(redrawSpy).toHaveBeenCalled();
  });

  it('calling redraw should trigger a setDrawBounds() and drawBrush()', () => {
    const setDrawBoundsSpy = spyOn(comp, 'setDrawBounds');
    const drawBrushSpy = spyOn(comp, 'drawBrush');
    comp.redraw();
    expect(setDrawBoundsSpy).toHaveBeenCalled();
    expect(drawBrushSpy).toHaveBeenCalled();
  });

  it('draw height should be calculated correctly according to margins', () => {
    comp.height = 200;
    comp.marginTop = 10;
    comp.marginBottom = 10;
    comp.setDrawBounds();
    expect(comp.drawHeight).toEqual(180);
  });

  it('showTooltip should show the time tooltip', () => {
    try {
      comp.showTooltip(new MouseEvent('click'));
      // TODO.
    } catch (e) {}
    expect(true).toBe(true);
  });

  it('calling brushEnd should emit a new view time range', () => {
    try {
      comp.brushEnd();
      // TODO.
    } catch (e) {}
    expect(true).toBe(true);
  });
});
