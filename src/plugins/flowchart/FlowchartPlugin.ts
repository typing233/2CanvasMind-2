import { IPluginV2, PluginContext, ToolbarContribution, PluginManifest } from '../../core/plugin-system/types';
import { CanvasNode, CanvasEdge, Point, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE } from '../../core/data-model/types';
import { ICommand } from '../../core/commands/Command';
import { genId } from '../../utils/id';

type ShapeType = 'flowchart-rect' | 'flowchart-diamond' | 'flowchart-rounded';

export class FlowchartPlugin implements IPluginV2 {
  id = 'flowchart';
  name = 'Flowchart';
  version = '2.0.0';

  manifest: PluginManifest = {
    id: 'flowchart',
    name: 'Flowchart',
    version: '2.0.0',
    description: 'Create flowcharts with shapes and connections',
    author: 'CanvasMind',
    category: 'shape',
    isBuiltIn: true,
    activatable: true,
  };

  private ctx!: PluginContext;
  private currentShape: ShapeType = 'flowchart-rect';
  private isConnecting = false;
  private connectSourceId: string | null = null;

  register(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  activate(): void {}
  deactivate(): void {
    this.isConnecting = false;
    this.connectSourceId = null;
  }
  destroy(): void {}

  contributeToolbar(): ToolbarContribution[] {
    return [
      { id: 'fc-rect', label: 'Rectangle', group: 'flowchart', onClick: () => { this.currentShape = 'flowchart-rect'; this.isConnecting = false; } },
      { id: 'fc-diamond', label: 'Diamond', group: 'flowchart', onClick: () => { this.currentShape = 'flowchart-diamond'; this.isConnecting = false; } },
      { id: 'fc-rounded', label: 'Rounded', group: 'flowchart', onClick: () => { this.currentShape = 'flowchart-rounded'; this.isConnecting = false; } },
      { id: 'fc-connect', label: 'Connect', group: 'flowchart', onClick: () => { this.isConnecting = true; this.connectSourceId = null; } },
      { id: 'fc-delete', label: 'Delete', group: 'flowchart', onClick: () => this.deleteSelected() },
    ];
  }

  onCanvasDblClick(point: Point): void {
    if (this.isConnecting) return;
    this.addShape(point);
  }

  onCanvasMouseDown(point: Point): boolean {
    if (!this.isConnecting) return false;

    const nodes = Object.values(this.ctx.store.getDocument().nodes);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (!node.type.startsWith('flowchart')) continue;
      if (this.hitTest(node, point)) {
        if (!this.connectSourceId) {
          this.connectSourceId = node.id;
          this.ctx.store.setSelection([node.id]);
          this.ctx.requestRender();
        } else if (this.connectSourceId !== node.id) {
          this.createConnection(this.connectSourceId, node.id);
          this.connectSourceId = null;
        }
        return true;
      }
    }
    return false;
  }

