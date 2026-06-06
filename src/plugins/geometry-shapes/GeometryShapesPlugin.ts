import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, Point, DEFAULT_NODE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';
import { shapePathGenerators } from './shape-paths';

type GeoType = 'geo-circle' | 'geo-triangle' | 'geo-hexagon' | 'geo-star' | 'geo-arrow';

export class GeometryShapesPlugin implements IPluginV2 {
  id = 'geo';
  name = 'Geometry Shapes';
  version = '1.0.0';

  manifest: PluginManifest = {
    id: 'geo',
    name: 'Geometry Shapes',
    version: '1.0.0',
    description: 'Circle, triangle, hexagon, star, and more',
    author: 'CanvasMind',
    category: 'shape',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private currentShape: GeoType = 'geo-circle';

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {}
  destroy(): void {}

  ownsNodeType(type: string): boolean {
    return type.startsWith('geo-');
  }

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'geo-circle', label: 'Circle', group: 'geo', onClick: () => { this.currentShape = 'geo-circle'; } },
      { id: 'geo-triangle', label: 'Triangle', group: 'geo', onClick: () => { this.currentShape = 'geo-triangle'; } },
      { id: 'geo-hexagon', label: 'Hexagon', group: 'geo', onClick: () => { this.currentShape = 'geo-hexagon'; } },
      { id: 'geo-star', label: 'Star', group: 'geo', onClick: () => { this.currentShape = 'geo-star'; } },
      { id: 'geo-arrow', label: 'Arrow', group: 'geo', onClick: () => { this.currentShape = 'geo-arrow'; } },
    ];
  }

  onCanvasDblClick(point: Point): void {
    this.addShape(point);
  }

  onKeyDown(e: KeyboardEvent): boolean {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = Array.from(this.ctx.store.getSelectedNodeIds());
      if (ids.length > 0) {
        this.deleteSelected(ids);
        return true;
      }
    }
    return false;
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (!node.type.startsWith('geo-')) return;
    const { position, size, style } = node;
    const gen = shapePathGenerators[node.type];
    if (!gen) return;

    const path = gen(position, size);

    ctx.save();
    ctx.fillStyle = style.fill;
    if (style.opacity !== undefined) ctx.globalAlpha = style.opacity;
    ctx.fill(path);
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? 3 : style.strokeWidth;
    ctx.stroke(path);

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontSize}px ${style.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, position.x + size.width / 2, position.y + size.height / 2, size.width - 16);
    }
    ctx.restore();
  }

  hitTestNode(node: CanvasNode, point: Point): boolean {
    if (!node.type.startsWith('geo-')) return false;
    const gen = shapePathGenerators[node.type];
    if (!gen) return false;
    const path = gen(node.position, node.size);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    return ctx.isPointInPath(path, point.x, point.y);
  }

  private addShape(point: Point): void {
    const id = genId();
    const size = { width: 80, height: 80 };
    const node: CanvasNode = {
      id,
      type: this.currentShape,
      position: { x: point.x - size.width / 2, y: point.y - size.height / 2 },
      size,
      data: { text: '' },
      style: { ...DEFAULT_NODE_STYLE, fill: '#e0e7ff', stroke: '#6366f1', fontFamily: 'sans-serif' },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: `Add ${this.currentShape}`,
      execute: () => {
        this.ctx.store.addNode(node);
        this.ctx.store.setSelection([id]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeNode(id);
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  private deleteSelected(ids: string[]): void {
    const doc = this.ctx.store.getDocument();
    const removedNodes = ids.map(id => doc.nodes[id]).filter(Boolean);
    const removedEdges = Object.values(doc.edges).filter(e =>
      ids.includes(e.sourceId) || ids.includes(e.targetId)
    );

    const cmd: ICommand = {
      id: genId(),
      description: 'Delete shapes',
      execute: () => {
        for (const e of removedEdges) this.ctx.store.removeEdge(e.id);
        for (const n of removedNodes) this.ctx.store.removeNode(n.id);
        this.ctx.store.setSelection([]);
        this.ctx.requestRender();
      },
      undo: () => {
        for (const n of removedNodes) this.ctx.store.addNode(n);
        for (const e of removedEdges) this.ctx.store.addEdge(e);
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }
}
