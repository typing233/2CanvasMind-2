import { ViewportManager } from '../core/viewport/ViewportManager';
import { PluginManager } from '../core/plugin-system/PluginManager';
import { CommandHistory } from '../core/commands/CommandHistory';
import { useCanvasStore } from '../core/data-model/store';
import { SpatialIndex, AABB } from '../core/spatial/SpatialIndex';
import { CanvasNode } from '../core/data-model/types';
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
  private spatialIndex: SpatialIndex;
  private animFrameId: number | null = null;
  private dirty = true;

  constructor(
    canvas: HTMLCanvasElement,
    viewport: ViewportManager,
    plugins: PluginManager,
    commandHistory: CommandHistory,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.viewport = viewport;
    this.plugins = plugins;
    this.spatialIndex = new SpatialIndex(200);
    this.renderer = new Renderer(this.ctx);
    this.hitTester = new HitTester();

    const store = useCanvasStore.getState();
    this.inputHandler = new InputHandler(
      canvas, viewport, plugins, store, commandHistory, this.hitTester,
      () => this.requestRender(),
    );
  }

  start(): void {
    this.rebuildSpatialIndex();
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

  getSpatialIndex(): SpatialIndex {
    return this.spatialIndex;
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

    this.updateSpatialIndex(nodes);

    const visibleBounds = this.getVisibleBounds(vp, width, height);
    const visibleNodeIds = this.spatialIndex.query(visibleBounds);

    const visibleEdgeSet = new Set<string>();
    for (const edge of Object.values(edges)) {
      if (visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId)) {
        visibleEdgeSet.add(edge.id);
      }
    }

    for (const edge of Object.values(edges)) {
      if (!visibleEdgeSet.has(edge.id)) continue;
      const plugin = this.plugins.getPluginForEdgeType(edge.type);
      if (plugin?.renderEdge) {
        plugin.renderEdge(ctx, edge, nodes);
      } else {
        this.renderer.drawEdge(edge, nodes);
      }
    }

    for (const nodeId of visibleNodeIds) {
      const node = nodes[nodeId];
      if (!node) continue;
      const isSelected = selectedNodeIds.has(node.id);
      const plugin = this.plugins.getPluginForNodeType(node.type);
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

  private getVisibleBounds(vp: { x: number; y: number; zoom: number }, width: number, height: number): AABB {
    return {
      minX: -vp.x / vp.zoom,
      minY: -vp.y / vp.zoom,
      maxX: (-vp.x + width) / vp.zoom,
      maxY: (-vp.y + height) / vp.zoom,
    };
  }

  private updateSpatialIndex(nodes: Record<string, CanvasNode>): void {
    for (const node of Object.values(nodes)) {
      const bounds: AABB = {
        minX: node.position.x,
        minY: node.position.y,
        maxX: node.position.x + node.size.width,
        maxY: node.position.y + node.size.height,
      };
      const existing = this.spatialIndex.getBounds(node.id);
      if (!existing || existing.minX !== bounds.minX || existing.minY !== bounds.minY
        || existing.maxX !== bounds.maxX || existing.maxY !== bounds.maxY) {
        this.spatialIndex.update(node.id, bounds);
      }
    }
  }

  private rebuildSpatialIndex(): void {
    this.spatialIndex.clear();
    const nodes = useCanvasStore.getState().document.nodes;
    for (const node of Object.values(nodes)) {
      this.spatialIndex.insert(node.id, {
        minX: node.position.x,
        minY: node.position.y,
        maxX: node.position.x + node.size.width,
        maxY: node.position.y + node.size.height,
      });
    }
  }
}
