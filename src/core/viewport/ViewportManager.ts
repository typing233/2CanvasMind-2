import { Point, Viewport } from '../data-model/types';

export class ViewportManager {
  private viewport: Viewport = { x: 0, y: 0, zoom: 1 };
  private minZoom = 0.1;
  private maxZoom = 5.0;
  private zoomFactor = 1.08;

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  setViewport(vp: Viewport): void {
    this.viewport = { ...vp };
  }

  screenToCanvas(screen: Point): Point {
    return {
      x: (screen.x - this.viewport.x) / this.viewport.zoom,
      y: (screen.y - this.viewport.y) / this.viewport.zoom,
    };
  }

  canvasToScreen(canvas: Point): Point {
    return {
      x: canvas.x * this.viewport.zoom + this.viewport.x,
      y: canvas.y * this.viewport.zoom + this.viewport.y,
    };
  }

  pan(dx: number, dy: number): void {
    this.viewport.x += dx;
    this.viewport.y += dy;
  }

  zoomAtPoint(delta: number, screenPoint: Point): void {
    const direction = delta > 0 ? -1 : 1;
    const factor = direction > 0 ? this.zoomFactor : 1 / this.zoomFactor;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.viewport.zoom * factor));

    const canvasPoint = this.screenToCanvas(screenPoint);
    this.viewport.zoom = newZoom;
    this.viewport.x = screenPoint.x - canvasPoint.x * newZoom;
    this.viewport.y = screenPoint.y - canvasPoint.y * newZoom;
  }

  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);
  }
}
