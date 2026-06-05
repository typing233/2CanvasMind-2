import { Point } from '../core/data-model/types';
import { ViewportManager } from '../core/viewport/ViewportManager';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { useCanvasStore, CanvasStore } from '../core/data-model/store';
import { HitTester } from './HitTester';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private viewport: ViewportManager;
  private plugins: PluginManager;
  private store: CanvasStore;
  private hitTester: HitTester;
  private requestRender: () => void;

  private isPanning = false;
  private isDragging = false;
  private lastMouse: Point = { x: 0, y: 0 };
  private dragStartCanvas: Point = { x: 0, y: 0 };
  private spaceHeld = false;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportManager,
    plugins: PluginManager,
    store: CanvasStore,
    hitTester: HitTester,
    requestRender: () => void,
  ) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.plugins = plugins;
    this.store = store;
    this.hitTester = hitTester;
    this.requestRender = requestRender;
    this.bind();
  }

  private bind(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onMouseDown = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);
    this.lastMouse = screenPt;

    if (this.spaceHeld || e.button === 1) {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    const plugin = this.plugins.getActive();
    if (plugin?.onCanvasMouseDown?.(canvasPt, e)) return;

    const state = useCanvasStore.getState();
    const nodes = Object.values(state.document.nodes);
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (this.hitTester.hitTestNode(nodes[i], canvasPt)) {
        state.setSelection([nodes[i].id]);
        this.isDragging = true;
        this.dragStartCanvas = canvasPt;
        this.requestRender();
        return;
      }
    }

    this.store.setSelection([]);
    this.requestRender();
  };

  private onMouseMove = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);

    if (this.isPanning) {
      const dx = screenPt.x - this.lastMouse.x;
      const dy = screenPt.y - this.lastMouse.y;
      this.viewport.pan(dx, dy);
      this.lastMouse = screenPt;
      this.requestRender();
      return;
    }

    if (this.isDragging) {
      const dx = canvasPt.x - this.dragStartCanvas.x;
      const dy = canvasPt.y - this.dragStartCanvas.y;
      this.dragStartCanvas = canvasPt;
      const state = useCanvasStore.getState();
      for (const nodeId of state.selectedNodeIds) {
        const node = state.getNode(nodeId);
        if (node && !node.locked) {
          state.updateNode(nodeId, {
            position: { x: node.position.x + dx, y: node.position.y + dy },
          });
        }
      }
      this.requestRender();
      return;
    }

    const plugin = this.plugins.getActive();
    plugin?.onCanvasMouseMove?.(canvasPt, e);
  };

  private onMouseUp = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spaceHeld ? 'grab' : 'default';
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    const plugin = this.plugins.getActive();
    plugin?.onCanvasMouseUp?.(canvasPt, e);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const screenPt = this.getMousePos(e);
    this.viewport.zoomAtPoint(e.deltaY, screenPt);
    this.requestRender();
  };

  private onDblClick = (e: MouseEvent): void => {
    const screenPt = this.getMousePos(e);
    const canvasPt = this.viewport.screenToCanvas(screenPt);
    const plugin = this.plugins.getActive();
    plugin?.onCanvasDblClick?.(canvasPt, e);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !this.spaceHeld) {
      this.spaceHeld = true;
      this.canvas.style.cursor = 'grab';
      e.preventDefault();
      return;
    }

    const plugin = this.plugins.getActive();
    if (plugin?.onKeyDown?.(e)) return;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.spaceHeld = false;
      this.canvas.style.cursor = 'default';
    }
  };

  private getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
}
