import { ChangeDetectorRef, Injectable } from '@angular/core';
import { Point, StringTMap } from '../../types';

/**
 * Shared data for sub-bands. Each band has an instance of this service.
 * Data is keyed by sub-band id.
 * Anything that needs to be shared between a band and it's sub-bands should go in here.
 */
@Injectable()
export class SubBandService {
  canvases: StringTMap<HTMLCanvasElement> = {};
  colorToPoint: StringTMap<StringTMap<Point>> = {};
  hiddenCanvases: StringTMap<HTMLCanvasElement> = {};

  constructor(private cdRef: ChangeDetectorRef) {}

  getCanvas(subTimelineId: string): HTMLCanvasElement {
    return this.canvases[subTimelineId];
  }

  getCanvases(subTimelineId: string): HTMLCanvasElement[] {
    const canvas = this.getCanvas(subTimelineId);
    const hiddenCanvas = this.getHiddenCanvas(subTimelineId);
    return [canvas, hiddenCanvas];
  }

  getColorToPoint(subTimelineId: string): StringTMap<Point> {
    return this.colorToPoint[subTimelineId];
  }

  getHiddenCanvas(subTimelineId: string): HTMLCanvasElement {
    return this.hiddenCanvases[subTimelineId];
  }

  /**
   * Sets the canvas elements (shown and hidden).
   * The hidden canvas is completely virtual and used for canvas picking.
   */
  setCanvases(
    subTimelineId: string,
    canvas: HTMLCanvasElement,
    height: number,
    width: number,
  ): void {
    this.canvases = {
      ...this.canvases,
      [subTimelineId]: canvas,
    };

    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.setAttribute('class', 'hidden');
    hiddenCanvas.setAttribute('height', `${height}`);
    hiddenCanvas.setAttribute('width', `${width}`);
    this.hiddenCanvases = {
      ...this.hiddenCanvases,
      [subTimelineId]: hiddenCanvas,
    };
  }

  updateCanvases(subTimelineId: string, height: number, width: number): void {
    const [canvas, hiddenCanvas] = this.getCanvases(subTimelineId);
    canvas.setAttribute('height', `${height}`);
    canvas.setAttribute('width', `${width}`);
    hiddenCanvas.setAttribute('height', `${height}`);
    hiddenCanvas.setAttribute('width', `${width}`);
    this.cdRef.markForCheck();
  }

  updateColorToPoint(subTimelineId: string, color: string, point: Point): void {
    if (!this.colorToPoint[subTimelineId]) {
      this.colorToPoint[subTimelineId] = {};
    }
    this.colorToPoint[subTimelineId][color] = point;
  }
}
