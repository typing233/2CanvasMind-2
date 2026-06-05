import { ViewportManager } from '../core/viewport/ViewportManager';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { useCanvasStore } from '../core/data-model/store';
import { Renderer } from './Renderer';
import { HitTester } from './HitTester';
import { InputHandler } from './InputHandler';

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private hitTester: HitTester;
  private inputHandler: InputHandler;
  private viewport: ViewportManager;
  private plugins: PluginManager;
  private animFrameId: number | null = null;
  private dirty = true;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportManager,
    plugins: PluginManager,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.viewport = viewport;
    this.plugins = plugins;
    this.renderer = new Renderer(this.ctx);
    this.hitTester = new HitTester();

    const store = useCanvasStore.getState();
    this.inputHandler = new InputHandler(
      canvas, viewport, plugins, store, this.hitTester,
      () => this.requestRender(),
    );
  }

  start(): void {
    this.loop();
  }

  stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.inputHandler.destroy();
  }

  requestRender(): void {
    this.dirty = true;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
    this.requestRender();
  }

  private loop = (): void => {
    if (this.dirty) {
      this.render();
      this.dirty = false;
    }
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.ctx;
    const vp = this.viewport.getViewport();

    ctx.save();
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    this.renderer.clear(width, height);
    this.renderer.drawGrid(vp, width, height);

    ctx.translate(vp.x, vp.y);
    ctx.scale(vp.zoom, vp.zoom);

    const state = useCanvasStore.getState();
    const { nodes, edges } = state.document;
    const selectedNodeIds = state.selectedNodeIds;

    for (const edge of Object.values(edges)) {
      const plugin = this.plugins.get(edge.type.split('-')[0]);
      if (plugin?.renderEdge) {
        plugin.renderEdge(ctx, edge, nodes);
      } else {
        this.renderer.drawEdge(edge, nodes);
      }
    }

    for (const node of Object.values(nodes)) {
      const isSelected = selectedNodeIds.has(node.id);
      const plugin = this.plugins.get(node.type.split('-')[0]);
      if (plugin?.renderNode) {
        plugin.renderNode(ctx, node, isSelected);
      } else if (node.type === 'flowchart-diamond') {
        this.renderer.drawDiamond(node, isSelected);
      } else if (node.type === 'freehand-path') {
        this.renderer.drawFreehandPath(node, isSelected);
      } else {
        this.renderer.drawRect(node, isSelected);
      }
    }

    ctx.restore();
  }
}
