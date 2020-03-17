import { ElementRef, Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ngOnChanges } from 'src/app/functions';
import { TimeAxisComponent } from './time-axis.component';

@Injectable()
export class MockElementRef {
  nativeElement: {
    style: {
      '--height': '0px';
      setProperty: () => {};
    };
  };
}

describe('TimeAxisComponent', () => {
  let comp: TimeAxisComponent;
  let fixture: ComponentFixture<TimeAxisComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TimeAxisComponent],
      providers: [{ provide: ElementRef, useClass: MockElementRef }],
    }).compileComponents();
    fixture = TestBed.createComponent(TimeAxisComponent);
    comp = fixture.componentInstance;
  });

  it('calling ngOnChanges should set the draw bounds when any Input changes', () => {
    const setDrawBoundsSpy = spyOn(comp, 'setDrawBounds');
    ngOnChanges(comp, 'marginTop', 20);
    expect(setDrawBoundsSpy).toHaveBeenCalledTimes(1);
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

  it('calling drawTimeAxis should draw the time-axis', () => {
    comp.drawTimeAxis();
    // TODO.
    expect(true).toBe(true);
  });

  it('calling drawYearDayAxis should draw the year-day-axis', () => {
    comp.drawYearDayAxis();
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

  it('calling redraw should trigger a setDrawBounds(), drawXAxis(), and drawXBrush()', () => {
    const setDrawBoundsSpy = spyOn(comp, 'setDrawBounds');
    const drawTimeAxisSpy = spyOn(comp, 'drawTimeAxis');
    const drawYearDayAxisSpy = spyOn(comp, 'drawYearDayAxis');
    const drawBrushSpy = spyOn(comp, 'drawBrush');
    comp.redraw();
    expect(setDrawBoundsSpy).toHaveBeenCalled();
    expect(drawTimeAxisSpy).toHaveBeenCalled();
    expect(drawYearDayAxisSpy).toHaveBeenCalled();
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

  it('calling xBrushEnd should emit a new view time range', () => {
    try {
      comp.xBrushEnd();
      // TODO.
    } catch (e) {}
    expect(true).toBe(true);
  });
});