  onKeyDown(e: KeyboardEvent): boolean {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.ctx.store.getSelectedNodeIds().size > 0) {
        this.deleteSelected();
        return true;
      }
    }
    if (e.key === 'Escape') {
      this.isConnecting = false;
      this.connectSourceId = null;
      return true;
    }
    return false;
  }

  renderNode(ctx: CanvasRenderingContext2D, node: CanvasNode, isSelected: boolean): void {
    if (!node.type.startsWith('flowchart')) return;
    const { position, size, style } = node;

    ctx.save();
    if (node.type === 'flowchart-diamond') {
      const cx = position.x + size.width / 2;
      const cy = position.y + size.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx, position.y);
      ctx.lineTo(position.x + size.width, cy);
      ctx.lineTo(cx, position.y + size.height);
      ctx.lineTo(position.x, cy);
      ctx.closePath();
    } else {
      const radius = node.type === 'flowchart-rounded' ? 16 : style.borderRadius;
      ctx.beginPath();
      ctx.roundRect(position.x, position.y, size.width, size.height, radius);
    }

    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
    ctx.lineWidth = isSelected ? 3 : style.strokeWidth;
    ctx.stroke();

    const text = (node.data.text as string) || '';
    if (text) {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontSize}px ${style.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, position.x + size.width / 2, position.y + size.height / 2, size.width - 16);
    }
    ctx.restore();
  }

  renderEdge(ctx: CanvasRenderingContext2D, edge: CanvasEdge, nodes: Record<string, CanvasNode>): void {
    if (edge.type !== 'flowchart') return;
    const source = nodes[edge.sourceId];
    const target = nodes[edge.targetId];
    if (!source || !target) return;

    const points = this.computeOrthogonalRoute(source, target);

    ctx.save();
    ctx.strokeStyle = edge.style.stroke;
    ctx.lineWidth = edge.style.strokeWidth;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    if (edge.style.arrowEnd && points.length >= 2) {
      const from = points[points.length - 2];
      const to = points[points.length - 1];
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.translate(to.x, to.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fillStyle = edge.style.stroke;
      ctx.fill();
    }
    ctx.restore();
  }

  private addShape(point: Point): void {
    const id = genId();
    const size = this.currentShape === 'flowchart-diamond'
      ? { width: 100, height: 80 }
      : { width: 120, height: 60 };

    const node: CanvasNode = {
      id,
      type: this.currentShape,
      position: { x: point.x - size.width / 2, y: point.y - size.height / 2 },
      size,
      data: { text: this.getDefaultText() },
      style: { ...DEFAULT_NODE_STYLE, fill: '#f0fdf4', borderRadius: this.currentShape === 'flowchart-rounded' ? 16 : 4 },
      locked: false,
    };

    const cmd: ICommand = {
      id: genId(),
      description: `Add flowchart ${this.currentShape}`,
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

  private createConnection(sourceId: string, targetId: string): void {
    const edgeId = genId();
    const source = this.ctx.store.getNode(sourceId)!;
    const target = this.ctx.store.getNode(targetId)!;
    const waypoints = this.computeOrthogonalRoute(source, target);

    const edge: CanvasEdge = {
      id: edgeId,
      type: 'flowchart',
      sourceId,
      targetId,
      waypoints,
      style: { ...DEFAULT_EDGE_STYLE },
    };

    const cmd: ICommand = {
      id: genId(),
      description: 'Connect flowchart nodes',
      execute: () => {
        this.ctx.store.addEdge(edge);
        this.ctx.store.setSelection([]);
        this.ctx.requestRender();
      },
      undo: () => {
        this.ctx.store.removeEdge(edgeId);
        this.ctx.requestRender();
      },
    };
    this.ctx.commandHistory.execute(cmd);
  }

  private deleteSelected(): void {
    const nodeIds = Array.from(this.ctx.store.getSelectedNodeIds());
    const doc = this.ctx.store.getDocument();
    if (nodeIds.length === 0) return;

    const removedNodes = nodeIds.map((id) => ({ ...doc.nodes[id] })).filter(Boolean);
    const relatedEdges = Object.values(doc.edges)
      .filter((e) => nodeIds.includes(e.sourceId) || nodeIds.includes(e.targetId));
    const removedEdges = [...relatedEdges];

    const cmd: ICommand = {
      id: genId(),
      description: 'Delete flowchart elements',
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

  private computeOrthogonalRoute(source: CanvasNode, target: CanvasNode): Point[] {
    const sx = source.position.x + source.size.width / 2;
    const sy = source.position.y + source.size.height;
    const tx = target.position.x + target.size.width / 2;
    const ty = target.position.y;

    if (Math.abs(sx - tx) < 5) {
      return [{ x: sx, y: sy }, { x: tx, y: ty }];
    }

    const midY = (sy + ty) / 2;
    return [
      { x: sx, y: sy },
      { x: sx, y: midY },
      { x: tx, y: midY },
      { x: tx, y: ty },
    ];
  }

  private hitTest(node: CanvasNode, point: Point): boolean {
    if (node.type === 'flowchart-diamond') {
      const cx = node.position.x + node.size.width / 2;
      const cy = node.position.y + node.size.height / 2;
      const dx = Math.abs(point.x - cx) / (node.size.width / 2);
      const dy = Math.abs(point.y - cy) / (node.size.height / 2);
      return dx + dy <= 1;
    }
    return (
      point.x >= node.position.x &&
      point.x <= node.position.x + node.size.width &&
      point.y >= node.position.y &&
      point.y <= node.position.y + node.size.height
    );
  }

  private getDefaultText(): string {
    switch (this.currentShape) {
      case 'flowchart-diamond': return 'Condition?';
      case 'flowchart-rounded': return 'Start/End';
      default: return 'Process';
    }
  }
}
